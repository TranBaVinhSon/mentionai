import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { App } from "src/db/entities/app.entity";
import { SocialContent, SocialContentSource } from "src/db/entities/social-content.entity";
import { generateObject } from "ai";
import { modelStringToLanguageModel } from "src/modules/common/utils";
import { z } from "zod";

interface GenerateKnowledgeGraphOptions {
  app?: string;
  force?: boolean;
}

const knowledgeGraphSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      type: z.enum(["person", "topic", "skill", "organization", "platform", "interest"]),
      weight: z.number().min(1).max(10),
    }),
  ).min(1).max(50),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string(),
    }),
  ),
});

@Injectable()
@Command({
  name: "generate-knowledge-graph",
  description: "Generate knowledge graph data for isMe apps",
})
export class GenerateKnowledgeGraphCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateKnowledgeGraphCommand.name);

  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    @InjectRepository(SocialContent)
    private readonly socialContentRepository: Repository<SocialContent>,
  ) {
    super();
  }

  @Option({
    flags: "--app <app>",
    description: "App name or uniqueId to generate graph for (omit to process all isMe apps)",
  })
  parseApp(val: string): string {
    return val;
  }

  @Option({
    flags: "--force",
    description: "Overwrite existing knowledge graph",
  })
  parseForce(): boolean {
    return true;
  }

  async run(passedParams: string[], options?: GenerateKnowledgeGraphOptions): Promise<void> {
    this.logger.log("Starting knowledge graph generation...");

    try {
      if (options?.app) {
        await this.processOneApp(options.app, options.force ?? false);
      } else {
        await this.processAllApps(options?.force ?? false);
      }
      this.logger.log("Knowledge graph generation completed.");
    } catch (error) {
      this.logger.error("Error generating knowledge graph:", error);
      throw error;
    }
  }

  private async processOneApp(nameOrId: string, force: boolean): Promise<void> {
    const app = await this.appRepository.findOne({
      where: [
        { name: nameOrId, isMe: true },
        { uniqueId: nameOrId, isMe: true },
      ],
    });

    if (!app) {
      this.logger.error(`App not found: ${nameOrId}`);
      return;
    }

    await this.generateGraphForApp(app, force);
  }

  private async processAllApps(force: boolean): Promise<void> {
    const apps = await this.appRepository.find({ where: { isMe: true } });
    this.logger.log(`Found ${apps.length} isMe apps`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const app of apps) {
      try {
        const didProcess = await this.generateGraphForApp(app, force);
        if (didProcess) {
          processed++;
        } else {
          skipped++;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed for app ${app.id} (${app.name}): ${error.message}`);
        errors++;
      }
    }

    this.logger.log(`Done: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  }

  private async generateGraphForApp(app: App, force: boolean): Promise<boolean> {
    if (app.knowledgeGraph && !force) {
      this.logger.log(`Skipping app ${app.id} (${app.name}) - already has knowledge graph`);
      return false;
    }

    this.logger.log(`Generating knowledge graph for app ${app.id}: ${app.name}`);

    // Gather top social content (excluding Gmail/emails)
    const socialContent = await this.socialContentRepository.find({
      where: {
        appId: app.id,
        source: Not(SocialContentSource.GMAIL),
      },
      order: { socialContentCreatedAt: { direction: "DESC", nulls: "LAST" } },
      take: 30,
      select: ["id", "source", "content", "type", "metadata"],
    });

    // Build content summary for the LLM
    const contentSummary = socialContent
      .map((c) => `[${c.source}/${c.type}] ${c.content.substring(0, 300)}`)
      .join("\n\n");

    const prompt = `You are extracting a knowledge graph from a person's digital profile and social content.

**Person:** ${app.displayName}
**Description:** ${app.description || "Not provided"}
**About:** ${app.about || "Not provided"}

**Recent social content (up to 30 items):**
${contentSummary || "No social content available"}

Extract a knowledge graph with the following rules:
1. Create 15-50 nodes representing key entities: the person themselves, topics they discuss, skills they have, organizations they're associated with, platforms they use, and their interests
2. The person node should always be the first node with id "person" and type "person"
3. Weight nodes from 1-10 based on how central they are to the person's identity (person node should be 10)
4. Create edges that show relationships between nodes (e.g., "works at", "interested in", "expert in", "posts about", "uses")
5. Keep node labels concise (1-3 words)
6. Only include entities that are clearly supported by the provided data
7. Ensure all edge source/target values reference valid node ids`;

    const model = modelStringToLanguageModel("gpt-4o-mini");
    if (!model) {
      this.logger.error("Failed to initialize model");
      return false;
    }

    const { object } = await generateObject({
      model,
      schema: knowledgeGraphSchema as any,
      prompt,
    }) as { object: z.infer<typeof knowledgeGraphSchema> };

    await this.appRepository.update(app.id, { knowledgeGraph: object });
    this.logger.log(`Updated knowledge graph for app ${app.id} (${app.name}) - ${object.nodes.length} nodes, ${object.edges.length} edges`);
    return true;
  }
}
