import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { App } from "src/db/entities/app.entity";
import { AppsService } from "src/modules/apps/apps.service";

@Injectable()
@Command({
  name: "update-suggested-questions",
  description: "Update suggested questions for all isMe apps based on their instructions and description",
})
export class UpdateSuggestedQuestionsCommand extends CommandRunner {
  private readonly logger = new Logger(UpdateSuggestedQuestionsCommand.name);

  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    private readonly appsService: AppsService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log("Starting suggested questions update for isMe apps...");

    try {
      const results = await this.processIsMeApps();

      this.logger.log("Suggested questions update completed successfully!");
      this.logger.log(`Total results: ${JSON.stringify(results)}`);
    } catch (error) {
      this.logger.error("Error updating suggested questions:", error);
      throw error;
    }
  }

  private async processIsMeApps(): Promise<{
    appsProcessed: number;
    appsSkipped: number;
    appsErrors: number;
  }> {
    this.logger.log("Finding all isMe apps...");

    // Get all apps where isMe is true
    const totalCount = await this.appRepository.count({
      where: { isMe: true },
    });

    this.logger.log(`Found ${totalCount} isMe apps`);

    if (totalCount === 0) {
      this.logger.log("No isMe apps found to update");
      return {
        appsProcessed: 0,
        appsSkipped: 0,
        appsErrors: 0,
      };
    }

    const batchSize = 5; // Process in small batches to avoid memory issues
    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let errors = 0;

    while (offset < totalCount) {
      const apps = await this.appRepository.find({
        where: { isMe: true },
        take: batchSize,
        skip: offset,
      });

      if (apps.length === 0) {
        break;
      }

      this.logger.log(`Processing batch ${Math.floor(offset / batchSize) + 1} (${apps.length} apps)...`);

      // Process batch sequentially
      for (const app of apps) {
        try {
          if (!app.instruction) {
            this.logger.log(`Skipping app ${app.id} (${app.name}) - no instruction`);
            totalSkipped++;
            continue;
          }

          // Skip if app already has suggested questions
          if (app.suggestedQuestionsConfig?.questions?.length > 0) {
            this.logger.log(`Skipping app ${app.id} (${app.name}) - already has suggested questions`);
            totalSkipped++;
            continue;
          }

          this.logger.log(`Processing app ${app.id}: ${app.name}`);

          // Generate suggested questions using the service method
          const { questions } = await this.appsService.generateSuggestedQuestionsFromInput(
            app.description || "",
            app.instruction,
            6, // Generate 6 questions as per the service method
          );

          // Update the app with new suggested questions
          await this.appRepository.update(app.id, {
            suggestedQuestionsConfig: { questions },
          });

          this.logger.log(`Successfully updated app ${app.id} with ${questions.length} questions`);
          totalProcessed++;

          // Add a small delay between processing
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Failed to process app ${app.id} (${app.name}): ${error.message}`);
          errors++;
        }
      }

      this.logger.log(
        `Progress: ${
          totalProcessed + totalSkipped + errors
        }/${totalCount} (${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors)`,
      );
      offset += batchSize;

      // Add delay between batches
      if (offset < totalCount) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.logger.log(
      `Completed processing isMe apps: ${totalProcessed} processed, ${totalSkipped} skipped, ${errors} errors`,
    );

    return {
      appsProcessed: totalProcessed,
      appsSkipped: totalSkipped,
      appsErrors: errors,
    };
  }
}
