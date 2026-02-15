import { Command, CommandRunner, Option } from "nest-commander";
import { AppsService } from "../modules/apps/apps.service";
import { GoodreadsService } from "../modules/apps/services/goodreads.service";
import { LinkedInService } from "../modules/apps/services/linkedin.service";
import { MediumService } from "../modules/apps/services/medium.service";
import { SocialCredentialsRepository } from "../db/repositories/social-credential.repository";
import { SocialNetworkType } from "../db/entities/social-credential.entity";
import { SocialContentRepository } from "../db/repositories/social-content.repository";
import { SocialContentSource } from "../db/entities/social-content.entity";
import { MemoryService } from "../modules/memory/memory.service";

interface SyncCommandOptions {
  userId: string;
  service: string;
  externalId: string;
}

@Command({
  name: "sync",
  description: "Sync data from external services for a specific user",
})
export class RefetchDataSyncCommand extends CommandRunner {
  constructor(
    private readonly appsService: AppsService,
    private readonly goodreadsService: GoodreadsService,
    private readonly linkedinService: LinkedInService,
    private readonly mediumService: MediumService,
    private readonly socialCredentialsRepository: SocialCredentialsRepository,
    private readonly socialContentRepository: SocialContentRepository,
    private readonly memoryService: MemoryService,
  ) {
    super();
  }

  async run(_passedParams: string[], options: SyncCommandOptions): Promise<void> {
    const { userId, service, externalId } = options;

    if (!userId || !service || !externalId) {
      console.error(
        "Missing required parameters. Usage: yarn command:run sync -u <userId> -s <service> -i <externalId>",
      );
      process.exit(1);
    }

    const supportedServices = ["linkedin", "medium", "goodreads"];
    if (!supportedServices.includes(service.toLowerCase())) {
      console.error(`Unsupported service: ${service}. Supported services: ${supportedServices.join(", ")}`);
      process.exit(1);
    }

    console.log(`Starting ${service} sync for user ${userId} with external ID ${externalId}`);

    try {
      await this.syncServiceData(parseInt(userId), service.toLowerCase(), externalId);
      console.log("Sync completed successfully");
    } catch (error) {
      console.error("Sync failed:", error.message);
      process.exit(1);
    }
  }

  private async syncServiceData(userId: number, service: string, externalId: string): Promise<void> {
    console.log(`Fetching ${service} data for user ${userId} with external ID ${externalId}`);

    // Map service names to SocialNetworkType enum values
    const serviceTypeMap: Record<string, SocialNetworkType> = {
      linkedin: SocialNetworkType.LINKEDIN,
      medium: SocialNetworkType.MEDIUM,
      goodreads: SocialNetworkType.GOODREADS,
    };

    // Map service names to SocialContentSource enum values
    const sourceMap: Record<string, SocialContentSource> = {
      linkedin: SocialContentSource.LINKEDIN,
      medium: SocialContentSource.MEDIUM,
      goodreads: SocialContentSource.GOODREADS,
    };

    const socialNetworkType = serviceTypeMap[service];
    const contentSource = sourceMap[service];

    if (!socialNetworkType || !contentSource) {
      throw new Error(`Unsupported service: ${service}`);
    }

    // Get the user's credentials for this service
    const credentials = await this.socialCredentialsRepository.findByUserAndType(userId, socialNetworkType);
    if (!credentials || !credentials.appId) {
      throw new Error(`${service} app not connected for this user`);
    }

    // For services that need external ID validation (like Goodreads RSS feed)
    if (service === "goodreads") {
      const isValidFeed = await this.goodreadsService.validateRssFeedUrl(externalId);
      if (!isValidFeed) {
        throw new Error("Invalid Goodreads RSS feed URL");
      }
    }

    // Update the username/external ID in credentials
    console.log(`Updating ${service} username to: ${externalId}`);
    await this.socialCredentialsRepository.update(credentials.id, {
      username: externalId,
    });

    // Delete all existing content and memories for this service
    console.log(`Deleting existing ${service} content...`);
    await this.socialContentRepository.delete({
      socialCredentialId: credentials.id,
      source: contentSource,
    });

    console.log(`Deleting existing ${service} memories...`);
    await this.memoryService.deleteSocialMemories(userId, credentials.appId, service);

    // Fetch content using the appropriate service
    let content: any[] = [];

    switch (service) {
      case "goodreads":
        content = await this.goodreadsService.fetchUserContent(userId, externalId, credentials.appId);
        break;
      case "linkedin":
        content = await this.linkedinService.fetchUserContent(userId, externalId, credentials.appId);
        break;
      case "medium":
        content = await this.mediumService.fetchUserContent(userId, externalId, credentials.appId);
        break;
      default:
        throw new Error(`Service ${service} not implemented`);
    }

    console.log(`Fetched ${content.length} items from ${service}`);
    // Save content to database and memory in parallel
    await Promise.all([
      // Save to database
      Promise.all(
        content.map((item) =>
          this.appsService.storeSocialContent(
            {
              source: item.source,
              content: item.content,
              type: item.type as any,
              externalId: item.externalId,
              appId: item.appId,
              socialContentCreatedAt: item.postedAt,
              metadata: item.metadata,
            },
            credentials.id,
          ),
        ),
      ),
      // Save to memory
      Promise.all(
        content.map(async (item) => {
          try {
            const formattedContent = this.memoryService.formatContentForMemory(item, service);
            const link = this.memoryService.generateLinkForContent(item, service, externalId);

            await this.memoryService.ingestSocialContent(
              userId,
              credentials.appId,
              item.externalId,
              formattedContent,
              item.type as any,
              service as any,
              link,
              item.postedAt,
            );
          } catch (error) {
            console.warn(`Failed to ingest ${service} item ${item.externalId} to memory: ${error.message}`);
            // Continue with other items
          }
        }),
      ),
    ]);

    console.log(`Successfully saved ${content.length} items to database and memory`);
  }

  @Option({
    flags: "-u, --user-id <userId>",
    description: "User ID",
  })
  parseUserId(val: string): string {
    return val;
  }

  @Option({
    flags: "-s, --service <service>",
    description: "Service name (linkedin, medium, goodreads)",
  })
  parseService(val: string): string {
    return val;
  }

  @Option({
    flags: "-i, --external-id <externalId>",
    description: "External service user ID or identifier",
  })
  parseExternalId(val: string): string {
    return val;
  }
}
