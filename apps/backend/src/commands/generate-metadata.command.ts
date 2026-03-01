import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppLink } from "src/db/entities/app-link.entity";
import { LinkMetadataService } from "src/modules/apps/services/link-metadata.service";

@Injectable()
@Command({
  name: "generate-metadata",
  description: "Generate metadata for existing app links that don't have metadata",
})
export class GenerateMetadataCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateMetadataCommand.name);

  constructor(
    @InjectRepository(AppLink)
    private readonly appLinkRepository: Repository<AppLink>,
    private readonly linkMetadataService: LinkMetadataService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log("Starting metadata generation for existing app links...");

    try {
      const results = await this.processAppLinks();

      this.logger.log("Metadata generation completed successfully!");
      this.logger.log(`Total results: ${JSON.stringify(results)}`);
    } catch (error) {
      this.logger.error("Error generating metadata:", error);
      throw error;
    }
  }

  private async processAppLinks(): Promise<{
    appLinksProcessed: number;
    appLinksSkipped: number;
    appLinksErrors: number;
  }> {
    this.logger.log("Processing app links without metadata...");

    // First, get total count of links to process (those without metadata)
    const totalCount = await this.appLinkRepository.count({
      where: { metadata: null },
    });

    this.logger.log(`Found ${totalCount} app links without metadata`);

    if (totalCount === 0) {
      this.logger.log("No app links need metadata generation");
      return {
        appLinksProcessed: 0,
        appLinksSkipped: 0,
        appLinksErrors: 0,
      };
    }

    const batchSize = 2; // Ultra-reduced batch size for Heroku memory constraints
    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let errors = 0;

    while (offset < totalCount) {
      const links = await this.appLinkRepository.find({
        where: {
          metadata: null,
        },
        take: batchSize,
        skip: offset,
      });

      if (links.length === 0) {
        break;
      }

      this.logger.log(`Processing batch ${Math.floor(offset / batchSize) + 1} (${links.length} items)...`);

      // Process batch sequentially to avoid overwhelming target servers
      for (const link of links) {
        try {
          if (!link.link) {
            this.logger.log(`Skipping app link ${link.id} (no URL)`);
            totalSkipped++;
            continue;
          }

          this.logger.log(`Processing app link ${link.id}: ${link.link}`);

          // Extract metadata for the link
          const metadata = await this.linkMetadataService.extractMetadata(link.link);

          // Update the app link with metadata
          await this.appLinkRepository.update(link.id, { metadata });

          this.logger.log(`Successfully processed link ${link.id}: ${link.link}`);
          totalProcessed++;

          // Clear metadata reference to help with memory cleanup
          Object.keys(metadata).forEach((key) => delete metadata[key]);

          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }

          // Increased delay between requests to allow memory cleanup
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          this.logger.error(`Failed to process link ${link.id} (${link.link}): ${error.message}`);
          errors++;
        }
      }

      this.logger.log(
        `Progress: ${
          totalProcessed + totalSkipped + errors
        }/${totalCount} (${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors)`,
      );
      offset += batchSize;

      // Clear batch references and force garbage collection
      links.length = 0;
      if (global.gc) {
        global.gc();
      }

      // Increased delay between batches to allow memory cleanup
      if (offset < totalCount) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
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
}
