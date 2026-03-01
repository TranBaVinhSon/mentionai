import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import axios from "axios";
import { BaseSnsService } from "./base-sns.service";

// Define interfaces for ProductHunt API responses
interface ProductHuntUser {
  id: number;
  name: string;
  username: string;
  headline?: string;
  image_url?: {
    "60px": string;
    "73px": string;
    "88px": string;
    "160px": string;
    "264px": string;
    original: string;
  };
  profile_url: string;
  maker_of_count: number;
  hunter_of_count: number;
  voted_posts_count: number;
  posts_count: number;
  maker_of?: ProductHuntPost[];
  hunter_of?: ProductHuntPost[];
  voted_posts?: ProductHuntPost[];
}

interface ProductHuntPost {
  id: number;
  name: string;
  tagline: string;
  slug: string;
  day: string;
  comments_count: number;
  created_at: string;
  current_user: {
    voted_for_post: boolean;
    commented_on_post: boolean;
  };
  discussion_url: string;
  exclusive?: boolean;
  featured: boolean;
  ios_featured_at?: string;
  maker_inside: boolean;
  makers: ProductHuntUser[];
  platform: string;
  product_state: string;
  redirect_url: string;
  screenshot_url?: {
    "300px": string;
    "850px": string;
  };
  thumbnail?: {
    image_url: string;
  };
  topics: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
  user: ProductHuntUser;
  votes_count: number;
}

interface ProductHuntComment {
  id: number;
  body: string;
  created_at: string;
  post_id: number;
  user: ProductHuntUser;
  votes: number;
  parent_comment_id?: number;
  child_comments_count: number;
}

// Define simplified content interface for memory storage
interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "product" | "comment" | "profile";
  externalId: string;
  content: string;
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class ProductHuntService extends BaseSnsService {
  private readonly logger = new Logger(ProductHuntService.name);
  private readonly API_BASE_URL = "https://api.producthunt.com";
  private readonly API_VERSION = "v2";

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async fetchUserContent(userId: number, accessToken: string, username: string, appId: number) {
    try {
      // First, get the user's ProductHunt profile
      const userProfile = await this.getCurrentUserProfile(accessToken);

      // Fetch all data in parallel for better performance
      const [launchedProducts, huntedProducts, upvotedProducts, userComments] = await Promise.all([
        this.fetchUserLaunchedProducts(accessToken, userProfile.username),
        this.fetchUserHuntedProducts(accessToken, userProfile.username),
        this.fetchUserUpvotedProducts(accessToken, userProfile.username),
        this.fetchUserComments(accessToken, userProfile.username),
      ]);

      // Create profile entity
      const profileEntity = this.createSocialContentFromProfile(userProfile, userId, appId, username);

      // Create launched product entities
      const launchedProductEntities = launchedProducts.map((product) =>
        this.createSocialContentFromLaunchedProduct(product, userId, appId, username),
      );

      // Create hunted product entities
      const huntedProductEntities = huntedProducts.map((product) =>
        this.createSocialContentFromHuntedProduct(product, userId, appId, username),
      );

      // Create upvoted product entities
      const upvotedProductEntities = upvotedProducts.map((product) =>
        this.createSocialContentFromUpvotedProduct(product, userId, appId, username),
      );

      // Create comment entities
      const commentEntities = userComments.map((comment) =>
        this.createSocialContentFromComment(comment, userId, appId, username),
      );

      // Combine all entities
      const contentEntities = [
        profileEntity,
        ...launchedProductEntities,
        ...huntedProductEntities,
        ...upvotedProductEntities,
        ...commentEntities,
      ];

      this.logger.log(
        `Successfully fetched ${contentEntities.length} ProductHunt items (1 profile, ${launchedProductEntities.length} launched products, ${huntedProductEntities.length} hunted products, ${upvotedProductEntities.length} upvoted products, ${commentEntities.length} comments) for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching ProductHunt content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchUserLaunchedProducts(accessToken: string, username: string): Promise<ProductHuntPost[]> {
    try {
      const query = `
        query($username: String!) {
          user(username: $username) {
            madePosts {
              edges {
                node {
                  id
                  name
                  tagline
                  slug
                  createdAt
                  commentsCount
                  votesCount
                  featuredAt
                  url
                  thumbnail {
                    url
                  }
                  topics {
                    edges {
                      node {
                        id
                        name
                        slug
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        `${this.API_BASE_URL}/${this.API_VERSION}/api/graphql`,
        {
          query,
          variables: { username },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        return [];
      }

      const posts = response.data.data.user?.madePosts?.edges || [];

      return posts.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        slug: edge.node.slug,
        created_at: edge.node.createdAt,
        comments_count: edge.node.commentsCount,
        votes_count: edge.node.votesCount,
        featured: !!edge.node.featuredAt,
        discussion_url: edge.node.url,
        redirect_url: edge.node.url,
        topics: edge.node.topics?.edges?.map((topicEdge: any) => topicEdge.node) || [],
        thumbnail: edge.node.thumbnail ? { image_url: edge.node.thumbnail.url } : undefined,
        day: new Date(edge.node.createdAt).toISOString().split("T")[0],
        current_user: { voted_for_post: false, commented_on_post: false },
        exclusive: false,
        maker_inside: false,
        makers: [],
        platform: "web",
        product_state: "active",
        user: {} as ProductHuntUser,
      }));
    } catch (error) {
      this.logger.error(`Error fetching ProductHunt launched products: ${error.message}`, error.stack);
      return [];
    }
  }

  private async fetchUserHuntedProducts(accessToken: string, username: string): Promise<ProductHuntPost[]> {
    try {
      const query = `
        query($username: String!) {
          user(username: $username) {
            submittedPosts {
              edges {
                node {
                  id
                  name
                  tagline
                  slug
                  createdAt
                  commentsCount
                  votesCount
                  featuredAt
                  url
                  thumbnail {
                    url
                  }
                  topics {
                    edges {
                      node {
                        id
                        name
                        slug
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        `${this.API_BASE_URL}/${this.API_VERSION}/api/graphql`,
        {
          query,
          variables: { username },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        return [];
      }

      const posts = response.data.data.user?.submittedPosts?.edges || [];

      return posts.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        slug: edge.node.slug,
        created_at: edge.node.createdAt,
        comments_count: edge.node.commentsCount,
        votes_count: edge.node.votesCount,
        featured: !!edge.node.featuredAt,
        discussion_url: edge.node.url,
        redirect_url: edge.node.url,
        topics: edge.node.topics?.edges?.map((topicEdge: any) => topicEdge.node) || [],
        thumbnail: edge.node.thumbnail ? { image_url: edge.node.thumbnail.url } : undefined,
        day: new Date(edge.node.createdAt).toISOString().split("T")[0],
        current_user: { voted_for_post: false, commented_on_post: false },
        exclusive: false,
        maker_inside: false,
        makers: [],
        platform: "web",
        product_state: "active",
        user: {} as ProductHuntUser,
      }));
    } catch (error) {
      this.logger.error(`Error fetching ProductHunt hunted products: ${error.message}`, error.stack);
      return [];
    }
  }

  private async fetchUserUpvotedProducts(accessToken: string, username: string): Promise<ProductHuntPost[]> {
    try {
      const query = `
        query($username: String!) {
          user(username: $username) {
            votedPosts {
              edges {
                node {
                  id
                  name
                  tagline
                  slug
                  createdAt
                  commentsCount
                  votesCount
                  featuredAt
                  url
                  thumbnail {
                    url
                  }
                  topics {
                    edges {
                      node {
                        id
                        name
                        slug
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await axios.post(
        `${this.API_BASE_URL}/${this.API_VERSION}/api/graphql`,
        {
          query,
          variables: { username },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        return [];
      }

      const posts = response.data.data.user?.votedPosts?.edges || [];

      return posts.map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name,
        tagline: edge.node.tagline,
        slug: edge.node.slug,
        created_at: edge.node.createdAt,
        comments_count: edge.node.commentsCount,
        votes_count: edge.node.votesCount,
        featured: !!edge.node.featuredAt,
        discussion_url: edge.node.url,
        redirect_url: edge.node.url,
        topics: edge.node.topics?.edges?.map((topicEdge: any) => topicEdge.node) || [],
        thumbnail: edge.node.thumbnail ? { image_url: edge.node.thumbnail.url } : undefined,
        day: new Date(edge.node.createdAt).toISOString().split("T")[0],
        current_user: { voted_for_post: true, commented_on_post: false },
        exclusive: false,
        maker_inside: false,
        makers: [],
        platform: "web",
        product_state: "active",
        user: {} as ProductHuntUser,
      }));
    } catch (error) {
      this.logger.error(`Error fetching ProductHunt upvoted products: ${error.message}`, error.stack);
      return [];
    }
  }

  private async fetchUserComments(accessToken: string, username: string): Promise<ProductHuntComment[]> {
    try {
      // Note: ProductHunt API doesn't have a direct endpoint for user comments
      // This would need to be implemented by fetching posts and their comments
      // For now, return empty array
      this.logger.warn("ProductHunt user comments fetching not yet implemented");
      return [];
    } catch (error) {
      this.logger.error(`Error fetching ProductHunt comments: ${error.message}`, error.stack);
      return [];
    }
  }

  private createSocialContentFromProfile(
    profile: ProductHuntUser,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const content = `${profile.name} (@${profile.username})${
      profile.headline ? ` - ${profile.headline}` : ""
    }. Maker of ${profile.maker_of_count} products, hunter of ${profile.hunter_of_count} products, voted on ${
      profile.voted_posts_count
    } posts.`;

    return {
      userId,
      appId,
      source: SocialNetworkType.PRODUCTHUNT,
      type: "profile",
      externalId: profile.id.toString(),
      content,
      media: profile.image_url ? [profile.image_url.original] : [],
      parentId: null,
      postedAt: new Date(), // Use current date for profile
      username: profile.username,
      metadata: {
        profileUrl: profile.profile_url,
        headline: profile.headline,
        makerOfCount: profile.maker_of_count,
        hunterOfCount: profile.hunter_of_count,
        votedPostsCount: profile.voted_posts_count,
        postsCount: profile.posts_count,
      },
    };
  }

  private createSocialContentFromLaunchedProduct(
    product: ProductHuntPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const content = `${product.name} - ${product.tagline}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.PRODUCTHUNT,
      type: "product",
      externalId: product.id.toString(),
      content,
      media: product.thumbnail?.image_url
        ? [product.thumbnail.image_url]
        : product.screenshot_url
        ? [product.screenshot_url["850px"]]
        : [],
      parentId: null,
      postedAt: new Date(product.created_at),
      username,
      metadata: {
        productType: "launched",
        productName: product.name,
        tagline: product.tagline,
        slug: product.slug,
        votesCount: product.votes_count,
        commentsCount: product.comments_count,
        discussionUrl: product.discussion_url,
        redirectUrl: product.redirect_url,
        platform: product.platform,
        featured: product.featured,
        topics: product.topics,
        thumbnail: product.thumbnail?.image_url || null,
      },
    };
  }

  private createSocialContentFromHuntedProduct(
    product: ProductHuntPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const content = `${product.name} - ${product.tagline}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.PRODUCTHUNT,
      type: "product",
      externalId: `hunted_${product.id}`,
      content,
      media: product.thumbnail?.image_url
        ? [product.thumbnail.image_url]
        : product.screenshot_url
        ? [product.screenshot_url["850px"]]
        : [],
      parentId: null,
      postedAt: new Date(product.created_at),
      username,
      metadata: {
        productType: "hunted",
        productName: product.name,
        tagline: product.tagline,
        slug: product.slug,
        votesCount: product.votes_count,
        commentsCount: product.comments_count,
        discussionUrl: product.discussion_url,
        redirectUrl: product.redirect_url,
        platform: product.platform,
        featured: product.featured,
        topics: product.topics,
        thumbnail: product.thumbnail?.image_url || null,
      },
    };
  }

  private createSocialContentFromUpvotedProduct(
    product: ProductHuntPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const content = `${product.name} - ${product.tagline}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.PRODUCTHUNT,
      type: "product",
      externalId: `upvoted_${product.id}`,
      content,
      media: product.thumbnail?.image_url
        ? [product.thumbnail.image_url]
        : product.screenshot_url
        ? [product.screenshot_url["850px"]]
        : [],
      parentId: null,
      postedAt: new Date(product.created_at),
      username,
      metadata: {
        productType: "upvoted",
        productName: product.name,
        tagline: product.tagline,
        slug: product.slug,
        votesCount: product.votes_count,
        commentsCount: product.comments_count,
        discussionUrl: product.discussion_url,
        redirectUrl: product.redirect_url,
        platform: product.platform,
        featured: product.featured,
        topics: product.topics,
        thumbnail: product.thumbnail?.image_url || null,
      },
    };
  }

  private createSocialContentFromComment(
    comment: ProductHuntComment,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    return {
      userId,
      appId,
      source: SocialNetworkType.PRODUCTHUNT,
      type: "comment",
      externalId: comment.id.toString(),
      content: comment.body,
      media: [],
      parentId: comment.parent_comment_id?.toString() || comment.post_id.toString(),
      postedAt: new Date(comment.created_at),
      username,
      metadata: {
        postId: comment.post_id,
        votes: comment.votes,
        parentCommentId: comment.parent_comment_id,
        childCommentsCount: comment.child_comments_count,
      },
    };
  }

  async getCurrentUserProfile(accessToken: string): Promise<ProductHuntUser> {
    try {
      const query = `
        query {
          viewer {
            user {
              id
              name
              username
              headline
              profileImage
              url
              madePosts {
                totalCount
              }
              submittedPosts {
                totalCount
              }
              votedPosts {
                totalCount
              }
              followers {
                totalCount
              }
              following {
                totalCount
              }
            }
          }
        }
      `;

      const response = await axios.post(
        `${this.API_BASE_URL}/${this.API_VERSION}/api/graphql`,
        { query },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      const userData = response.data.data.viewer.user;

      // Convert GraphQL response to match our interface
      return {
        id: userData.id,
        name: userData.name,
        username: userData.username,
        headline: userData.headline,
        image_url: userData.profileImage
          ? {
              original: userData.profileImage,
              "60px": userData.profileImage,
              "73px": userData.profileImage,
              "88px": userData.profileImage,
              "160px": userData.profileImage,
              "264px": userData.profileImage,
            }
          : undefined,
        profile_url: userData.url,
        maker_of_count: userData.madePosts?.totalCount || 0,
        hunter_of_count: userData.submittedPosts?.totalCount || 0,
        voted_posts_count: userData.votedPosts?.totalCount || 0,
        posts_count: (userData.madePosts?.totalCount || 0) + (userData.submittedPosts?.totalCount || 0),
      };
    } catch (error) {
      this.logger.error(`Error fetching current ProductHunt user profile: ${error.message}`, error.stack);
      throw error;
    }
  }

  // Generate OAuth authorization URL
  generateOAuthUrl(redirectUri?: string): string {
    // ProductHunt requires HTTPS for OAuth callbacks - always enforce HTTPS
    const baseRedirectUri =
      redirectUri ||
      process.env.PRODUCTHUNT_REDIRECT_URI ||
      `${process.env.FRONTEND_URL?.replace("http://", "https://") || "https://localhost:4000"}/apps/connect`;

    // Always convert HTTP to HTTPS for ProductHunt
    const finalRedirectUri = baseRedirectUri.replace("http://", "https://");

    const scope = "public private"; // ProductHunt scopes
    const state = `producthunt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`Generating ProductHunt OAuth URL with redirect URI: ${finalRedirectUri}`);

    const params = new URLSearchParams({
      client_id: process.env.PRODUCTHUNT_CLIENT_ID || "",
      redirect_uri: finalRedirectUri,
      scope: scope,
      response_type: "code",
      state: state,
    });

    return `${this.API_BASE_URL}/${this.API_VERSION}/oauth/authorize?${params.toString()}`;
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
      this.logger.log("Exchanging ProductHunt authorization code for token");

      // ProductHunt requires HTTPS for OAuth callbacks - always enforce HTTPS
      const baseRedirectUri =
        redirectUri ||
        process.env.PRODUCTHUNT_REDIRECT_URI ||
        `${process.env.FRONTEND_URL?.replace("http://", "https://") || "https://localhost:4000"}/apps/connect`;

      // Always convert HTTP to HTTPS for ProductHunt, even if redirectUri was explicitly passed
      const finalRedirectUri = baseRedirectUri.replace("http://", "https://");

      this.logger.log(`Using redirect URI for token exchange: ${finalRedirectUri}`);
      this.logger.log(`ProductHunt Client ID: ${process.env.PRODUCTHUNT_CLIENT_ID}`);
      this.logger.log(`Authorization code: ${code.substring(0, 50)}...`);
      this.logger.log(`Authorization code length: ${code.length}`);

      // Check if code needs URL decoding
      const decodedCode = decodeURIComponent(code);
      this.logger.log(`Code needs decoding: ${code !== decodedCode}`);

      // Exchange the code for an access token
      const tokenEndpoint = `${this.API_BASE_URL}/${this.API_VERSION}/oauth/token`;
      this.logger.log(`Token endpoint: ${tokenEndpoint}`);

      const requestBody = {
        client_id: process.env.PRODUCTHUNT_CLIENT_ID,
        client_secret: process.env.PRODUCTHUNT_CLIENT_SECRET,
        redirect_uri: finalRedirectUri,
        code: code,
        grant_type: "authorization_code",
      };

      this.logger.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

      const response = await axios.post(tokenEndpoint, requestBody, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const accessToken = response.data.access_token;
      const refreshToken = response.data.refresh_token;
      const expiresIn = response.data.expires_in || 60 * 60 * 24 * 365; // Default to 1 year

      // Fetch user profile information using the access token
      const userProfile = await this.getCurrentUserProfile(accessToken);

      this.logger.log(`Fetched ProductHunt user profile: ${userProfile.username} (ID: ${userProfile.id})`);

      return {
        accessToken,
        refreshToken,
        expiresIn,
        username: userProfile.username,
        profileId: userProfile.id.toString(),
      };
    } catch (error) {
      this.logger.error(`Error exchanging ProductHunt code for token: ${error.message}`, error.stack);

      if (error.response?.data) {
        this.logger.error(`ProductHunt API error response:`, JSON.stringify(error.response.data, null, 2));
      }

      throw error;
    }
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing PRODUCTHUNT content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.accessToken,
        credential.username,
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for PRODUCTHUNT app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.PRODUCTHUNT,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new PRODUCTHUNT content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.PRODUCTHUNT;
        socialContent.content = content.content;
        socialContent.type = SocialContentType.PRODUCT;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new PRODUCTHUNT items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing PRODUCTHUNT content for app ${appId}:`, error);
      throw error;
    }
  }
}
