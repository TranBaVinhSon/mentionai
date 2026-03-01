import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialContent } from "src/db/entities/social-content.entity";
import { AppLink } from "src/db/entities/app-link.entity";
import { EmbeddingsService } from "src/modules/embeddings/embeddings.service";

@Injectable()
@Command({
  name: "generate-embeddings",
  description: "Generate embeddings and full-text search vectors for existing social content and app links",
})
/**
 * Memory-optimized command for generating embeddings and search vectors.
 *
 * Optimizations include:
 * - Sequential processing instead of parallel to reduce memory footprint
 * - Smaller batch sizes (5 items per batch)
 * - Reduced concurrency (2 concurrent operations)
 * - Explicit memory cleanup and garbage collection between batches
 * - Immediate cleanup of embedding arrays after use
 * - Consistent ordering for better progress tracking
 *
 * These optimizations help prevent memory quota exceeded errors in production.
 */
export class GenerateEmbeddingsCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateEmbeddingsCommand.name);

  constructor(
    @InjectRepository(SocialContent)
    private readonly socialContentRepository: Repository<SocialContent>,
    @InjectRepository(AppLink)
    private readonly appLinkRepository: Repository<AppLink>,
    private readonly embeddingsService: EmbeddingsService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log("Starting embeddings and search vector generation for existing data...");

    try {
      // Process sequentially to reduce memory footprint
      this.logger.log("Processing social contents first...");
      const socialResults = await this.processSocialContents();

      // Force garbage collection between major operations
      if (global.gc) {
        global.gc();
      }

      this.logger.log("Processing app links...");
      const appLinkResults = await this.processAppLinks();

      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      // Update search vectors for any remaining content
      await this.updateSearchVectorsOnly();

      this.logger.log("Embeddings and search vector generation completed successfully!");
      this.logger.log(`Total results: ${JSON.stringify({ ...socialResults, ...appLinkResults })}`);
    } catch (error) {
      this.logger.error("Error generating embeddings:", error);
      throw error;
    }
  }

  private async processSocialContents(): Promise<{
    socialContentsProcessed: number;
    socialContentsSkipped: number;
    socialContentsErrors: number;
  }> {
    this.logger.log("Processing social contents...");

    // First, get total count of contents to process
    const totalCount = await this.socialContentRepository.count({
      where: { embedding: null },
    });

    this.logger.log(`Found ${totalCount} social contents without embeddings`);

    const batchSize = 2; // Ultra-reduced batch size for Heroku memory constraints

    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let errors = 0;

    while (offset < totalCount) {
      const contents = await this.socialContentRepository.find({
        where: { embedding: null },
        take: batchSize,
        skip: offset,
        relations: ["socialCredential"],
        order: { id: "ASC" }, // Consistent ordering for better progress tracking
      });

      if (contents.length === 0) {
        break;
      }

      this.logger.log(`Processing batch ${Math.floor(offset / batchSize) + 1} (${contents.length} items)...`);

      // Process batch in parallel with concurrency limit
      const batchPromises = contents.map(async (content) => {
        try {
          // Skip Goodreads content (stores JSON)
          if (content.source === "goodreads") {
            this.logger.log(`Skipping Goodreads content ${content.id} (JSON content)`);
            return { status: "skipped" };
          }

          // Skip if content is empty or null
          if (!content.content || content.content.trim().length === 0) {
            this.logger.log(`Skipping social content ${content.id} (empty content)`);
            return { status: "skipped" };
          }

          const textToEmbed = this.embeddingsService.prepareTextForEmbedding(content.content, content.metadata);

          this.logger.log(`Processing social content ${content.id} (${textToEmbed.length} chars)...`);

          const { embedding } = await this.embeddingsService.generateEmbeddingForLongText(textToEmbed);

          // Format embedding as PostgreSQL array string without quotes
          // Use streaming approach to avoid memory spikes
          let embeddingStr = "{";
          for (let i = 0; i < embedding.length; i++) {
            if (i > 0) embeddingStr += ",";
            embeddingStr += embedding[i].toFixed(10);
          }
          embeddingStr += "}";

          // Update the embedding and search vector
          await this.socialContentRepository.query(
            "UPDATE social_contents SET embedding = $1::float8[], \"searchVector\" = to_tsvector('simple', COALESCE($3, '')) WHERE id = $2",
            [embeddingStr, content.id, content.content],
          );

          // Clear embedding reference immediately after use
          embedding.length = 0;

          // Clear the string reference
          embeddingStr = null;

          return { status: "processed" };
        } catch (error) {
          this.logger.error(`Failed to process content ${content.id}: ${error.message}`);
          return { status: "error", error };
        }
      });

      // Process with reduced concurrency to limit memory usage
      const results = await this.processInBatches(batchPromises, 1);

      // Count results
      results.forEach((result) => {
        if (result.status === "processed") totalProcessed++;
        else if (result.status === "skipped") totalSkipped++;
        else if (result.status === "error") errors++;
      });

      this.logger.log(
        `Progress: ${
          totalProcessed + totalSkipped + errors
        }/${totalCount} (${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors)`,
      );

      // Clear references and force garbage collection after each batch
      contents.length = 0;
      if (global.gc) {
        global.gc();
      }

      offset += batchSize;
    }

    this.logger.log(
      `Completed processing social contents: ${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors`,
    );

    return {
      socialContentsProcessed: totalProcessed,
      socialContentsSkipped: totalSkipped,
      socialContentsErrors: errors,
    };
  }

  private async processInBatches<T>(promises: Promise<T>[], batchSize: number): Promise<T[]> {
    const results: T[] = [];
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);

      // Clear batch references to help with memory cleanup
      batch.length = 0;

      // Small delay between batches to avoid rate limiting and allow GC
      if (i + batchSize < promises.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
    }
    return results;
  }

  private async processAppLinks(): Promise<{
    appLinksProcessed: number;
    appLinksSkipped: number;
    appLinksErrors: number;
  }> {
    this.logger.log("Processing app links...");

    // First, get total count of links to process
    const totalCount = await this.appLinkRepository.count({
      where: { embedding: null },
    });

    this.logger.log(`Found ${totalCount} app links without embeddings`);

    const batchSize = 2; // Ultra-reduced batch size for Heroku memory constraints

    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let errors = 0;

    while (offset < totalCount) {
      const links = await this.appLinkRepository.find({
        where: {
          embedding: null,
        },
        take: batchSize,
        skip: offset,
        order: { id: "ASC" }, // Consistent ordering for better progress tracking
      });

      if (links.length === 0) {
        break;
      }

      this.logger.log(`Processing batch ${Math.floor(offset / batchSize) + 1} (${links.length} items)...`);

      // Process batch in parallel with concurrency limit
      const batchPromises = links.map(async (link) => {
        try {
          if (!link.content) {
            return { status: "skipped" };
          }

          this.logger.log(`Processing app link ${link.id}...`);

          const { embedding } = await this.embeddingsService.generateEmbeddingForLongText(link.content);

          // Format embedding as PostgreSQL array string without quotes
          // Use streaming approach to avoid memory spikes
          let embeddingStr = "{";
          for (let i = 0; i < embedding.length; i++) {
            if (i > 0) embeddingStr += ",";
            embeddingStr += embedding[i].toFixed(10);
          }
          embeddingStr += "}";

          // Update the embedding and search vector
          await this.appLinkRepository.query(
            "UPDATE app_links SET embedding = $1::float8[], \"searchVector\" = to_tsvector('simple', COALESCE($3, '')) WHERE id = $2",
            [embeddingStr, link.id, link.content],
          );

          // Clear embedding reference immediately after use
          embedding.length = 0;

          // Clear the string reference
          embeddingStr = null;

          return { status: "processed" };
        } catch (error) {
          this.logger.error(`Failed to process link ${link.id}: ${error.message}`);
          return { status: "error", error };
        }
      });

      // Process with reduced concurrency to limit memory usage
      const results = await this.processInBatches(batchPromises, 1);

      // Count results
      results.forEach((result) => {
        if (result.status === "processed") totalProcessed++;
        else if (result.status === "skipped") totalSkipped++;
        else if (result.status === "error") errors++;
      });

      this.logger.log(
        `Progress: ${
          totalProcessed + totalSkipped + errors
        }/${totalCount} (${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors)`,
      );

      // Clear references and force garbage collection after each batch
      links.length = 0;
      if (global.gc) {
        global.gc();
      }

      offset += batchSize;
    }

    this.logger.log(
      `Completed processing app links: ${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors`,
    );

    return {
      appLinksProcessed: totalProcessed,
      appLinksSkipped: totalSkipped,
      appLinksErrors: errors,
    };
  }

  private async updateSearchVectorsOnly(): Promise<void> {
    this.logger.log("Updating search vectors for any remaining content...");

    try {
      // Update search vectors in parallel for both social contents and app links
      const [socialContentsResult, appLinksResult] = await Promise.all([
        this.socialContentRepository.query(`
          UPDATE social_contents 
          SET "searchVector" = to_tsvector('simple', COALESCE(content, ''))
          WHERE "searchVector" IS NULL 
            AND content IS NOT NULL
            AND source != 'goodreads'
        `),
        this.appLinkRepository.query(`
          UPDATE app_links 
          SET "searchVector" = to_tsvector('simple', COALESCE(content, ''))
          WHERE "searchVector" IS NULL AND content IS NOT NULL
        `),
      ]);

      const socialContentsUpdated = socialContentsResult[1]; // affected rows count
      const appLinksUpdated = appLinksResult[1]; // affected rows count

      this.logger.log(
        `Updated search vectors for ${socialContentsUpdated} social contents and ${appLinksUpdated} app links`,
      );
    } catch (error) {
      this.logger.error("Error updating search vectors:", error);
      throw error;
    }
  }
}
