import { Command, CommandRunner, Option } from "nest-commander";
import { Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SocialContent, SocialContentSource, SocialContentType } from "../db/entities/social-content.entity";
import { MemoryService } from "../modules/memory/memory.service";

@Command({
  name: "reindex-linkedin-memories",
  description: "⚠️  DANGEROUS: Replace LinkedIn memories with correct citation links using delete+add approach",
})
export class ReindexLinkedInMemoriesCommand extends CommandRunner {
  private readonly logger = new Logger(ReindexLinkedInMemoriesCommand.name);

  constructor(
    @InjectRepository(SocialContent)
    private readonly socialContentRepository: Repository<SocialContent>,
    private readonly memoryService: MemoryService,
  ) {
    super();
  }

  async run(_passedParams: string[], options?: { userIds?: number[] }): Promise<void> {
    try {
      this.logger.warn("🚨 DANGEROUS: All LinkedIn memories will be DELETED and RE-INGESTED!");

      let userIds: number[] = [];
      if (options?.userIds && options.userIds.length > 0) {
        userIds = Array.from(new Set(options.userIds)).filter((id) => !isNaN(id));
        this.logger.log(`Using ${userIds.length} userId(s) provided via CLI option`);
      } else {
        this.logger.log("Getting users with LinkedIn content...");
        const rawResults = await this.socialContentRepository
          .createQueryBuilder("sc")
          .select(["app.userId"])
          .leftJoin("sc.app", "app")
          .where("sc.source = :source", { source: SocialContentSource.LINKEDIN })
          .andWhere("sc.type = :type", { type: SocialContentType.POST })
          .groupBy("app.userId")
          .getRawMany();

        userIds = rawResults.map((result) => parseInt(result.app_userId, 10)).filter((userId) => !isNaN(userId));
        this.logger.log(`Found ${userIds.length} users with LinkedIn content`);
      }

      let processedUsers = 0;
      let totalDeleted = 0;
      let totalIngested = 0;

      const concurrency = 4;
      for (let i = 0; i < userIds.length; i += concurrency) {
        const batch = userIds.slice(i, i + concurrency);
        this.logger.log(`Starting batch ${Math.floor(i / concurrency) + 1} with ${batch.length} users...`);
        const batchResults = await Promise.all(batch.map((userId) => this.processUser(userId)));
        processedUsers += batchResults.length;
        totalDeleted += batchResults.reduce((sum, r) => sum + r.deleted, 0);
        totalIngested += batchResults.reduce((sum, r) => sum + r.ingested, 0);
      }

      this.logger.log(
        `🎉 Completed! Processed ${processedUsers} users, deleted ${totalDeleted} app memories, ingested ${totalIngested} posts`,
      );
    } catch (error) {
      this.logger.error("❌ Command failed:", error.message);
      this.logger.error("Stack trace:", error.stack);
      throw error;
    }
  }

  @Option({
    flags: "-u, --user-ids <userIds>",
    description: "Comma-separated user IDs to reindex (e.g., 123,456)",
    name: "userIds",
  })
  parseUserIds(val: string): number[] {
    return Array.from(
      new Set(
        val
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => parseInt(s, 10))
          .filter((n) => !isNaN(n)),
      ),
    );
  }

  private async processUser(userId: number): Promise<{ deleted: number; ingested: number }> {
    this.logger.log(`Processing user ${userId}...`);

    let deletedForUser = 0;
    let ingestedForUser = 0;

    // Get all apps with LinkedIn content for this user
    const userApps = await this.socialContentRepository
      .createQueryBuilder("sc")
      .select("DISTINCT sc.appId", "appId")
      .leftJoin("sc.app", "app")
      .where("app.userId = :userId", { userId })
      .andWhere("sc.source = :source", { source: SocialContentSource.LINKEDIN })
      .getRawMany();

    for (const { appId } of userApps) {
      this.logger.log(`  Deleting LinkedIn memories for app ${appId}...`);

      // Delete ALL LinkedIn memories for this user's app
      await this.memoryService.deleteSocialMemories(userId, appId, "linkedin");
      deletedForUser++;

      this.logger.log(`  Re-ingesting LinkedIn posts for app ${appId}...`);

      // Get all LinkedIn posts for this app
      const linkedInPosts = await this.socialContentRepository.find({
        where: {
          appId,
          source: SocialContentSource.LINKEDIN,
          type: SocialContentType.POST,
        },
        order: { socialContentCreatedAt: "DESC" },
      });

      // Re-ingest posts in parallel batches to improve throughput
      const ingestionConcurrency = 6;
      for (let i = 0; i < linkedInPosts.length; i += ingestionConcurrency) {
        const batch = linkedInPosts.slice(i, i + ingestionConcurrency);
        await Promise.all(
          batch.map(async (post) => {
            const link = this.memoryService.generateLinkForContent(
              {
                type: "post",
                externalId: post.externalId,
                metadata: post.metadata,
              },
              "linkedin",
            );

            await this.memoryService.ingestSocialContent(
              userId,
              appId,
              post.externalId,
              post.content,
              "post",
              "linkedin",
              link,
              post.socialContentCreatedAt,
            );
          }),
        );
        ingestedForUser += batch.length;
      }

      this.logger.log(`  Re-ingested ${linkedInPosts.length} LinkedIn posts for app ${appId}`);
    }

    this.logger.log(`✅ User ${userId} completed`);

    return { deleted: deletedForUser, ingested: ingestedForUser };
  }
}
