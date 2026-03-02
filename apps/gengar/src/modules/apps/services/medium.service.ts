import { Injectable, Logger } from "@nestjs/common";
import { SocialCredentialsRepository } from "../../../db/repositories/social-credential.repository";
import { SocialCredential, SocialNetworkType } from "../../../db/entities/social-credential.entity";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";
import { SocialContent, SocialContentSource, SocialContentType } from "../../../db/entities/social-content.entity";
import { HttpClientWithRetry } from "../../common/utils";
import { BaseSnsService } from "./base-sns.service";
import * as xml2js from "xml2js";
import axios from "axios";

interface MediumPost {
  title: string;
  content: string;
  link: string;
  pubDate: string;
  guid: string;
}

interface MediumGraphQLPost {
  id: string;
  title: string;
  subtitle?: string;
  content?: {
    bodyModel?: {
      paragraphs?: Array<{
        text: string;
        type: string;
        markups?: Array<{
          type: string;
          start: number;
          end: number;
          href?: string;
        }>;
      }>;
    };
  };
  previewContent?: {
    bodyModel?: {
      paragraphs?: Array<{
        text: string;
        type: string;
        markups?: Array<{
          type: string;
          start: number;
          end: number;
          href?: string;
        }>;
      }>;
    };
  };
  slug: string;
  createdAt: number;
  updatedAt: number;
  readingTime: number;
  tags?: Array<{
    name: string;
    slug: string;
  }>;
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
export class MediumService extends BaseSnsService {
  private readonly logger = new Logger(MediumService.name);
  private readonly httpClient: HttpClientWithRetry;

  constructor(
    protected readonly socialCredentialsRepository: SocialCredentialsRepository,
    protected readonly socialContentRepository: SocialContentRepository,
  ) {
    super(socialCredentialsRepository, socialContentRepository);
    this.httpClient = new HttpClientWithRetry(this.logger);
  }

  async validateUsername(username: string): Promise<boolean> {
    try {
      const response = await this.httpClient.get(`https://medium.com/feed/@${username}`, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        retries: 3,
      });
      return response.status === 200 && response.headers["content-type"]?.includes("xml");
    } catch (error) {
      if (error.response?.status === 429) {
        this.logger.warn(`Rate limited while validating Medium username ${username}. This might resolve itself later.`);
        // For validation, we'll return true if we get rate limited, assuming the username exists
        // This prevents blocking the user due to temporary rate limiting
        return true;
      }
      this.logger.warn(`Failed to validate Medium username ${username}: ${error.message}`);
      return false;
    }
  }

  async fetchUserContent(userId: number, username: string, appId: number): Promise<SocialContentData[]> {
    try {
      this.logger.log(`Starting Medium content fetch for user @${username}`);

      // Try GraphQL first, fallback to RSS if needed
      let posts: MediumPost[] = [];
      try {
        const graphqlPosts = await this.fetchMediumPostsGraphQL(username);
        posts = graphqlPosts.map((post) => this.convertGraphQLPostToMediumPost(post));
        this.logger.log(`Fetched ${posts.length} posts via GraphQL for user @${username}`);
      } catch (graphqlError) {
        this.logger.warn(`GraphQL fetch failed for @${username}, falling back to RSS: ${graphqlError.message}`);
        posts = await this.fetchMediumPosts(username);
        this.logger.log(`Fetched ${posts.length} posts via RSS for user @${username}`);
      }

      const postsEntities = await Promise.all(
        posts.map(async (post) => {
          const entity = this.createSocialContentFromPost(post, userId, appId, username);

          return entity;
        }),
      );

      this.logger.log(`Successfully fetched ${postsEntities.length} Medium posts for user ${userId}`);

      return postsEntities;
    } catch (error) {
      this.logger.error(`Error fetching Medium content: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async fetchMediumPostsGraphQL(username: string): Promise<MediumGraphQLPost[]> {
    try {
      const query = `
        query GetUserPosts($username: String!, $pagingOptions: PagingOptions) {
          user(username: $username) {
            posts(pagingOptions: $pagingOptions) {
              ... on PostConnection {
                posts {
                  id
                  title
                  subtitle
                  content {
                    bodyModel {
                      paragraphs {
                        text
                        type
                        markups {
                          type
                          start
                          end
                          href
                        }
                      }
                    }
                  }
                  previewContent {
                    bodyModel {
                      paragraphs {
                        text
                        type
                      }
                    }
                  }
                  slug
                  createdAt
                  updatedAt
                  readingTime
                  tags {
                    name
                    slug
                  }
                }
                pagingInfo {
                  next {
                    limit
                    page
                  }
                }
              }
            }
          }
        }
      `;

      let allPosts: MediumGraphQLPost[] = [];
      let hasNextPage = true;
      let page = 0;
      const limit = 25;

      while (hasNextPage && allPosts.length < 100) {
        // Limit to max 100 posts to avoid infinite loops
        const response = await axios.post(
          "https://medium.com/_/graphql",
          {
            query,
            variables: {
              username,
              pagingOptions: {
                limit,
                page,
              },
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
            timeout: 15000,
          },
        );

        if (response.data?.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        }

        const posts = response.data?.data?.user?.posts?.posts || [];
        const pagingInfo = response.data?.data?.user?.posts?.pagingInfo?.next;

        allPosts = allPosts.concat(posts);
        hasNextPage = pagingInfo && posts.length === limit;
        page++;
      }

      return allPosts;
    } catch (error) {
      this.logger.error(`Error fetching Medium GraphQL posts for @${username}: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch Medium posts via GraphQL for @${username}`);
    }
  }

  private convertGraphQLPostToMediumPost(graphqlPost: MediumGraphQLPost): MediumPost {
    // Convert GraphQL post structure to our existing MediumPost interface
    const content = this.extractContentFromGraphQLPost(graphqlPost);
    const pubDate = new Date(graphqlPost.createdAt).toISOString();
    const link = `https://medium.com/@${graphqlPost.slug}`;

    return {
      title: graphqlPost.title || "Untitled",
      content,
      link,
      pubDate,
      guid: graphqlPost.id,
    };
  }

  private extractContentFromGraphQLPost(post: MediumGraphQLPost): string {
    // Try to get full content first, then fallback to preview content
    const paragraphs = post.content?.bodyModel?.paragraphs || post.previewContent?.bodyModel?.paragraphs || [];

    if (paragraphs.length === 0) {
      return post.subtitle || "No content available";
    }

    // Convert paragraphs to HTML-like content for better rendering
    let htmlContent = "";

    paragraphs.forEach((paragraph) => {
      const text = paragraph.text || "";
      const markups = paragraph.markups || [];

      if (!text.trim()) return;

      let processedText = text;

      // Apply markups (bold, italic, links) - process in reverse order to maintain positions
      markups.reverse().forEach((markup) => {
        const beforeText = processedText.substring(0, markup.start);
        const markedText = processedText.substring(markup.start, markup.end);
        const afterText = processedText.substring(markup.end);

        switch (markup.type) {
          case "STRONG":
            processedText = beforeText + `<strong>${markedText}</strong>` + afterText;
            break;
          case "EM":
            processedText = beforeText + `<em>${markedText}</em>` + afterText;
            break;
          case "A":
            const href = markup.href || "#";
            processedText =
              beforeText + `<a href="${href}" target="_blank" rel="noopener noreferrer">${markedText}</a>` + afterText;
            break;
          case "CODE":
            processedText = beforeText + `<code>${markedText}</code>` + afterText;
            break;
        }
      });

      // Convert paragraph types to appropriate HTML tags
      switch (paragraph.type) {
        case "H3":
          htmlContent += `<h3>${processedText}</h3>\n`;
          break;
        case "H4":
          htmlContent += `<h4>${processedText}</h4>\n`;
          break;
        case "BQ":
          htmlContent += `<blockquote>${processedText}</blockquote>\n`;
          break;
        case "ULI":
          htmlContent += `<li>${processedText}</li>\n`;
          break;
        case "OLI":
          htmlContent += `<li>${processedText}</li>\n`;
          break;
        case "PRE":
          htmlContent += `<pre><code>${processedText}</code></pre>\n`;
          break;
        default:
          htmlContent += `<p>${processedText}</p>\n`;
      }
    });

    return htmlContent || "No content available";
  }

  private async fetchMediumPosts(username: string): Promise<MediumPost[]> {
    try {
      const response = await this.httpClient.get(`https://medium.com/feed/@${username}`, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml",
        },
        retries: 3,
      });

      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      if (!result.rss?.channel?.[0]?.item) {
        this.logger.warn(`No posts found for Medium user @${username}`);
        return [];
      }

      const items = result.rss.channel[0].item;
      const posts: MediumPost[] = items.map((item: any) => ({
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
          `Rate limited while fetching Medium RSS feed for @${username}. Consider implementing caching or reducing request frequency.`,
        );
        throw new Error(`Medium API rate limit exceeded for @${username}. Please try again later.`);
      }

      this.logger.error(`Error fetching Medium RSS feed for @${username}: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch Medium posts for @${username}`);
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
      // Only decode HTML entities, keep the HTML structure
      content = content
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
    }

    return content || "No content available";
  }

  private createSocialContentFromPost(
    post: MediumPost,
    userId: number,
    appId: number,
    username: string,
  ): SocialContentData {
    const publishDate = post.pubDate ? new Date(post.pubDate) : new Date();

    const content = `${post.title}\n\n${post.content}`;

    const externalId = post.link || post.guid || `medium_${Date.now()}`;

    return {
      userId,
      appId,
      source: SocialNetworkType.MEDIUM,
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
      this.logger.log(`Syncing MEDIUM content for app ${appId}`);

      // Fetch new content
      const contentData = await this.fetchUserContent(credential.userId, credential.username, appId);

      if (!contentData || !Array.isArray(contentData)) {
        this.logger.warn(`No content fetched for MEDIUM app ${appId}`);
        return;
      }

      // Get existing content IDs to avoid duplicates
      const existingContent = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.MEDIUM,
        },
        select: ["externalId"],
      });

      const existingIds = new Set(existingContent.map((c) => c.externalId));

      // Filter out existing content
      const newContent = contentData.filter((content) => !existingIds.has(content.externalId));

      if (newContent.length === 0) {
        this.logger.log(`No new MEDIUM content to sync for app ${appId}`);
        return;
      }

      // Save new content
      const contentEntities = newContent.map((content) => {
        const socialContent = new SocialContent();
        socialContent.source = SocialContentSource.MEDIUM;
        socialContent.content = content.content;
        socialContent.type = SocialContentType.POST;
        socialContent.externalId = content.externalId;
        socialContent.appId = appId;
        socialContent.socialCredentialId = credential.id;
        socialContent.socialContentCreatedAt = content.postedAt;
        socialContent.metadata = content.metadata;
        return socialContent;
      });

      await this.socialContentRepository.save(contentEntities);
      this.logger.log(`Synced ${contentEntities.length} new MEDIUM items for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error syncing MEDIUM content for app ${appId}:`, error);
      throw error;
    }
  }
}
