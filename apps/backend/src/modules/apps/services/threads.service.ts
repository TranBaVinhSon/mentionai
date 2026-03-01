import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import axios from "axios";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for Threads API responses
interface ThreadsPost {
  id: string;
  text: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
  media?: ThreadsMedia[];
}

interface ThreadsMedia {
  type: string;
  url: string;
}

interface ThreadsComment {
  id: string;
  text: string;
  created_at: string;
  like_count: number;
  reply_count: number;
  repost_count: number;
  parent_id: string;
  media?: ThreadsMedia[];
}

interface ThreadsUserProfile {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  media_count?: number;
}

// Define simplified content interface for memory storage
interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "post" | "comment";
  externalId: string;
  content: string;
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class ThreadsService extends BaseSnsService {
  private readonly logger = new Logger(ThreadsService.name);
  private readonly API_BASE_URL = "https://www.threads.net/api/v1";

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  // Generate OAuth authorization URL (Threads uses Facebook OAuth)
  generateOAuthUrl(redirectUri?: string): string {
    const finalRedirectUri =
      redirectUri ||
      process.env.THREADS_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

    const scope = "threads_basic,threads_content_publish"; // Threads-specific scopes
    const state = `threads_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the redirect URI being used
    this.logger.log(`Generating Threads OAuth URL with redirect URI: ${finalRedirectUri}`);

    const params = new URLSearchParams({
      client_id: process.env.THREADS_APP_ID || "", // Threads uses Facebook App ID
      redirect_uri: finalRedirectUri,
      scope: scope,
      response_type: "code",
      state: state,
    });

    return `https://www.threads.net/oauth/authorize?${params.toString()}`;
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      // First, get the user's profile to get the ID
      const userProfile = await this.getCurrentUserProfile(accessToken);
      const profileId = userProfile.id;

      // Use Promise.all to fetch posts and comments in parallel
      const [posts, comments] = await Promise.all([
        this.fetchUserPosts(profileId, accessToken),
        this.fetchUserComments(profileId, accessToken),
      ]);

      this.logger.log("Threads posts:", JSON.stringify(posts, null, 2));
      this.logger.log("Threads comments:", JSON.stringify(comments, null, 2));

      // Create post entities and save to memory
      const postsEntities = await Promise.all(
        posts.map(async (post) => {
          const entity = this.createSocialContentFromPost(post, userId, appId, username || "Unknown");

          // Memory ingestion will be handled after DB storage in apps service
          return entity;
        }),
      );

      // Create comment entities and save to memory
      const commentsEntities = await Promise.all(
        comments.map(async (comment) => {
          const entity = this.createSocialContentFromComment(comment, userId, appId, username || "Unknown");

          // Memory ingestion will be handled after DB storage in apps service
          return entity;
        }),
      );

      // Combine all entities
      const contentEntities = [...postsEntities, ...commentsEntities];

      this.logger.log(
        `Successfully fetched and saved ${contentEntities.length} Threads items to memory for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Threads content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserProfile(username: string, accessToken: string) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/users/username/${username}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Threads profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getCurrentUserProfile(accessToken: string): Promise<ThreadsUserProfile> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: "id,username,name,profile_picture_url,followers_count,media_count",
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching current Threads user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserPosts(profileId: string, accessToken: string, limit = 50) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/users/${profileId}/threads`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
        },
      });
      return response.data.threads || [];
    } catch (error) {
      this.logger.error(`Error fetching Threads posts: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserComments(profileId: string, accessToken: string, limit = 50) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/users/${profileId}/replies`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
        },
      });
      return response.data.replies || [];
    } catch (error) {
      this.logger.error(`Error fetching Threads comments: ${error.message}`, error.stack);
      throw error;
    }
  }

  private createSocialContentFromPost(
    post: ThreadsPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.THREADS,
      type: "post",
      externalId: post.id,
      content: post.text,
      media: post.media || [],
      parentId: null,
      postedAt: new Date(post.created_at),
      username,
      metadata: {
        postId: post.id,
        likeCount: post.like_count,
        replyCount: post.reply_count,
        repostCount: post.repost_count,
      },
    };
  }

  private createSocialContentFromComment(
    comment: ThreadsComment,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.THREADS,
      type: "comment",
      externalId: comment.id,
      content: comment.text,
      media: comment.media || [],
      parentId: comment.parent_id,
      postedAt: new Date(comment.created_at),
      username,
      metadata: {
        commentId: comment.id,
        likeCount: comment.like_count,
        replyCount: comment.reply_count,
        repostCount: comment.repost_count,
      },
    };
  }

  // Exchange OAuth code for access token
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    username?: string;
    profileId?: string;
  }> {
    try {
      this.logger.log("Exchanging Threads authorization code for token");

      // Use the same redirect URI logic as generateOAuthUrl
      const finalRedirectUri =
        redirectUri ||
        process.env.THREADS_REDIRECT_URI ||
        `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

      this.logger.log(`Using redirect URI for token exchange: ${finalRedirectUri}`);

      // Exchange the code for an access token
      const response = await axios.post(`${this.API_BASE_URL}/oauth/access_token`, {
        client_id: process.env.THREADS_APP_ID,
        client_secret: process.env.THREADS_APP_SECRET,
        grant_type: "authorization_code",
        redirect_uri: finalRedirectUri,
        code: code,
      });

      const accessToken = response.data.access_token;

      // Fetch user profile information using the access token
      let username: string;
      let profileId: string;

      try {
        const userProfileResponse = await axios.get(`${this.API_BASE_URL}/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            fields: "id,username,name", // Request user profile fields
          },
        });

        const userProfile = userProfileResponse.data;
        username = userProfile.username || userProfile.name || `threads_user_${userProfile.id}`;
        profileId = userProfile.id;

        this.logger.log(`Fetched Threads user profile: ${username} (ID: ${profileId})`);
      } catch (profileError) {
        this.logger.warn(`Could not fetch Threads user profile: ${profileError.message}`);
        // Continue without profile info if this fails
        username = undefined;
        profileId = undefined;
      }

      // Return token information along with user profile
      return {
        accessToken: accessToken,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in || 3600, // Default to 1 hour if not provided
        username: username,
        profileId: profileId,
      };
    } catch (error) {
      this.logger.error(`Error exchanging Threads code for token: ${error.message}`, error.stack);

      // Provide more specific error information
      if (error.response && error.response.status === 400) {
        if (error.response.data && error.response.data.error) {
          this.logger.error(`Threads API error: ${JSON.stringify(error.response.data.error)}`);

          // Check for expired code
          if (error.response.data.error.message && error.response.data.error.message.includes("invalid_code")) {
            throw new Error("Authorization code has expired. Please try authenticating again.");
          }
        }
      }

      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing Threads content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for Threads app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.THREADS,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new Threads content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.THREADS;
        socialContent.content = content.content;
        socialContent.type = content.type === "post" ? SocialContentType.POST : SocialContentType.COMMENT;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new Threads items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing Threads content for app ${appId}:`, error);
      throw error;
    }
  }
}
