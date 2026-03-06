import { Injectable, Logger } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { App } from "src/db/entities/app.entity";
import { SocialCredential } from "src/db/entities/social-credential.entity";
import { AppLink } from "src/db/entities/app-link.entity";
import { generateText } from "ai";
import { modelStringToLanguageModel } from "src/modules/common/utils";

interface GenerateAboutOptions {
  app?: string;
  force?: boolean;
}

@Injectable()
@Command({
  name: "generate-about",
  description: "Generate citation-backed about markdown for isMe apps",
})
export class GenerateAboutCommand extends CommandRunner {
  private readonly logger = new Logger(GenerateAboutCommand.name);

  constructor(
    @InjectRepository(App)
    private readonly appRepository: Repository<App>,
    @InjectRepository(SocialCredential)
    private readonly socialCredentialsRepository: Repository<SocialCredential>,
    @InjectRepository(AppLink)
    private readonly appLinksRepository: Repository<AppLink>,
  ) {
    super();
  }

  @Option({
    flags: "--app <app>",
    description: "App name or uniqueId to generate about for (omit to process all isMe apps)",
  })
  parseApp(val: string): string {
    return val;
  }

  @Option({
    flags: "--force",
    description: "Overwrite existing about content",
  })
  parseForce(): boolean {
    return true;
  }

  async run(passedParams: string[], options?: GenerateAboutOptions): Promise<void> {
    this.logger.log("Starting about generation...");

    try {
      if (options?.app) {
        await this.processOneApp(options.app, options.force ?? false);
      } else {
        await this.processAllApps(options?.force ?? false);
      }
      this.logger.log("About generation completed.");
    } catch (error) {
      this.logger.error("Error generating about:", error);
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

    await this.generateAboutForApp(app, force);
  }

  private async processAllApps(force: boolean): Promise<void> {
    const apps = await this.appRepository.find({ where: { isMe: true } });
    this.logger.log(`Found ${apps.length} isMe apps`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const app of apps) {
      try {
        const didProcess = await this.generateAboutForApp(app, force);
        if (didProcess) {
          processed++;
        } else {
          skipped++;
        }
        // Delay between apps to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        this.logger.error(`Failed for app ${app.id} (${app.name}): ${error.message}`);
        errors++;
      }
    }

    this.logger.log(`Done: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  }

  private async generateAboutForApp(app: App, force: boolean): Promise<boolean> {
    if (app.about && !force) {
      this.logger.log(`Skipping app ${app.id} (${app.name}) - already has about content`);
      return false;
    }

    this.logger.log(`Generating about for app ${app.id}: ${app.name}`);

    // Gather social credentials
    const credentials = await this.socialCredentialsRepository.find({
      where: { appId: app.id },
    });

    // Gather app links
    const links = await this.appLinksRepository.find({
      where: { appId: app.id },
    });

    // Build context for the LLM
    const socialContext = credentials
      .map((c) => `- ${c.type}: @${c.username}`)
      .join("\n");

    const linksContext = links
      .map((l) => {
        const title = l.metadata?.title || l.link;
        const description = l.metadata?.description || "";
        return `- ${title}: ${l.link}${description ? ` (${description})` : ""}`;
      })
      .join("\n");

    const prompt = `You are writing a professional, citation-backed profile summary (in Markdown) for a person's AI profile page.

**Person's display name:** ${app.displayName}
**Their description:** ${app.description || "Not provided"}

**Connected social accounts:**
${socialContext || "None"}

**Content links:**
${linksContext || "None"}

**Their personality/instruction:**
${app.instruction || "Not provided"}

Write a well-structured Markdown profile summary that:
1. Has a brief introductory paragraph about who this person is
2. Uses ## headings for sections like "Background", "Expertise", "Interests", "Online Presence"
3. Only states facts that can be reasonably inferred from the provided data
4. References sources naturally (e.g., "Based on their LinkedIn..." or "According to their GitHub...")
5. Is 200-400 words long
6. Feels professional yet personal
7. Does NOT make up facts or claims not supported by the provided data
8. Does NOT include the person's name as an H1 heading (it's already shown on the page)

If very little data is available, write a shorter but honest summary acknowledging limited information.`;

    const model = modelStringToLanguageModel("gpt-4o-mini");
    if (!model) {
      this.logger.error("Failed to initialize model");
      return false;
    }

    const { text } = await generateText({
      model,
      prompt,
    });

    await this.appRepository.update(app.id, { about: text });
    this.logger.log(`Updated about for app ${app.id} (${app.name})`);
    return true;
  }
}
