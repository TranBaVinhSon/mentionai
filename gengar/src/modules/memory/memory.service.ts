import { Injectable, Logger, Inject } from "@nestjs/common";
import MemoryClient, { Memory } from "mem0ai";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { retryWithBackoff } from "../common/utils";

interface MemoryResult {
  id: string;
  memory?: string;
  hash?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
  user_id?: string;
  score?: number; // Relevance score from mem0 search
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  private memory: MemoryClient;

  constructor(@Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar) {
    if (!process.env.MEM0_API_KEY) {
      this.logger.warn("MEM0_API_KEY is not set. Memory search functionality will be disabled.");
    }
    this.memory = new MemoryClient({
      apiKey: process.env.MEM0_API_KEY,
    });
  }

  /**
   * Search memories for a user with optional agent context
   * @param query Search query
   * @param userId User ID for memory association
   * @param agentId Optional agent ID for memory association
   * @returns Array of memory results with source information
   */
  async searchMemories(query: string, userId: number, agentId?: number): Promise<MemoryResult[]> {
    try {
      // Check if API key is available
      if (!process.env.MEM0_API_KEY) {
        this.logger.warn("MEM0_API_KEY is not set. Returning empty results.");
        return [];
      }

      this.logger.log(
        `Searching memories for user ${userId}${agentId ? ` and agent ${agentId}` : ""} with query: "${query}"`,
      );

      const searchOperation = async () => {
        if (agentId) {
          // Use v2 search with metadata filtering for agent-specific memories
          // Note: mem0 v2 requires at least one top-level filter (user_id, agent_id, app_id, run_id)
          const filters = {
            AND: [
              {
                metadata: {
                  app_id: agentId.toString(),
                },
              },
            ],
          };

          this.logger.log(
            `Using v2 search with user_id: ${userId.toString()} and filters: ${JSON.stringify(filters, null, 2)}`,
          );

          const results: Array<Memory> = await this.memory.search(query, {
            user_id: userId.toString(), // Required top-level parameter
            version: "v2",
            filters: filters,
          });

          this.logger.log(`Found ${results.length} memories for user ${userId} and agent ${agentId} using v2 search`);

          return results.map((result) => ({
            ...result,
            created_at: result.created_at?.toString(),
            updated_at: result.updated_at?.toString(),
          }));
        } else {
          // Use simple search for user_id only (this works fine)
          const searchOptions = {
            user_id: userId.toString(),
          };

          this.logger.log(`Using v1 search with options: ${JSON.stringify(searchOptions, null, 2)}`);

          const results: Array<Memory> = await this.memory.search(query, searchOptions);

          this.logger.log(`V1 Search Response: ${JSON.stringify(results, null, 2)}`);

          this.logger.log(`Found ${results.length} memories for user ${userId}`);

          return results.map((result) => ({
            ...result,
            created_at: result.created_at?.toString(),
            updated_at: result.updated_at?.toString(),
          }));
        }
      };

      return await retryWithBackoff(searchOperation, {
        retries: 3,
        onRetry: (attempt, error, delay) => {
          this.logger.warn(
            `Memory operation failed (attempt ${attempt}/3), retrying in ${Math.round(delay)}ms: ${error.message}`,
          );
        },
        baseDelay: 1000,
      });
    } catch (error) {
      this.logger.error(
        `Error searching memories for user ${userId}${agentId ? ` and agent ${agentId}` : ""}:`,
        error.stack,
      );
      this.rollbar.error("Error searching memories", {
        userId,
        agentId,
        query,
        error: error.message || String(error),
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Format memory results into a readable context string
   * @param memories Array of memory results
   * @returns Formatted string with memory context and sources
   */
  formatMemoryContext(memories: MemoryResult[]): string {
    if (!memories || memories.length === 0) {
      return "";
    }

    const memoryContext = memories
      .map((memory, index) => {
        const source = memory.metadata?.source || "unknown";
        const createdAt = memory.created_at ? new Date(memory.created_at).toLocaleDateString() : "Unknown";
        return `${index + 1}. ${memory.memory} (Source: ${source}, Date: ${createdAt})`;
      })
      .join("\n");

    return `Based on your previous interactions and content:\n\n${memoryContext}`;
  }

  /**
   * Ingest social content into memory
   * @param userId User ID for content association
   * @param appId Optional app ID for content association
   * @param content Content to store
   * @param type Type of content (post or comment)
   * @param source Source of the content (facebook, instagram, threads, linkedin, reddit, youtube, gmail, medium)
   * @param link Link to the post/comment
   * @param timestamp Timestamp of the content
   */
  async ingestSocialContent(
    userId: number,
    appId: number,
    externalId: string,
    content: string,
    type: "post" | "comment" | "email" | "profile" | "repository" | "book",
    source:
      | "facebook"
      | "instagram"
      | "threads"
      | "linkedin"
      | "reddit"
      | "youtube"
      | "gmail"
      | "medium"
      | "github"
      | "goodreads"
      | "producthunt"
      | "substack"
      | "twitter",
    link?: string,
    timestamp?: Date,
  ): Promise<void> {
    try {
      const metadata = {
        app_id: appId?.toString(),
        type,
        source,
        external_id: externalId,
        link: link || null,
        timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        ingested_at: new Date().toISOString(),
      };

      const ingestOperation = async () => {
        return await this.memory.add([{ role: "user", content }], {
          user_id: userId.toString(),
          agent_id: appId.toString(),
          async_mode: false,
          metadata,
        });
      };

      // Use retry logic with longer delays for timeout-prone operations
      await retryWithBackoff(ingestOperation, {
        retries: 8,
        onRetry: (attempt, error, delay) => {
          this.logger.warn(
            `Memory ingest operation failed (attempt ${attempt}/5), retrying in ${Math.round(delay)}ms: ${
              error.message
            }`,
          );
        },
        baseDelay: 2000,
      });
    } catch (error) {
      this.logger.error(`Error ingesting social content to memory for user ${userId}:`, error.stack);
      this.rollbar.error("Error ingesting social content to memory", {
        userId,
        appId,
        type,
        source,
        error: error.message || String(error),
        stack: error.stack,
        link,
      });
      throw error;
    }
  }

  async ingestLinkContent(
    userId: number,
    appId: number | null,
    link: {
      url: string;
      content: string;
    },
  ): Promise<void> {
    const ingestOperation = async () => {
      return await this.memory.add([{ role: "user", content: link.content }], {
        user_id: userId.toString(),
        agent_id: appId?.toString(),
        async_mode: false,
        metadata: {
          app_id: appId?.toString(),
          url: link.url,
          source: "link",
        },
      });
    };

    await retryWithBackoff(ingestOperation, {
      retries: 5,
      onRetry: (attempt, error, delay) => {
        this.logger.warn(
          `Link ingest operation failed (attempt ${attempt}/5), retrying in ${Math.round(delay)}ms: ${error.message}`,
        );
      },
      baseDelay: 2000,
    });
  }

  async ingestYouTubeContent(
    userId: number,
    appId: number | null,
    youtubeContent: {
      url: string;
      content: string;
      videoId: string;
      title: string;
      channelName: string;
      hasTranscript: boolean;
    },
  ): Promise<void> {
    const ingestOperation = async () => {
      return await this.memory.add([{ role: "user", content: youtubeContent.content }], {
        user_id: userId.toString(),
        agent_id: appId?.toString(),
        async_mode: false,
        metadata: {
          app_id: appId?.toString(),
          url: youtubeContent.url,
          video_id: youtubeContent.videoId,
        },
      });
    };

    await retryWithBackoff(ingestOperation, {
      retries: 5,
      onRetry: (attempt, error, delay) => {
        this.logger.warn(
          `Link ingest operation failed (attempt ${attempt}/5), retrying in ${Math.round(delay)}ms: ${error.message}`,
        );
      },
      baseDelay: 2000,
    });
  }

  /**
   * Delete all memories for a specific app and user
   * @param userId User ID
   * @param appId App ID
   */
  async deleteAppMemories(userId: number, appId: number): Promise<void> {
    try {
      // Use v2 get_all with metadata filtering to find memories to delete
      const filters = {
        AND: [
          {
            metadata: {
              app_id: appId.toString(),
            },
          },
        ],
      };

      this.logger.log(
        `Getting memories to delete for app ${appId} with user_id: ${userId.toString()} and filters: ${JSON.stringify(
          filters,
          null,
          2,
        )}`,
      );

      // Get all memories that match our criteria
      const memories = await this.memory.getAll({
        user_id: userId.toString(), // Required top-level parameter
        version: "v2",
        filters: filters,
      });

      this.logger.log(`Found ${memories.length} memories to delete for app ${appId}`);

      // Delete each memory individually with error handling
      let deletedCount = 0;
      let notFoundCount = 0;

      for (const memory of memories) {
        try {
          await this.memory.delete(memory.id);
          deletedCount++;
        } catch (error) {
          if (error.message && error.message.includes("Memory not found")) {
            notFoundCount++;
            this.logger.warn(`Memory ${memory.id} not found (already deleted), skipping`);
          } else {
            this.logger.error(`Failed to delete memory ${memory.id}: ${error.message}`);
            throw error;
          }
        }
      }

      this.logger.log(
        `Successfully deleted ${deletedCount} memories for app ${appId}${
          notFoundCount > 0 ? ` (${notFoundCount} already gone)` : ""
        }`,
      );
    } catch (error) {
      this.logger.error(`Error deleting memories for app ${appId}:`, error.stack);
      this.rollbar.error("Error deleting app memories", {
        userId,
        appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Delete memories for a specific social network type
   * @param userId User ID
   * @param appId App ID
   * @param socialType Social network type
   */
  async deleteSocialMemories(userId: number, appId: number, socialType: string): Promise<void> {
    try {
      // Use v2 get_all with metadata filtering to find memories to delete
      const filters = {
        AND: [
          {
            metadata: {
              app_id: appId.toString(),
            },
          },
          {
            metadata: {
              source: socialType.toLowerCase(),
            },
          },
        ],
      };

      this.logger.log(
        `Getting ${socialType} memories to delete for app ${appId} with user_id: ${userId.toString()} and filters: ${JSON.stringify(
          filters,
          null,
          2,
        )}`,
      );

      // Get all memories that match our criteria
      const memories = await this.memory.getAll({
        user_id: userId.toString(), // Required top-level parameter
        version: "v2",
        filters: filters,
      });

      this.logger.log(`Found ${memories.length} ${socialType} memories to delete for app ${appId}`);

      // Delete each memory individually with error handling
      let deletedCount = 0;
      let notFoundCount = 0;
      let skippedCount = 0;

      for (const memory of memories) {
        if (memory.metadata.source === socialType.toLowerCase() && memory.metadata.app_id === appId.toString()) {
          try {
            await this.memory.delete(memory.id);
            deletedCount++;
          } catch (error) {
            if (error.message && error.message.includes("Memory not found")) {
              notFoundCount++;
              this.logger.warn(`Memory ${memory.id} not found (already deleted), skipping`);
            } else {
              this.logger.error(`Failed to delete memory ${memory.id}: ${error.message}`);
              throw error;
            }
          }
        } else {
          skippedCount++;
        }
      }

      this.logger.log(
        `Successfully deleted ${deletedCount} ${socialType} memories for app ${appId}${
          notFoundCount > 0 ? ` (${notFoundCount} already gone)` : ""
        }${skippedCount > 0 ? ` (${skippedCount} skipped due to metadata mismatch)` : ""}`,
      );
    } catch (error) {
      this.logger.error(`Error deleting ${socialType} memories for app ${appId}:`, error.stack);
      this.rollbar.error("Error deleting social memories", {
        userId,
        appId,
        socialType,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Delete memories for a specific link
   * @param userId User ID
   * @param appId App ID
   * @param linkUrl Link URL
   */
  async deleteLinkMemories(userId: number, appId: number, linkUrl: string): Promise<void> {
    try {
      // Use v2 get_all with metadata filtering to find memories to delete
      const filters = {
        AND: [
          {
            metadata: {
              app_id: appId.toString(),
            },
          },
          {
            metadata: {
              url: linkUrl,
            },
          },
        ],
      };

      this.logger.log(
        `Getting link memories to delete for ${linkUrl} in app ${appId} with user_id: ${userId.toString()} and filters: ${JSON.stringify(
          filters,
          null,
          2,
        )}`,
      );

      // Get all memories that match our criteria
      const memories = await this.memory.getAll({
        user_id: userId.toString(), // Required top-level parameter
        version: "v2",
        filters: filters,
      });

      this.logger.log(`Found ${memories.length} link memories to delete for ${linkUrl} in app ${appId}`);

      // Delete each memory individually with error handling
      let deletedCount = 0;
      let notFoundCount = 0;

      for (const memory of memories) {
        try {
          await this.memory.delete(memory.id);
          deletedCount++;
        } catch (error) {
          if (error.message && error.message.includes("Memory not found")) {
            notFoundCount++;
            this.logger.warn(`Memory ${memory.id} not found (already deleted), skipping`);
          } else {
            this.logger.error(`Failed to delete memory ${memory.id}: ${error.message}`);
            throw error;
          }
        }
      }

      this.logger.log(
        `Successfully deleted ${deletedCount} link memories for ${linkUrl} in app ${appId}${
          notFoundCount > 0 ? ` (${notFoundCount} already gone)` : ""
        }`,
      );
    } catch (error) {
      this.logger.error(`Error deleting link memories for ${linkUrl} in app ${appId}:`, error.stack);
      this.rollbar.error("Error deleting link memories", {
        userId,
        appId,
        linkUrl,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Format content for memory storage based on service type
   */
  formatContentForMemory(content: any, service: string): string {
    const timestamp = content.postedAt
      ? content.postedAt.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    switch (service.toLowerCase()) {
      case "linkedin":
        return this.formatLinkedInContentForMemory(content);
      case "medium":
        return this.formatMediumContentForMemory(content);
      case "goodreads":
        return this.formatGoodreadsContentForMemory(content);
      case "reddit":
        return this.formatRedditContentForMemory(content);
      case "facebook":
        return this.formatFacebookContentForMemory(content);
      case "instagram":
        return this.formatInstagramContentForMemory(content);
      case "github":
        return this.formatGitHubContentForMemory(content);
      case "producthunt":
        return this.formatProductHuntContentForMemory(content);
      case "threads":
        return this.formatThreadsContentForMemory(content);
      case "twitter":
        return this.formatTwitterContentForMemory(content);
      case "gmail":
        return this.formatGmailContentForMemory(content);
      default:
        return `${service} content (${timestamp}): ${content.content}`;
    }
  }

  /**
   * Generate appropriate link for content based on service type
   */
  generateLinkForContent(content: any, service: string, externalId?: string): string | undefined {
    switch (service.toLowerCase()) {
      case "linkedin":
        return content.type === "profile"
          ? `https://linkedin.com/in/${externalId || content.username}`
          : content.externalId;
      case "medium":
        return content.metadata?.link || `https://medium.com/@${externalId || content.username}`;
      case "goodreads":
        return content.metadata?.link || `https://www.goodreads.com/book/show/${content.externalId}`;
      case "reddit":
        return `https://reddit.com${content.metadata?.permalink || `/r/${content.metadata?.subreddit || "unknown"}`}`;
      case "facebook":
        return content.type === "post"
          ? `https://www.facebook.com/${content.externalId}`
          : `https://www.facebook.com/${content.parentId || content.externalId.split("_")[0]}`;
      case "instagram":
        return content.metadata?.permalink || `https://instagram.com/p/${content.externalId}`;
      case "github":
        return content.type === "profile"
          ? content.metadata?.html_url || `https://github.com/${content.username}`
          : content.metadata?.html_url || `https://github.com/${content.username}/${content.metadata?.name}`;
      case "producthunt":
        return content.metadata?.discussionUrl || content.metadata?.redirectUrl || `https://www.producthunt.com/`;
      case "threads":
        return `https://threads.net/@${content.username}/post/${content.externalId}`;
      case "twitter":
        if (content.type === "profile") {
          return content.metadata?.profileUrl || `https://x.com/${content.username}`;
        }
        // For tweets, the externalId already contains the full URL
        return content.externalId;
      case "gmail":
        return undefined; // Gmail doesn't have public links
      default:
        return undefined;
    }
  }

  /**
   * Format LinkedIn content for memory storage
   */
  private formatLinkedInContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const isProfile = content.type === "profile";
    return `LinkedIn ${isProfile ? "Profile" : "Content"} for ${content.username} (${timestamp}): ${content.content}`;
  }

  /**
   * Format Medium content for memory storage
   */
  private formatMediumContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const metadata = content.metadata;

    return `Medium Article by @${content.username} published on ${timestamp}:

Title: ${metadata?.title || "Untitled"}

Content: ${content.content}

Article URL: ${metadata?.link || ""}`;
  }

  /**
   * Format Goodreads content for memory storage
   */
  private formatGoodreadsContentForMemory(content: any): string {
    const metadata = content.metadata;
    const timestamp = content.postedAt.toISOString().split("T")[0];

    if (content.type === "book") {
      return `Book read on Goodreads (${timestamp}): "${metadata?.title}" by ${metadata?.author}. Rating: ${
        metadata?.rating
      }/5 stars. ${metadata?.review ? `Review: "${metadata.review}"` : ""}`;
    }

    return content.content;
  }

  /**
   * Format Reddit content for memory storage
   */
  private formatRedditContentForMemory(content: any): string {
    const metadata = content.metadata;
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const mediaInfo =
      content.media && content.media.length > 0 ? ` [Includes ${content.media.length} media item(s)]` : "";

    if (content.type === "post") {
      const scoreInfo = metadata?.score !== undefined ? ` (Score: ${metadata.score})` : "";
      const commentInfo = metadata?.numComments !== undefined ? ` (${metadata.numComments} comments)` : "";

      return `Reddit Post by ${content.username} in r/${
        metadata?.subreddit || "unknown"
      } on ${timestamp}${scoreInfo}${commentInfo}:

Title/Content: ${content.content}${mediaInfo}

${metadata?.isOriginalContent ? "Original Content" : `External Link: ${metadata?.url || "N/A"}`}
Post URL: https://reddit.com${metadata?.permalink || ""}`;
    } else {
      const scoreInfo = metadata?.score !== undefined ? ` (Score: ${metadata.score})` : "";

      return `Reddit Comment by ${content.username} in r/${
        metadata?.subreddit || "unknown"
      } on ${timestamp}${scoreInfo}:

Comment: ${content.content}${mediaInfo}

Comment URL: https://reddit.com${metadata?.permalink || ""}
In response to post: ${content.parentId || "Unknown"}`;
    }
  }

  /**
   * Format Facebook content for memory storage
   */
  private formatFacebookContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const mediaInfo =
      content.media && content.media.length > 0 ? ` [Includes ${content.media.length} media item(s)]` : "";

    if (content.type === "post") {
      return `On ${timestamp}, ${content.username} posted on Facebook: "${content.content}"${mediaInfo}`;
    } else {
      return `On ${timestamp}, ${content.username} commented on Facebook: "${content.content}"${mediaInfo} [In response to post ${content.parentId}]`;
    }
  }

  /**
   * Format Instagram content for memory storage
   */
  private formatInstagramContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const mediaInfo =
      content.media && content.media.length > 0 ? ` [Includes ${content.media.length} media item(s)]` : "";

    if (content.type === "post") {
      return `On ${timestamp}, ${content.username} posted on Instagram: "${content.content}"${mediaInfo}`;
    } else {
      return `On ${timestamp}, ${content.username} commented on Instagram: "${content.content}"${mediaInfo} [In response to post ${content.parentId}]`;
    }
  }

  /**
   * Format GitHub content for memory storage
   */
  private formatGitHubContentForMemory(content: any): string {
    const timestamp = content.createdAt.toISOString().split("T")[0];

    if (content.type === "profile") {
      const metadata = content.metadata;
      const languages = metadata?.languages
        ? Object.entries(metadata.languages)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([lang, percentage]) => `${lang} (${percentage}%)`)
            .join(", ")
        : "No language data available";

      return `GitHub Profile for ${content.username} (${timestamp}): ${metadata?.name || content.username} (@${
        content.username
      }) is a developer on GitHub. ${metadata?.bio ? `Bio: "${metadata.bio}". ` : ""}Has ${
        metadata?.followers || 0
      } followers and maintains ${metadata?.public_repos || 0} public repositories. Primarily codes in ${languages}.`;
    } else {
      const metadata = content.metadata;
      return `GitHub Repository: ${metadata?.name || "Unknown"} is a ${metadata?.language || "multi-language"} project${
        metadata?.description ? ` that ${metadata.description.toLowerCase()}` : ""
      }. It has ${metadata?.stargazers_count || 0} stars and ${metadata?.forks_count || 0} forks.${
        metadata?.topics && metadata.topics.length > 0 ? ` Tagged with: ${metadata.topics.join(", ")}.` : ""
      } View at: ${metadata?.html_url || ""}`;
    }
  }

  /**
   * Format ProductHunt content for memory storage
   */
  private formatProductHuntContentForMemory(content: any): string {
    const metadata = content.metadata;
    const timestamp = content.postedAt.toISOString().split("T")[0];

    if (content.type === "profile") {
      return `ProductHunt profile (${timestamp}): ${content.content}`;
    } else if (content.type === "product") {
      if (metadata?.productType === "upvoted") {
        return `ProductHunt product upvoted (${timestamp}): ${metadata?.productName} - ${metadata?.tagline}. This product received ${metadata?.votesCount} votes. Platform: ${metadata?.platform}`;
      } else if (metadata?.productType === "hunted") {
        return `ProductHunt product hunted (${timestamp}): ${metadata?.productName} - ${metadata?.tagline}. Received ${metadata?.votesCount} votes and ${metadata?.commentsCount} comments. Platform: ${metadata?.platform}`;
      } else {
        return `ProductHunt product launched (${timestamp}): ${metadata?.productName} - ${metadata?.tagline}. Received ${metadata?.votesCount} votes and ${metadata?.commentsCount} comments. Platform: ${metadata?.platform}`;
      }
    } else if (content.type === "comment") {
      return `ProductHunt comment (${timestamp}): ${content.content}. Received ${metadata?.votes} votes.`;
    }

    return content.content;
  }

  /**
   * Format Threads content for memory storage
   */
  private formatThreadsContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const mediaInfo =
      content.media && content.media.length > 0 ? ` [Includes ${content.media.length} media item(s)]` : "";

    if (content.type === "post") {
      return `On ${timestamp}, ${content.username} posted on Threads: "${content.content}"${mediaInfo}`;
    } else {
      return `On ${timestamp}, ${content.username} replied on Threads: "${content.content}"${mediaInfo} [In response to post ${content.parentId}]`;
    }
  }

  /**
   * Format Gmail content for memory storage
   */
  private formatGmailContentForMemory(content: any): string {
    const timestamp = content.sentAt.toISOString().split("T")[0];
    const fromEmail = this.extractEmailAddress(content.from);
    const toEmail = this.extractEmailAddress(content.to);

    // Truncate content if too long
    const maxContentLength = 500;
    const contentText =
      content.content.length > maxContentLength
        ? content.content.substring(0, maxContentLength) + "..."
        : content.content;

    return `On ${timestamp}, email from ${fromEmail} to ${toEmail} with subject "${content.subject}": "${contentText}"`;
  }

  /**
   * Extract email address from a "Name <email@example.com>" format
   */
  private extractEmailAddress(emailString: string): string {
    const match = emailString.match(/<(.+?)>/);
    return match ? match[1] : emailString;
  }

  /**
   * Format Twitter content for memory storage
   */
  private formatTwitterContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const metadata = content.metadata;

    if (content.type === "profile") {
      return `Twitter Profile for @${content.username} (${timestamp}): ${metadata?.fullName || content.username}${
        metadata?.verified ? " ✓ (verified)" : ""
      }. ${metadata?.description ? `Bio: "${metadata.description}". ` : ""}Has ${
        metadata?.followersCount || 0
      } followers and follows ${metadata?.followingCount || 0} accounts. ${
        metadata?.tweetCount || 0
      } total tweets. Profile URL: ${metadata?.profileUrl || `https://x.com/${content.username}`}`;
    } else {
      const metrics = metadata?.public_metrics;
      const engagement = metrics
        ? ` (${metrics.like_count || 0} likes, ${metrics.retweet_count || 0} retweets, ${
            metrics.reply_count || 0
          } replies)`
        : "";

      return `On ${timestamp}, @${content.username} tweeted${engagement}: "${content.content}"`;
    }
  }
}
