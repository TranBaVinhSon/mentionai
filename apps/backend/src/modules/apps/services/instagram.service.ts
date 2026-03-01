import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { BaseSnsService } from "./base-sns.service";

import axios from "axios";

// Define interfaces for Instagram API responses
interface InstagramMedia {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink?: string;
}

interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username?: string;
  from?: { id: string; username: string };
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

interface InstagramUserProfile {
  id: string;
  username?: string;
  account_type?: string;
  media_count?: number;
}

@Injectable()
export class InstagramService extends BaseSnsService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly API_BASE_URL = "https://graph.instagram.com";
  private readonly API_VERSION = "v21.0";

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  // Generate OAuth authorization URL (Instagram uses Facebook OAuth)
  generateOAuthUrl(redirectUri?: string): string {
    const finalRedirectUri =
      redirectUri ||
      process.env.INSTAGRAM_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

    const scope = "instagram_basic,instagram_content_publish"; // Instagram-specific scopes
    const state = `instagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log the redirect URI being used
    this.logger.log(`Generating Instagram OAuth URL with redirect URI: ${finalRedirectUri}`);

    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID || "", // Instagram uses Facebook App ID
      redirect_uri: finalRedirectUri,
      scope: scope,
      response_type: "code",
      state: state,
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      // First, get the user's Instagram profile
      const userProfile = await this.getCurrentUserProfile(accessToken);
      const userInstagramId = userProfile.id;

      const media = await this.fetchUserMedia(accessToken);

      console.log("media", JSON.stringify(media, null, 2));

      const mediaIds = media.map((item) => item.id);
      const commentsPromises = mediaIds.map((mediaId) => this.fetchMediaComments(mediaId, accessToken));

      const commentsResults = await Promise.all(commentsPromises);
      const allComments = commentsResults.flat();

      // Filter comments to only include those made by the authenticated user
      const userComments = allComments.filter(
        (comment) => comment.from?.id === userInstagramId || comment.username === userProfile.username,
      );

      console.log("userComments", JSON.stringify(userComments, null, 2));

      // Create media entities and save to memory
      const mediaEntities = await Promise.all(
        media.map(async (mediaItem) => {
          const entity = this.createSocialContentFromMedia(
            mediaItem,
            userId,
            appId,
            username || userProfile.username || "Unknown",
          );

          // Memory ingestion will be handled after DB storage in apps service
          return entity;
        }),
      );

      // Create comment entities and save to memory (only for user's own comments)
      const commentsEntities = await Promise.all(
        userComments.map(async (comment) => {
          const entity = this.createSocialContentFromComment(
            comment,
            userId,
            appId,
            username || userProfile.username || "Unknown",
            comment.username || userProfile.username || "Unknown",
          );

          // Memory ingestion will be handled after DB storage in apps service
          return entity;
        }),
      );

      // Combine all entities
      const contentEntities = [...mediaEntities, ...commentsEntities];

      this.logger.log(
        `Successfully fetched and saved ${contentEntities.length} Instagram items (${mediaEntities.length} posts, ${commentsEntities.length} user comments) to memory for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Instagram content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserMedia(accessToken: string, limit = 100) {
    try {
      this.logger.log(`Attempting to fetch media from /me/media with limit ${limit}`);
      const response = await axios.get(`${this.API_BASE_URL}/me/media`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
          fields: "id,caption,timestamp,media_type,media_url,permalink",
        },
      });

      this.logger.log("Media response status:", response.status);
      this.logger.log("Media response data:", JSON.stringify(response.data, null, 2));

      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Error fetching Instagram media: ${error.message}`, error.stack);

      // Log more details about the error
      if (error.response) {
        this.logger.error("Error response status:", error.response.status);
        this.logger.error("Error response data:", JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  private async fetchMediaComments(mediaId: string, accessToken: string, limit = 100) {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/${mediaId}/comments`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit,
          fields: "id,text,timestamp,username,from",
        },
      });
      return response.data.data || [];
    } catch (error) {
      this.logger.error(`Error fetching comments for media ${mediaId}: ${error.message}`, error.stack);
      return []; // Return empty array instead of failing
    }
  }

  private createSocialContentFromMedia(
    media: InstagramMedia,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.INSTAGRAM,
      type: "post",
      externalId: media.id,
      content: media.caption || "",
      media: media.media_url ? [{ url: media.media_url, type: media.media_type }] : [],
      parentId: null,
      postedAt: new Date(media.timestamp),
      username,
      metadata: {
        mediaId: media.id,
        mediaType: media.media_type,
        permalink: media.permalink,
      },
    };
  }

  private createSocialContentFromComment(
    comment: InstagramComment,
    userId: number,
    appId: number,
    username: string,
    commenterName: string,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.INSTAGRAM,
      type: "comment",
      externalId: comment.id,
      content: comment.text || "",
      media: [],
      parentId: comment.id.split("_")[0], // Extract media ID from comment ID format
      postedAt: new Date(comment.timestamp),
      username: commenterName,
      metadata: {
        commentId: comment.id,
        commenterName: commenterName,
      },
    };
  }

  async getCurrentUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    try {
      const response = await axios.get(`${this.API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          fields: "id,username,account_type,media_count",
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching current Instagram user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Method to refresh access token if expired
  private async refreshAccessToken(credentials: SocialCredential) {
    try {
      // Instagram token refresh logic
      const response = await axios.get(`${this.API_BASE_URL}/refresh_access_token`, {
        params: {
          grant_type: "ig_refresh_token",
          access_token: credentials.accessToken,
        },
      });

      // Update credentials with new tokens
      credentials.accessToken = response.data.access_token;

      await this.socialCredentialsRepository.save(credentials);
      return credentials;
    } catch (error) {
      this.logger.error(`Error refreshing Instagram token: ${error.message}`, error.stack);
      throw error;
    }
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
      this.logger.log("Exchanging Instagram authorization code for token");

      // Use the same redirect URI logic as generateOAuthUrl
      const finalRedirectUri =
        redirectUri ||
        process.env.INSTAGRAM_REDIRECT_URI ||
        `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`;

      this.logger.log(`Using redirect URI for token exchange: ${finalRedirectUri}`);

      // Exchange the code for a short-lived access token
      const response = await axios.post(
        `${this.API_BASE_URL}/oauth/access_token`,
        {
          client_id: process.env.INSTAGRAM_APP_ID,
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          grant_type: "authorization_code",
          redirect_uri: finalRedirectUri,
          code: code,
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        },
      );

      // Instagram returns { access_token, user_id }
      const shortLivedAccessToken = response.data.access_token;
      const userId = response.data.user_id;

      // Exchange short-lived token for long-lived token
      const longLivedTokenResponse = await axios.get(`${this.API_BASE_URL}/access_token`, {
        params: {
          grant_type: "ig_exchange_token",
          client_secret: process.env.INSTAGRAM_APP_SECRET,
          access_token: shortLivedAccessToken,
        },
      });

      const finalAccessToken = longLivedTokenResponse.data.access_token;
      const expiresIn = longLivedTokenResponse.data.expires_in || 60 * 24 * 60 * 60; // 60 days in seconds

      // Fetch user profile information using the access token
      const userProfileResponse = await axios.get(`${this.API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${finalAccessToken}`,
        },
        params: {
          fields: "id,username,account_type",
        },
      });

      const userProfile = userProfileResponse.data;

      // Use username from profile
      const username = userProfile.username || `instagram_user_${userProfile.id}`;

      this.logger.log(`Fetched Instagram user profile: ${username} (ID: ${userProfile.id})`);

      // Return the long-lived token along with user profile information
      return {
        accessToken: finalAccessToken,
        expiresIn: expiresIn,
        username: username,
        profileId: userProfile.id,
      };
    } catch (error) {
      this.logger.error(`Error exchanging Instagram code for token: ${error.message}`, error.stack);
      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing Instagram content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for Instagram app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.INSTAGRAM,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new Instagram content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.INSTAGRAM;
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
      this.logger.log(`Synced ${contentEntities.length} new Instagram items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing Instagram content for app ${appId}:`, error);
      throw error;
    }
  }
}
