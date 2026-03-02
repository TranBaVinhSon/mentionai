import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { BaseSnsService } from "./base-sns.service";
import axios from "axios";
import * as xml2js from "xml2js";

interface GoodreadsRssItem {
  guid: string[];
  pubDate: string[];
  title: string[];
  link: string[];
  description: string[];
  book_image_url?: string[];
  user_shelves?: string[];
  user_rating?: string[];
  author_name?: string[];
}

interface GoodreadsRssFeed {
  rss: {
    channel: [
      {
        title: string[];
        item: GoodreadsRssItem[];
      },
    ];
  };
}

interface SocialContentData {
  userId: number;
  appId: number;
  source: SocialNetworkType;
  type: "post" | "book";
  externalId: string;
  content: string;
  media: any[];
  parentId: string | null;
  postedAt: Date;
  username: string;
  metadata: any;
}

@Injectable()
export class GoodreadsService extends BaseSnsService {
  private readonly logger = new Logger(GoodreadsService.name);

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
  }

  async validateRssFeedUrl(userId: string): Promise<boolean> {
    try {
      // Check if userId is a valid number
      if (!/^\d+$/.test(userId)) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Error validating Goodreads user ID: ${error.message}`, error.stack);
      return false;
    }
  }

  private buildRssFeedUrl(userId: string): string {
    return `https://www.goodreads.com/review/list_rss/${userId}`;
  }

  private mapShelfToAction(shelf: string): string {
    const shelfMap: Record<string, string> = {
      "currently-reading": "is reading",
      read: "read",
      "to-read": "wants to read",
      "want-to-read": "wants to read",
    };
    return shelfMap[shelf] || shelf;
  }

  async fetchUserContent(userId: number, goodreadsUserId: string, appId: number): Promise<Array<SocialContentData>> {
    try {
      const rssFeedUrl = this.buildRssFeedUrl(goodreadsUserId);
      const response = await axios.get(rssFeedUrl);
      const parser = new xml2js.Parser();

      const result = (await parser.parseStringPromise(response.data)) as GoodreadsRssFeed;

      if (!result.rss?.channel?.[0]?.item) {
        throw new Error("Invalid RSS feed format");
      }

      const items = result.rss.channel[0].item;
      const contentEntities = await Promise.all(
        items.map(async (item) => {
          const bookTitle = item.title[0];
          const shelf = item.user_shelves?.[0] || "";
          const action = this.mapShelfToAction(shelf);
          const image = item.book_image_url?.[0] || "";
          const author = item.author_name?.[0] || "";
          const rating = item.user_rating?.[0] || "0";

          const content = {
            type: "book",
            action,
            book: {
              title: bookTitle,
              link: item.link[0],
              image,
              author,
              rating: parseInt(rating, 10),
            },
            timestamp: item.pubDate[0],
          };

          const entity = {
            content: JSON.stringify(content),
            externalId: item.guid[0],
            postedAt: new Date(item.pubDate[0]),
            type: "book" as const,
            userId,
            appId,
            source: SocialNetworkType.GOODREADS,
            media: [],
            parentId: null,
            username: goodreadsUserId,
            metadata: {
              title: bookTitle,
              action,
              link: item.link[0],
              author,
              rating: parseInt(rating, 10),
              shelf,
            },
          };

          // Ingest content into memory
          const formattedContent = this.formatContentForMemory(entity);
          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            entity.externalId,
            formattedContent,
            "book",
            SocialNetworkType.GOODREADS,
            item.link[0],
            entity.postedAt,
          );

          return entity;
        }),
      );

      this.logger.log(
        `Successfully fetched and saved ${contentEntities.length} Goodreads updates to memory for user ${userId}`,
      );

      return contentEntities;
    } catch (error) {
      this.logger.error(`Error fetching Goodreads content for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  private formatContentForMemory(entity: SocialContentData): string {
    const timestamp = entity.postedAt.toISOString().split("T")[0];
    const metadata = entity.metadata;

    return `Goodreads Update by @${entity.username} on ${timestamp}:

Action: ${metadata.action}
Book: ${metadata.title}
Author: ${metadata.author}
Rating: ${metadata.rating}/5
Shelf: ${metadata.shelf}

Book URL: ${metadata.link}`;
  }

  protected getType(): SocialNetworkType {
    return SocialNetworkType.GOODREADS;
  }

  async syncContent(credential: SocialCredential, appId: number): Promise<void> {
    try {
      this.logger.log(`Syncing GOODREADS content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(
        credential.userId,
        credential.username, // Goodreads uses username as the user ID
        appId,
      );

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for GOODREADS app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.GOODREADS,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new GOODREADS content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.GOODREADS;
        socialContent.content = content.content;
        socialContent.type = SocialContentType.BOOK;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new GOODREADS items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing GOODREADS content for app ${appId}:`, error);
      throw error;
    }
  }
}
