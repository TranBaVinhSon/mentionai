import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";

import axios from "axios";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for Facebook API responses
interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
}

interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from?: { id: string; name: string };
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

interface FacebookUserProfile {
  id: string;
  name?: string;
  email?: string;
  // Note: username field is deprecated in Facebook API v2.0+ and no longer accessible
  picture?: {
    data: {
      url: string;
    };
  };
}

@Injectable()
export class FacebookService extends BaseSnsService {
  private readonly logger = new Logger(FacebookService.name);
  private readonly API_BASE_URL = "https://graph.facebook.com";
  private readonly API_VERSION = "v22.0"; // Updated to current version

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      // Validate token before proceeding
      if (!accessToken || accessToken.trim() === "") {
        throw new Error("Facebook access token is required");
      }

      // First, get the user's Facebook profile to get their Facebook ID
      const userProfile = await this.getCurrentUserProfile(accessToken);
      const userFacebookId = userProfile.id;

      const posts = await this.fetchUserPosts(accessToken);

      console.log("posts", JSON.stringify(posts, null, 2));

      const postIds = posts.map((post) => post.id);
      const commentsPromises = postIds.map((postId) => this.fetchPostComments(postId, accessToken));

      const commentsResults = await Promise.all(commentsPromises);
      const allComments = commentsResults.flat();

      // Filter comments to only include those made by the authenticated user
      const userComments = allComments.filter((comment) => comment.from?.id === userFacebookId);

      console.log("userComments", JSON.stringify(userComments, null, 2));

      // Create post entities (filter out posts without meaningful content)
      const postsEntities = posts
        .map((post) => this.createSocialContentFromPost(post, userId, appId, username || "Unknown"))
        .filter((entity) => entity !== null); // Remove null entities

      // Create comment entities (only for user's own comments with meaningful content)
      const commentsEntities = userComments
        .map((comment) =>
          this.createSocialContentFromComment(
            comment,
            userId,
            appId,
            username,
            comment.from?.name || username || "Unknown",
          ),
        )
        .filter((entity) => entity !== null); // Remove null entities

      // Combine all entities
      const contentEntities = [...postsEntities, ...commentsEntities];

      this.logger.log(
        `Successfully fetched ${contentEntities.length} Facebook items (${postsEntities.length} posts, ${commentsEntities.length} user comments) for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Facebook content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserPosts(accessToken: string, limit = 500) {
    try {
      this.logger.log(`Attempting to fetch posts from /me/posts with limit ${limit}`);
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/me/posts`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
          fields: "id,message,created_time", // Simplified to only basic fields that work
        },
      });

      this.logger.log("Posts response status:", response.status);
      this.logger.log("Posts response data:", JSON.stringify(response.data, null, 2));

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Error fetching Facebook posts: ${error.message}`, error.stack);

      // Log more details about the error
      if (error.response) {
        this.logger.error("Error response status:", error.response.status);
        this.logger.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  private async fetchPostComments(postId: string, accessToken: string, limit = 100) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/${postId}/comments`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
          fields: "id,message,created_time,from", // Simplified to basic fields
        },
      });
      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Error fetching comments for post ${postId}: ${error.message}`, error.stack);
      return []; // Return empty array instead of failing
    }
  }

  private createSocialContentFromPost(
    post: FacebookPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData | null {
    // Skip posts without meaningful content
    if (!post.message || post.message.trim().length === 0) {
      this.logger.debug(`Skipping Facebook post ${post.id} - no message content`);
      return null;
    }

    const content = post.message.trim();

    // Ensure minimum content length for meaningful embedding
    if (content.length < 3) {
      this.logger.debug(`Skipping Facebook post ${post.id} - content too short: "${content}"`);
      return null;
    }

    return {
      userId,
      appId,
      source: SocialNetworkType.FACEBOOK,
      type: "post",
      externalId: post.id,
      content: content,
      media: [], // Simplified since we're not fetching attachments
      parentId: null,
      postedAt: new Date(post.created_time),
      username,
      metadata: {
        // Simplified metadata without engagement counts
        postId: post.id,
      },
    };
  }

  private createSocialContentFromComment(
    comment: FacebookComment,
    userId: number,
    appId: number,
    username: string,
    commenterName: string,
  ): SocialContentData | null {
    // Skip comments without meaningful content
    if (!comment.message || comment.message.trim().length === 0) {
      this.logger.debug(`Skipping Facebook comment ${comment.id} - no message content`);
      return null;
    }

    const content = comment.message.trim();

    // Ensure minimum content length for meaningful embedding
    if (content.length < 3) {
      this.logger.debug(`Skipping Facebook comment ${comment.id} - content too short: "${content}"`);
      return null;
    }

    return {
      userId,
      appId,
      source: SocialNetworkType.FACEBOOK,
      type: "comment",
      externalId: comment.id,
      content: content,
      media: [], // Simplified since we're not fetching attachments
      parentId: comment.id.split("_")[0], // Extract post ID from comment ID
      postedAt: new Date(comment.created_time),
      username: commenterName,
      metadata: {
        // Simplified metadata without engagement counts
        commentId: comment.id,
        commenterName: commenterName,
      },
    };
  }

  async getCurrentUserProfile(accessToken: string): Promise<FacebookUserProfile> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: "id,name,email,picture", // Removed deprecated username field
        },
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 403) {
        this.logger.error(
          `Facebook API 403 Forbidden - Token may be expired or lack permissions. Response: ${JSON.stringify(
            error.response?.data,
          )}`,
        );
        throw new Error(
          `Facebook access token is invalid or lacks required permissions. Please reconnect your Facebook account.`,
        );
      } else if (error.response?.status === 401) {
        this.logger.error(`Facebook API 401 Unauthorized - Invalid access token`);
        throw new Error(`Facebook access token is invalid. Please reconnect your Facebook account.`);
      }
      this.logger.error(`Error fetching current Facebook user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to validate token by checking debug info
  private async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/debug_token`, {
        params: {
          input_token: accessToken,
          access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`, // App access token
        },
      });

      const tokenInfo = response.data.data;
      const isValid = tokenInfo.is_valid;
      const expiresAt = tokenInfo.expires_at;

      if (!isValid) {
        this.logger.warn("Facebook access token is invalid");
        return false;
      }

      if (expiresAt > 0 && expiresAt < Math.floor(Date.now() / 1000)) {
        this.logger.warn("Facebook access token has expired");
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error("Error validating Facebook access token:", error.message);
      return false;
    }
  }

  // Method to refresh access token if expired
  private async refreshAccessToken(credentials: SocialCredential) {
    try {
      // Facebook token refresh logic
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: credentials.accessToken,
        },
      });

      // Update credentials with new tokens
      credentials.accessToken = response.data.access_token;

      await this.socialCredentialsRepository.save(credentials);
      return credentials;
    } catch (error) {
      this.logger.error(`Error refreshing Facebook token: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Generate OAuth authorization URL
  generateOAuthUrl(redirectUri?: string): string {
    const finalRedirectUri =
      redirectUri ||
      process.env.FACEBOOK_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

    const scope = "public_profile,email,user_posts"; // Adjust scope as needed
    const state = `facebook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the redirect URI being used
    this.logger.log(`Generating Facebook OAuth URL with redirect URI: ${finalRedirectUri}`);

    // Store state for verification if needed
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || "",
      redirect_uri: finalRedirectUri,
      scope: scope,
      response_type: "code",
      state: state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  // Exchange OAuth code for access token
  async exchangeCodeForToken(
    code: string,
    redirectUri?: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    username: string;
    profileId: string;
  }> {
    try {
      this.logger.log("Exchanging Facebook authorization code for token");

      // Use the same redirect URI logic as generateOAuthUrl
      const finalRedirectUri =
        redirectUri ||
        process.env.FACEBOOK_REDIRECT_URI ||
        `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

      this.logger.log(`Using redirect URI for token exchange: ${finalRedirectUri}`);
      this.logger.log(`Facebook App ID: ${process.env.FACEBOOK_APP_ID}`);
      this.logger.log(`Authorization code: ${code.substring(0, 50)}...`);

      // Exchange the code for an access token
      const response = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/oauth/access_token`, {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: finalRedirectUri,
          code: code,
        },
      });

      // Facebook typically returns { access_token, token_type, expires_in }
      const accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 60 * 60 * 2; // Default to 2 hours if not provided

      // Convert to long-lived token
      const longLivedTokenResponse = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: accessToken,
        },
      });

      const finalAccessToken = longLivedTokenResponse.data.access_token;

      // Fetch user profile information using the access token
      const userProfileResponse = await axios.get(`${this.API_BASE_URL}/${this.API_VERSION}/me`, {
        headers: {
          Authorization: `Bearer ${finalAccessToken}`,
        },
        params: {
          fields: "id,name,email", // Removed deprecated username field
        },
      });

      const userProfile = userProfileResponse.data;

      // Use name as username since Facebook deprecated usernames for most users
      // Fallback to email if name is not available
      const username = userProfile.name || userProfile.email || `facebook_user_${userProfile.id}`;

      this.logger.log(`Fetched Facebook user profile: ${username} (ID: ${userProfile.id})`);

      // Return the long-lived token along with user profile information
      return {
        accessToken: finalAccessToken,
        // Facebook doesn't provide refresh tokens for standard OAuth flow
        expiresIn: longLivedTokenResponse.data.expires_in || 60 * 24 * 60 * 60, // 60 days in seconds
        username: username,
        profileId: userProfile.id,
      };
    } catch (error) {
      this.logger.error(`Error exchanging Facebook code for token: ${error.message}`, error.stack);

      // Log the actual Facebook error response
      if (error.response?.data) {
        this.logger.error(`Facebook API error response:`, JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing Facebook content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for Facebook app ${appId}`);
        return;
      }

      // Process all content (both new and existing) for upsert behavior
      if (contentData.length === 0) {
        this.logger.log(`No Facebook content to sync for app ${appId}`);
        return;
      }

      // Save new content using individual upsert operations to avoid race conditions
      let successfulSaves = 0;
      const savePromises = contentData.map(async (content) => {
        try {
          // Check if content already exists
          const existingContent = await this.socialContentRepository.findOne({
            where: {
              appId,
              source: SocialContentSource.FACEBOOK,
              externalId: content.externalId,
            },
          });

          if (existingContent) {
            // Update existing content
            existingContent.content = content.content;
            existingContent.type = content.type === "post" ? SocialContentType.POST : SocialContentType.COMMENT;
            existingContent.socialCredentialId = credential.id;
            existingContent.socialContentCreatedAt = content.postedAt;
            existingContent.metadata = content.metadata;
            await this.socialContentRepository.save(existingContent);
          } else {
            // Create new content
            const socialContent = new SocialContent();
            socialContent.source = SocialContentSource.FACEBOOK;
            socialContent.content = content.content;
            socialContent.type = content.type === "post" ? SocialContentType.POST : SocialContentType.COMMENT;
            socialContent.externalId = content.externalId;
            socialContent.appId = appId;
            socialContent.socialCredentialId = credential.id;
            socialContent.socialContentCreatedAt = content.postedAt;
            socialContent.metadata = content.metadata;
            await this.socialContentRepository.save(socialContent);
          }
          successfulSaves++;
        } catch (error) {
          this.logger.error(`Failed to save Facebook content ${content.externalId}:`, error.message || error);
          // Continue with other items
        }
      });

      // Wait for all save operations to complete
      await Promise.all(savePromises);
      this.logger.log(
        `Synced ${successfulSaves} Facebook items for app ${appId} (${contentData.length - successfulSaves} failed)`,
      );
    } catch (error) {
      this.logger.error(`Error syncing Facebook content for app ${appId}:`, error);
      throw error;
    }
  }
}
