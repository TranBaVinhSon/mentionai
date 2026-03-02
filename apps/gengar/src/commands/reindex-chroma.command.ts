import { Command, CommandRunner, Option } from "nest-commander";
import { Injectable, Logger } from "@nestjs/common";
import { SocialContentRepository } from "src/db/repositories/social-content.repository";
import { AppLinkRepository } from "src/db/repositories/app-link.repository";
import { ChromaService } from "src/modules/chroma/chroma.service";
import { generateSocialContentDocId, generateAppLinkDocId } from "src/modules/common/utils";

interface ReindexOptions {
  appId?: number;
  batchSize?: number;
}

@Injectable()
@Command({
  name: "reindex-chroma",
  description: "Reindex social_contents and app_links from digital clone apps (isMe=true) into Chroma",
})
export class ReindexChromaCommand extends CommandRunner {
  private readonly logger = new Logger(ReindexChromaCommand.name);

  constructor(
    private readonly socialContentRepository: SocialContentRepository,
    private readonly appLinkRepository: AppLinkRepository,
    private readonly chromaService: ChromaService,
  ) {
    super();
  }

  @Option({ flags: "-a, --appId <number>", description: "Limit to one appId" })
  parseAppId(val: string): number {
    return Number(val);
  }

  @Option({ flags: "-b, --batch-size <n>", description: "Batch size (default 500)" })
  parseBatchSize(val: string): number {
    return Number(val);
  }

  async run(_: string[], options: ReindexOptions): Promise<void> {
    const batchSize = options.batchSize || 500;

    this.logger.log(
      `Starting Chroma reindex for digital clone apps (isMe=true). appId=${options.appId || "ALL"}, batch=${batchSize}`,
    );

    try {
      await this.chromaService.ensureCollection();

      // Social contents and app links in parallel
      await Promise.all([this.reindexSocialContents(batchSize, options), this.reindexAppLinks(batchSize, options)]);

      this.logger.log(`Chroma reindex completed`);
    } catch (error: any) {
      this.logger.error(`Reindex failed: ${error?.message || error}`, error?.stack || String(error));
      // Ensure commander surfaces non-zero exit status
      throw error;
    }
  }

  private async reindexSocialContents(batchSize: number, options: ReindexOptions) {
    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    const skippedAppIds = new Set<number>();

    while (true) {
      // Use query builder to filter by app.isMe = true
      const queryBuilder = this.socialContentRepository
        .createQueryBuilder("sc")
        .leftJoinAndSelect("sc.app", "app")
        .where("app.isMe = :isMe", { isMe: true })
        .orderBy("sc.id", "ASC")
        .skip(offset)
        .take(batchSize);

      if (options.appId) {
        queryBuilder.andWhere("sc.appId = :appId", { appId: options.appId });
      }

      const items = await queryBuilder.getMany();
      if (!items.length) break;

      const docs = [] as any[];
      for (const sc of items) {
        const text = sc.content || "";
        const docId = generateSocialContentDocId(sc.id);

        // Ensure required fields are present
        if (!sc.app?.userId || !sc.appId || !sc.source) {
          totalSkipped++;
          if (sc.appId) skippedAppIds.add(sc.appId);
          this.logger.warn(`Skipping social_content id=${sc.id}: App ${sc.appId} has no userId (orphaned app record)`);
          continue;
        }

        totalProcessed++;

        const metadata = {
          userId: sc.app.userId,
          appId: sc.appId,
          id: sc.id,
          source: sc.source,
          type: sc.type,
          externalId: sc.externalId,
          createdAt: (sc.socialContentCreatedAt || sc.createdAt)?.toISOString?.() || undefined,
          origin: "social_content",
        } as any;

        // Chunk long content using shared ChromaService chunking method
        const chunkedDocs = await this.chromaService.chunkDocument({
          id: docId,
          text,
          metadata,
        });

        docs.push(...chunkedDocs);
      }

      await this.chromaService.upsertDocuments(docs);

      this.logger.log(`Reindexed social_contents offset=${offset} count=${items.length}`);
      offset += items.length;
    }

    // Summary
    this.logger.log(
      `Social contents reindex complete: ${totalProcessed} indexed, ${totalSkipped} skipped${
        skippedAppIds.size > 0 ? ` (orphaned apps: ${Array.from(skippedAppIds).join(", ")})` : ""
      }`,
    );
  }

  private async reindexAppLinks(batchSize: number, options: ReindexOptions) {
    let offset = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    const skippedAppIds = new Set<number>();

    while (true) {
      // Use query builder to filter by app.isMe = true
      const queryBuilder = this.appLinkRepository
        .createQueryBuilder("al")
        .leftJoinAndSelect("al.app", "app")
        .where("app.isMe = :isMe", { isMe: true })
        .orderBy("al.id", "ASC")
        .skip(offset)
        .take(batchSize);

      if (options.appId) {
        queryBuilder.andWhere("al.appId = :appId", { appId: options.appId });
      }

      const items = await queryBuilder.getMany();
      if (!items.length) break;

      const docs = [] as any[];
      for (const al of items) {
        const text = al.content || "";
        const docId = generateAppLinkDocId(al.id);

        // Ensure required fields are present
        if (!al.app?.userId || !al.appId) {
          totalSkipped++;
          if (al.appId) skippedAppIds.add(al.appId);
          this.logger.warn(`Skipping app_link id=${al.id}: App ${al.appId} has no userId (orphaned app record)`);
          continue;
        }

        totalProcessed++;

        const metadata = {
          userId: al.app.userId,
          appId: al.appId,
          id: al.id,
          link: al.link,
          createdAt: al.createdAt?.toISOString?.() || undefined,
          origin: "app_link",
        } as any;

        // Chunk long content using shared ChromaService chunking method
        const chunkedDocs = await this.chromaService.chunkDocument({
          id: docId,
          text,
          metadata,
        });

        docs.push(...chunkedDocs);
      }

      await this.chromaService.upsertDocuments(docs);

      this.logger.log(`Reindexed app_links offset=${offset} count=${items.length}`);
      offset += items.length;
    }

    // Summary
    this.logger.log(
      `App links reindex complete: ${totalProcessed} indexed, ${totalSkipped} skipped${
        skippedAppIds.size > 0 ? ` (orphaned apps: ${Array.from(skippedAppIds).join(", ")})` : ""
      }`,
    );
  }
}
