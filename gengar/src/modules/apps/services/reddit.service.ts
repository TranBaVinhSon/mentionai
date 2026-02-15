import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import axios from "axios";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for Reddit API responses
interface RedditPost {
  kind: string;
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    subreddit: string;
    created_utc: number;
    score: number;
    num_comments: number;
    permalink: string;
    is_self: boolean;
    thumbnail?: string;
    media?: any;
    preview?: any;
  };
}

interface RedditComment {
  kind: string;
  data: {
    id: string;
    body: string;
    author: string;
    created_utc: number;
    score: number;
    permalink: string;
    parent_id: string;
    link_id: string;
    subreddit: string;
    replies?: {
      kind: string;
      data: {
        children: RedditComment[];
      };
    };
  };
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
export class RedditService extends BaseSnsService {
  private readonly logger = new Logger(RedditService.name);

  private readonly API_BASE_URL = "https://oauth.reddit.com";
  private readonly AUTH_URL = "https://www.reddit.com/api/v1/access_token";

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  // Generate OAuth authorization URL
  generateOAuthUrl(redirectUri?: string): string {
    const finalRedirectUri = redirectUri || process.env.REDDIT_REDIRECT_URI || "http://localhost:4000/apps/connect";

    const scope = "identity,read,history"; // Reddit scopes
    const state = `reddit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const params = new URLSearchParams({
      client_id: process.env.REDDIT_CLIENT_ID || "",
      response_type: "code",
      state: state,
      redirect_uri: finalRedirectUri,
      duration: "permanent",
      scope: scope,
    });

    return `https://www.reddit.com/api/v1/authorize?${params.toString()}`;
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      this.logger.log(`Starting Reddit content fetch for user ${username}`);

      // Get credentials for potential token refresh
      const credentials = await this.socialCredentialsRepository.findOne({
        where: { userId, type: "reddit" },
      });

      // Verify token is valid by getting user profile
      try {
        const profile = await this.getUserProfile(accessToken);
        this.logger.log(`Verified Reddit access token for user: ${profile.name}`);
      } catch (profileError) {
        // Handle 401 errors with token refresh
        if (profileError.response?.status === 401 && credentials?.refreshToken) {
          this.logger.log("Reddit access token expired, attempting refresh...");
          try {
            const refreshedCredentials = await this.refreshAccessToken(credentials);
            // Retry with refreshed token
            const profile = await this.getUserProfile(refreshedCredentials.accessToken);
            this.logger.log(`Verified Reddit access token after refresh for user: ${profile.name}`);
            accessToken = refreshedCredentials.accessToken; // Update token for subsequent calls
          } catch (refreshError) {
            this.logger.error("Failed to refresh Reddit access token", refreshError.stack);
            throw new Error("Reddit access token is invalid or expired. Please re-authenticate.");
          }
        } else {
          this.logger.error("Invalid or expired Reddit access token", profileError.stack);
          throw new Error("Reddit access token is invalid or expired. Please re-authenticate.");
        }
      }

      // Get user's posts with pagination support
      const posts = await this.fetchAllUserPosts(accessToken, username);
      this.logger.log(`Fetched ${posts.length} posts for user ${username}`);

      // Get user's comments with pagination support
      const comments = await this.fetchAllUserComments(accessToken, username);
      this.logger.log(`Fetched ${comments.length} comments for user ${username}`);

      // Create post entities
      const postsEntities = await Promise.all(
        posts.map(async (post) => {
          const entity = this.createSocialContentFromPost(post, userId, appId, username || "Unknown");

          return entity;
        }),
      );

      // Create comment entities
      const commentsEntities = await Promise.all(
        comments.map(async (comment) => {
          const entity = this.createSocialContentFromComment(comment, userId, appId, username, username || "Unknown");

          return entity;
        }),
      );

      // Combine all entities
      const contentEntities = [...postsEntities, ...commentsEntities];

      this.logger.log(
        `Successfully fetched ${contentEntities.length} Reddit items (${postsEntities.length} posts, ${commentsEntities.length} comments) for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Reddit content: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Enhanced method to fetch all user posts with pagination
  private async fetchAllUserPosts(accessToken: string, username: string, maxPages = 10): Promise<RedditPost[]> {
    const allPosts: RedditPost[] = [];
    let after: string | null = null;
    let pageCount = 0;

    try {
      while (pageCount < maxPages) {
        const { posts, after: nextAfter } = await this.fetchUserPosts(accessToken, username, 100, after);

        if (!posts || posts.length === 0) {
          break;
        }

        allPosts.push(...posts);

        after = nextAfter;

        // Break if no more pages available
        if (!nextAfter) {
          break;
        }

        pageCount++;

        // Add delay to respect rate limits
        await this.delay(1000);
      }
    } catch (error) {
      this.logger.error(`Error fetching paginated posts: ${error.message}`, error.stack);
      // Return what we have so far instead of failing completely
    }

    return allPosts;
  }

  // Enhanced method to fetch all user comments with pagination
  private async fetchAllUserComments(accessToken: string, username: string, maxPages = 10): Promise<RedditComment[]> {
    const allComments: RedditComment[] = [];
    let after: string | null = null;
    let pageCount = 0;

    try {
      while (pageCount < maxPages) {
        const { comments, after: nextAfter } = await this.fetchUserComments(accessToken, username, 100, after);

        if (!comments || comments.length === 0) {
          break;
        }

        allComments.push(...comments);

        after = nextAfter;

        // Break if no more pages available
        if (!nextAfter) {
          break;
        }

        pageCount++;

        // Add delay to respect rate limits
        await this.delay(1000);
      }
    } catch (error) {
      this.logger.error(`Error fetching paginated comments: ${error.message}`, error.stack);
      // Return what we have so far instead of failing completely
    }

    return allComments;
  }

  // Add delay method for rate limiting
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchUserPosts(
    accessToken: string,
    username: string,
    limit = 100,
    after?: string,
  ): Promise<{ posts: RedditPost[]; after: string | null }> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/user/${username}/submitted`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
        },
        params: {
          limit,
          raw_json: 1,
          after,
        },
      });

      const posts = response.data.data.children.filter((item: any) => item.kind === "t3") as RedditPost[];

      const nextAfter = response.data.data.after;

      return { posts, after: nextAfter };
    } catch (error) {
      this.logger.error(`Error fetching posts for user ${username}: ${error.message}`, error.stack);
      return { posts: [], after: null };
    }
  }

  private async fetchUserComments(
    accessToken: string,
    username: string,
    limit = 100,
    after?: string,
  ): Promise<{ comments: RedditComment[]; after: string | null }> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/user/${username}/comments`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
        },
        params: {
          limit,
          raw_json: 1,
          after,
        },
      });

      const comments = response.data.data.children.filter((item: any) => item.kind === "t1") as RedditComment[];

      const nextAfter = response.data.data.after;

      return { comments, after: nextAfter };
    } catch (error) {
      this.logger.error(`Error fetching comments for user ${username}: ${error.message}`, error.stack);
      return { comments: [], after: null };
    }
  }

  private createSocialContentFromPost(
    post: RedditPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    // Combine title and selftext for content
    const content = post.data.is_self
      ? `${post.data.title}\n\n${post.data.selftext || ""}`
      : `${post.data.title}\n\nURL: ${post.data.url}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.REDDIT,
      type: "post",
      externalId: post.data.id,
      content: content.trim(),
      media: this.extractMediaFromPost(post),
      parentId: null,
      postedAt: new Date(post.data.created_utc * 1000),
      username: username,
      metadata: {
        postId: post.data.id,
        subreddit: post.data.subreddit,
        score: post.data.score,
        numComments: post.data.num_comments,
        permalink: post.data.permalink,
        isOriginalContent: post.data.is_self,
        url: post.data.url,
        thumbnail: post.data.thumbnail,
      },
    };
  }

  private createSocialContentFromComment(
    comment: RedditComment,
    userId: number,
    appId: number,
    username: string,
    commenterName: string,
  ): SocialContentData {
    // Extract post ID from link_id (format: t3_postid)
    const parentPostId = comment.data.link_id?.replace("t3_", "") || null;

    return {
      userId,
      appId,
      source: SocialNetworkType.REDDIT,
      type: "comment",
      externalId: comment.data.id,
      content: comment.data.body || "",
      media: [],
      parentId: parentPostId,
      postedAt: new Date(comment.data.created_utc * 1000),
      username: commenterName,
      metadata: {
        commentId: comment.data.id,
        subreddit: comment.data.subreddit,
        score: comment.data.score,
        permalink: comment.data.permalink,
        parentId: comment.data.parent_id,
        linkId: comment.data.link_id,
        commenterName: commenterName,
      },
    };
  }

  private extractMediaFromPost(post: RedditPost): any[] {
    const media = [];

    // Add thumbnail if available
    if (post.data.thumbnail && post.data.thumbnail !== "self" && post.data.thumbnail !== "default") {
      media.push({
        type: "thumbnail",
        url: post.data.thumbnail,
      });
    }

    // Add preview images if available
    if (post.data.preview?.images?.length > 0) {
      post.data.preview.images.forEach((image: any) => {
        if (image.source?.url) {
          media.push({
            type: "image",
            url: image.source.url.replace(/&amp;/g, "&"),
          });
        }
      });
    }

    // Add media content if available
    if (post.data.media) {
      media.push({
        type: "media",
        data: post.data.media,
      });
    }

    return media;
  }

  // OAuth2 authentication method
  async authenticateWithCredentials(
    clientId: string,
    clientSecret: string,
    username: string,
    password: string,
  ): Promise<string> {
    try {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const params = new URLSearchParams();
      params.append("grant_type", "password");
      params.append("username", username);
      params.append("password", password);

      const response = await axios.post(this.AUTH_URL, params, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response.data.access_token;
    } catch (error) {
      this.logger.error(`Error authenticating with Reddit: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Get user profile information
  async getUserProfile(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/api/v1/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Reddit user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Exchange OAuth code for access token (for OAuth flow)
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    username?: string;
    profileId?: string;
  }> {
    try {
      this.logger.log("Exchanging Reddit authorization code for token");

      const redirectUri = process.env.REDDIT_REDIRECT_URI || "http://localhost:4000/apps/connect";
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error(
          "Reddit OAuth credentials not configured. Please set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET environment variables.",
        );
      }

      this.logger.log(`Using redirect URI: ${redirectUri}`);

      // Prepare the basic auth header
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      // Prepare form data for token exchange
      const params = new URLSearchParams();
      params.append("grant_type", "authorization_code");
      params.append("code", code);
      params.append("redirect_uri", redirectUri);

      // Exchange the code for an access token
      const response = await axios.post(this.AUTH_URL, params, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, refresh_token, expires_in } = response.data;

      // Fetch user profile information using the access token
      const userProfile = await this.getUserProfile(access_token);

      this.logger.log(`Fetched Reddit user profile: ${userProfile.name} (ID: ${userProfile.id})`);

      return {
        accessToken: access_token,
        refreshToken: refresh_token || "",
        expiresIn: expires_in || 3600, // Default to 1 hour if not provided
        username: userProfile.name,
        profileId: userProfile.id,
      };
    } catch (error) {
      this.logger.error(`Error exchanging Reddit code for token: ${error.message}`, error.stack);

      // Log more details about the error
      if (error.response) {
        this.logger.error("Error response status:", error.response.status);
        this.logger.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  // Method to refresh access token when it expires
  async refreshAccessToken(credentials: SocialCredential): Promise<SocialCredential> {
    try {
      const clientId = process.env.REDDIT_CLIENT_ID;
      const clientSecret = process.env.REDDIT_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Reddit OAuth credentials not configured");
      }

      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

      const params = new URLSearchParams();
      params.append("grant_type", "refresh_token");
      params.append("refresh_token", credentials.refreshToken);

      const response = await axios.post(this.AUTH_URL, params, {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "User-Agent": "GengarAI/1.0.0 (Personal AI Assistant)",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Update credentials with new tokens
      credentials.accessToken = response.data.access_token;
      if (response.data.refresh_token) {
        credentials.refreshToken = response.data.refresh_token;
      }

      await this.socialCredentialsRepository.save(credentials);

      this.logger.log(`Successfully refreshed Reddit access token for user ${credentials.userId}`);

      return credentials;
    } catch (error) {
      this.logger.error(`Error refreshing Reddit token: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Enhanced method to handle API errors and potentially refresh tokens
  private async handleApiError(error: any, credentials?: SocialCredential): Promise<void> {
    if (error.response?.status === 401 && credentials?.refreshToken) {
      this.logger.log("Reddit access token expired, attempting refresh...");
      try {
        await this.refreshAccessToken(credentials);
        this.logger.log("Successfully refreshed Reddit access token");
      } catch (refreshError) {
        this.logger.error("Failed to refresh Reddit access token", refreshError.stack);
        throw new Error("Reddit authentication failed. Please re-authenticate.");
      }
    } else if (error.response?.status === 429) {
      this.logger.warn("Reddit API rate limit exceeded, waiting before retry...");
      await this.delay(60000); // Wait 1 minute for rate limit reset
      throw new Error("Reddit API rate limit exceeded. Please try again later.");
    } else {
      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing REDDIT content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for REDDIT app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.REDDIT,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new REDDIT content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.REDDIT;
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
      this.logger.log(`Synced ${contentEntities.length} new REDDIT items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing REDDIT content for app ${appId}:`, error);
      throw error;
    }
  }
}
