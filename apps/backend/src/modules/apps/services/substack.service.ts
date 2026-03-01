import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialNetworkType, SocialCredential } from "../../../db/entities/social-credential.entity";
import { HttpClientWithRetry } from "../../common/utils";
import { BaseSnsService } from "./base-sns.service";
import * as xml2js from "xml2js";
import * as he from "he";

interface SubstackPost {
  title: string;
  content: string;
  link: string;
  pubDate: string;
  guid: string;
}

interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "post";
  externalId: string;
  content: string;
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class SubstackService extends BaseSnsService {
  private readonly logger = new Logger(SubstackService.name);
  private readonly httpClient: HttpClientWithRetry;

  constructor(protected readonly socialCredentialsRepository: SocialCredentialsRepository) {
    super(socialCredentialsRepository);
    this.httpClient = new HttpClientWithRetry(this.logger);
  }

  async validateUsername(username: string): Promise<boolean> {
    try {
      const response = await this.httpClient.get(`https://${username}.substack.com/feed`, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        retries: 3,
      });
      return response.status === 200 && response.headers["content-type"]?.includes("xml");
    } catch (error) {
      if (error.response?.status === 429) {
        this.logger.warn(
          `Rate limited while validating Substack username ${username}. This might resolve itself later.`,
        );
        // For validation, we'll return true if we get rate limited, assuming the username exists
        // This prevents blocking the user due to temporary rate limiting
        return true;
      }
      this.logger.warn(`Failed to validate Substack username ${username}: ${error.message}`);
      return false;
    }
  }

  async fetchUserContent(userId: number, username: string, appId: number): Promise<SocialContentData[]> {
    try {
      this.logger.log(`Starting Substack content fetch for user @${username}`);

      const posts = await this.fetchSubstackPosts(username);
      this.logger.log(`Fetched ${posts.length} posts for user @${username}`);

      const postsEntities = await Promise.all(
        posts.map(async (post) => {
          const entity = this.createSocialContentFromPost(post, userId, appId, username);
          return entity;
        }),
      );

      this.logger.log(`Successfully fetched ${postsEntities.length} Substack posts for user ${userId}`);

      return postsEntities;
    } catch (error) {
      this.logger.error(`Error fetching Substack content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchSubstackPosts(username: string): Promise<SubstackPost[]> {
    try {
      const response = await this.httpClient.get(`https://${username}.substack.com/feed`, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        retries: 3,
      });

      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      if (!result.rss?.channel?.[0]?.item) {
        this.logger.warn(`No posts found for Substack user @${username}`);
        return [];
      }

      const items = result.rss.channel[0].item;
      const posts: SubstackPost[] = items.map((item: any) => ({
        title: item.title?.[0] || "Untitled",
        content: this.extractContentFromItem(item),
        link: item.link?.[0] || "",
        pubDate: item.pubDate?.[0] || "",
        guid: item.guid?.[0]?._ || item.guid?.[0] || "",
      }));

      return posts;
    } catch (error) {
      if (error.response?.status === 429) {
        this.logger.error(
          `Rate limited while fetching Substack RSS feed for @${username}. Consider implementing caching or reducing request frequency.`,
        );
        throw new Error(`Substack API rate limit exceeded for @${username}. Please try again later.`);
      }

      this.logger.error(`Error fetching Substack RSS feed for @${username}: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch Substack posts for @${username}`);
    }
  }

  private extractContentFromItem(item: any): string {
    let content = "";

    // Prefer content:encoded as it contains the full HTML content
    if (item["content:encoded"]?.[0]) {
      content = item["content:encoded"][0];
    } else if (item.description?.[0]) {
      content = item.description[0];
    }

    if (content) {
      // First decode ALL HTML entities (including numeric entities)
      content = he.decode(content).trim();

      // Remove Substack's image expand/maximize UI elements
      // Remove the entire image-link-expand div with icons
      content = content.replace(/<div class="image-link-expand">[\s\S]*?<\/div>\s*<\/div>/g, "");

      // Remove any remaining icon containers
      content = content.replace(/<div class="[^"]*icon-container[^"]*"[\s\S]*?<\/div>/g, "");

      // Clean up any Substack-specific UI classes that might cause display issues
      content = content.replace(/\sclass="[^"]*viewable-img[^"]*"/g, "");
      content = content.replace(/\sdata-component-name="[^"]*"/g, "");

      // Remove empty picture tags that might be left over
      content = content.replace(/<picture>\s*<\/picture>/g, "");
    }

    return content || "No content available";
  }

  private createSocialContentFromPost(
    post: SubstackPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const publishDate = post.pubDate ? new Date(post.pubDate) : new Date();

    const content = `${post.title}\n\n${post.content}`;

    const externalId = post.link || post.guid || `substack_${Date.now()}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.SUBSTACK,
      type: "post",
      externalId,
      content: content.trim(),
      media: [],
      parentId: null,
      postedAt: publishDate,
      username: username,
      metadata: {
        title: post.title,
        link: post.link,
        guid: post.guid,
        publishDate: post.pubDate,
      },
    };
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing SUBSTACK content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(credential.userId, credential.username, appId);

      this.logger.log(`Fetched ${contentData.length} Substack posts for sync`);
    } catch (error) {
      this.logger.error(`Error syncing Substack content for app ${appId}:`, error);
      throw error;
    }
  }
}
