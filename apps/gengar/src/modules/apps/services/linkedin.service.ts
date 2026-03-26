import { Injectable, Logger, Inject } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { ApifyLinkedInService } from "../../linkedin/apify-linkedin.service";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { BaseSnsService } from "./base-sns.service";

// Define content interface that matches what apps service expects
interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "post" | "comment" | "profile";
  externalId: string;
  content: string; // This is the text content
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class LinkedInService extends BaseSnsService {
  private readonly logger = new Logger(LinkedInService.name);

  // Cache to store validation results and avoid duplicate Apify calls
  private validationCache = new Map<string, { posts: any[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
    private readonly apifyLinkedInService: ApifyLinkedInService,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async fetchUserContent(userId: number, username: string, appId: number) {
    try {
      this.logger.log(`Fetching complete LinkedIn profile data for username: ${username}`);

      let posts: any[];

      // Check if we have cached data from recent validation
      const cachedData = this.validationCache.get(username);
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
        this.logger.log(`Using cached LinkedIn data for ${username} (avoiding duplicate Apify call)`);
        posts = cachedData.posts;
      } else {
        // Fetch all posts directly from Apify
        this.logger.log(`Fetching fresh LinkedIn data for ${username} from Apify`);
        const result = await this.apifyLinkedInService.scrapeLinkedInPosts(username);
        posts = result.posts;

        // Cache the result for future use
        this.validationCache.set(username, { posts, timestamp: Date.now() });
      }

      if (!posts || posts.length === 0) {
        throw new Error(`No LinkedIn posts found for username: ${username}`);
      }

      this.logger.log(`Fetched ${posts.length} LinkedIn posts for ${username}`);

      const contentEntities: SocialContentData[] = [];
      const profileLink = `https://linkedin.com/in/${username}`;

      this.logger.log(`Starting to process LinkedIn data for ${username}`);

      // 1. Store profile data (extracted from first post's author)
      const postWithAuthor = posts.find((p) => p.author?.first_name);
      if (postWithAuthor) {
        this.logger.log(`Processing profile data for ${username}`);
        const profileData = {
          full_name: `${postWithAuthor.author.first_name} ${postWithAuthor.author.last_name}`,
          headline: postWithAuthor.author.headline,
          username: postWithAuthor.author.username || username,
          profile_url: postWithAuthor.author.profile_url || `https://www.linkedin.com/in/${username}/`,
          profile_picture: postWithAuthor.author.profile_picture || "",
        };

        const profileContent: SocialContentData = {
          userId,
          appId,
          source: SocialNetworkType.LINKEDIN,
          type: "profile",
          externalId: `linkedin_profile_${username}`,
          content: `# ${profileData.full_name}\n**Headline:** ${profileData.headline}\n**LinkedIn Username:** ${profileData.username}\n**Profile URL:** ${profileData.profile_url}`,
          media: [],
          parentId: null,
          postedAt: new Date(),
          username: username,
          metadata: {
            type: "profile",
            fullName: profileData.full_name,
            headline: profileData.headline,
            username: profileData.username,
            profileUrl: profileData.profile_url,
            profilePicture: profileData.profile_picture,
            fetchedAt: new Date().toISOString(),
            isProfileData: true,
          },
        };

        // Memory ingestion will be handled after DB storage in apps service

        contentEntities.push(profileContent);
        this.logger.log(`Profile data processed and added to contentEntities`);
      }

      // 2. Store all posts (including articles) that have text content
      this.logger.log(`Starting to process ${posts.length} posts for ${username}`);
      let processedPosts = 0;

      for (const post of posts) {
        // Skip posts without text content
        if (!post.text || post.text.trim() === "") {
          continue;
        }

        processedPosts++;

        // Remove query parameters from the URL
        const cleanUrl = post.url.split("?")[0];

        const postContent: SocialContentData = {
          userId,
          appId,
          source: SocialNetworkType.LINKEDIN,
          type: "post",
          externalId: cleanUrl,
          content: post.text,
          media: [],
          parentId: null,
          postedAt: new Date(post.posted_at.timestamp),
          username: username,
          metadata: {
            post_type: post.post_type,
            stats: {
              likes: post.stats.like || 0,
              comments: post.stats.comments || 0,
              reposts: post.stats.reposts || 0,
              total_reactions: post.stats.total_reactions || 0,
            },
          },
        };

        // Memory ingestion will be handled after DB storage in apps service

        contentEntities.push(postContent);
      }

      this.logger.log(
        `Finished processing posts. Processed: ${processedPosts}, Total content entities: ${contentEntities.length}`,
      );

      this.logger.log(
        `Successfully fetched and saved ${contentEntities.length} LinkedIn items (1 profile + ${posts.length} posts) for user ${userId}`,
      );

      // Clear cache after successful processing to free memory
      this.validationCache.delete(username);
      this.logger.log(`Cleared cache for ${username} after successful processing`);

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching LinkedIn content: ${error.message}`, error.stack);
      this.logger.error(`Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`);
      this.rollbar.error("Error fetching LinkedIn content", {
        userId,
        username,
        appId,
        error: error.message || String(error),
        stack: error.stack,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      throw error;
    }
  }

  // Simple username validation by attempting to fetch posts
  async validateUsername(username: string): Promise<{
    valid: boolean;
    profileSummary?: {
      name: string;
      headline: string;
      avatar?: string;
      postsCount: number;
    };
    error?: string;
  }> {
    try {
      let posts: any[];

      // Check cache first
      const cachedData = this.validationCache.get(username);
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_TTL) {
        this.logger.log(`Using cached validation data for ${username}`);
        posts = cachedData.posts;
      } else {
        this.logger.log(`Fetching fresh validation data for ${username} from Apify`);
        const result = await this.apifyLinkedInService.scrapeLinkedInPosts(username);
        posts = result.posts;

        // Cache the result - this will be reused by fetchUserContent
        this.validationCache.set(username, { posts, timestamp: Date.now() });
        this.logger.log(`Cached LinkedIn data for ${username} to avoid duplicate Apify calls`);
      }

      if (!posts || posts.length === 0) {
        throw new Error(`No posts found for LinkedIn profile: ${username}`);
      }

      // Find first post with valid author data
      const postWithAuthor = posts.find((p) => p.author?.first_name);
      if (!postWithAuthor) {
        throw new Error(`No author data found in LinkedIn posts for: ${username}`);
      }

      const profileData = {
        full_name: `${postWithAuthor.author.first_name} ${postWithAuthor.author.last_name}`,
        headline: postWithAuthor.author.headline,
        profile_picture: postWithAuthor.author.profile_picture,
      };

      return {
        valid: true,
        profileSummary: {
          name: profileData.full_name,
          headline: profileData.headline,
          avatar: profileData.profile_picture || undefined,
          postsCount: posts.length,
        },
      };
    } catch (error) {
      this.logger.warn(`LinkedIn username validation failed for ${username}: ${error.message}`);
      this.rollbar.error("LinkedIn username validation failed", {
        username,
        error: error.message || String(error),
        stack: error.stack,
      });
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing LinkedIn content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(credential.userId, credential.username, appId);

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for LinkedIn app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.LINKEDIN,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new LinkedIn content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.LINKEDIN;
        socialContent.content = content.content;
        socialContent.type =
          content.type === "post"
            ? SocialContentType.POST
            : content.type === "comment"
            ? SocialContentType.COMMENT
            : SocialContentType.PROFILE;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new LinkedIn items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing LinkedIn content for app ${appId}:`, error);
      throw error;
    }
  }
}
