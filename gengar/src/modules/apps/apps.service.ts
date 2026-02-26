import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { App, AppCategory } from "src/db/entities/app.entity";
import { AppRepository } from "src/db/repositories/app.repository";
import { CreateAppDto } from "./dto/create-app.dto";
import { nanoid } from "nanoid";
import { UpdateAppDto } from "./dto/update-app.dto";
import { getAppLogo } from "../common/utils";
import { S3HandlerService } from "../s3-handler/s3-handler.service";
import { ThreadsService } from "./services/threads.service";
import { FacebookService } from "./services/facebook.service";
import { InstagramService } from "./services/instagram.service";
import { LinkedInService } from "./services/linkedin.service";
import { TwitterService } from "./services/twitter.service";
import { RedditService } from "./services/reddit.service";
import { SocialCredential, SocialNetworkType } from "src/db/entities/social-credential.entity";
import { In, Not } from "typeorm";
import { SocialCredentialsRepository } from "src/db/repositories/social-credential.repository";
import Exa from "exa-js";
import { MemoryService } from "../memory/memory.service";
import { PersonalityBuilderService } from "./services/personality-builder.service";
import pgvector from "pgvector";
import { AppLink } from "src/db/entities/app-link.entity";
import { SocialContent, SocialContentSource, SocialContentType } from "src/db/entities/social-content.entity";
import { AppLinkRepository } from "src/db/repositories/app-link.repository";
import { SocialContentRepository } from "src/db/repositories/social-content.repository";
import { AppResponseDto, PublicAppResponseDto } from "./dto/app-response.dto";
import { GmailService } from "./services/gmail.service";
import { MediumService } from "./services/medium.service";
import { GitHubService } from "./services/github.service";
import { GoodreadsService } from "./services/goodreads.service";
import { ProductHuntService } from "./services/producthunt.service";
import { SubstackService } from "./services/substack.service";
import { LinkMetadataService } from "./services/link-metadata.service";
import { YouTubeService } from "./services/youtube.service";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { ChromaService } from "../chroma/chroma.service";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { modelStringToLanguageModel } from "../common/utils";
import { UsersService } from "../users/users.service";
import { GengarSubscriptionPlan, FreePlanLimits } from "src/db/entities/user.entity";
import { SocialCredentialsDto } from "./dto/social-credentials.dto";
import { generateSocialContentDocId, generateAppLinkDocId } from "../common/utils";

// Interface for extended app response when isMe = true
interface AppWithDetails extends Omit<App, "appLinks" | "socialContents"> {
  logo: string;
  appLinks?: AppLink[];
  socialSources?: Pick<SocialCredential, "id" | "type" | "username" | "createdAt">[];
}

@Injectable()
export class AppsService {
  private readonly defaultLogo: string =
    "https://mentionai-static-assets.s3.ap-northeast-1.amazonaws.com/apps/default_logo.png";
  private readonly exa: Exa;
  private readonly logger = new Logger(AppsService.name);

  constructor(
    private readonly appRepository: AppRepository,
    private readonly s3HandlerService: S3HandlerService,
    private readonly threadsService: ThreadsService,
    private readonly facebookService: FacebookService,
    private readonly instagramService: InstagramService,
    private readonly linkedInService: LinkedInService,
    private readonly twitterService: TwitterService,
    private readonly redditService: RedditService,
    private readonly gmailService: GmailService,
    private readonly mediumService: MediumService,
    private readonly gitHubService: GitHubService,
    private readonly socialCredentialsRepository: SocialCredentialsRepository,
    private readonly memoryService: MemoryService,
    private readonly personalityBuilderService: PersonalityBuilderService,
    private readonly appLinkRepository: AppLinkRepository,
    private readonly socialContentRepository: SocialContentRepository,
    private readonly goodreadsService: GoodreadsService,
    private readonly productHuntService: ProductHuntService,
    private readonly substackService: SubstackService,
    private readonly linkMetadataService: LinkMetadataService,
    private readonly youtubeService: YouTubeService,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chromaService: ChromaService,
    private readonly usersService: UsersService,
  ) {
    this.exa = new Exa(process.env.EXA_API_KEY || "");
  }

  async getOfficialApps(category?: AppCategory): Promise<App[]> {
    // Get only official apps, excluding digital clones
    const apps = await this.appRepository.find({
      where: {
        isOfficial: true,
        isMe: false,
      },
    });

    if (category) {
      return apps.filter((app) => app.category === category);
    }

    apps.map((app) => {
      app.logo = getAppLogo(app.name);
    });

    return apps;
  }

  async getApps(userId: number): Promise<App[]> {
    // Get user's own apps and all digital clones
    const [userApps, digitalClones] = await Promise.all([
      this.appRepository.find({
        where: {
          isOfficial: false,
          userId: userId,
        },
      }),
      this.appRepository.find({
        where: {
          isMe: true,
          isPublished: true,
        },
      }),
    ]);

    // Combine user apps and digital clones
    const allApps = [...userApps, ...digitalClones];

    // Remove duplicates (in case user owns a digital clone)
    const uniqueApps = Array.from(new Map(allApps.map((app) => [app.uniqueId, app])).values());

    return Promise.all(
      uniqueApps.map(async (app) => ({
        ...app,
        logo: await this.getLogo(app),
      })),
    );
  }

  async getAppSocialContent(uniqueId: string, source: string, userId: number | null): Promise<SocialContent[]> {
    const app = await this.appRepository.findOne({
      where: {
        uniqueId: uniqueId,
        isMe: true, // Only allow for digital clone apps
      },
    });

    if (!app) {
      throw new NotFoundException("Digital clone app not found");
    }

    // Check access permissions
    const isOfficial = app?.isOfficial;
    const isOwner = app.userId === userId;
    const isPublicDigitalClone = app.isPublished && app.isMe;

    // Allow access if any of these conditions are true:
    // 1. App is official, OR
    // 2. User is the owner of the app (regardless of privacy mode), OR
    // 3. App is published and is a digital clone (public mode)
    if (!isOfficial && !isOwner && !isPublicDigitalClone) {
      throw new ForbiddenException("You cannot access this app");
    }

    // Validate source parameter
    const validSources = Object.values(SocialContentSource);
    if (!validSources.includes(source as SocialContentSource)) {
      throw new BadRequestException(`Invalid source. Valid sources are: ${validSources.join(", ")}`);
    }

    // Get social content for the specific source
    const socialContent = await this.socialContentRepository.find({
      where: {
        appId: app.id,
        source: source as SocialContentSource,
      },
      order: {
        createdAt: "DESC",
      },
    });

    return socialContent;
  }

  async getApp(uniqueId: string, userId: number): Promise<AppResponseDto | undefined> {
    const app = await this.appRepository.findOne({
      where: {
        uniqueId: uniqueId,
      },
    });
    if (!app) {
      throw new NotFoundException("App not found");
    }
    if (!app?.isOfficial && app.userId !== userId) {
      throw new ForbiddenException("You cannot access this app");
    }

    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include links and social sources
    if (app.isMe) {
      // Get app links
      const appLinks = await this.appLinkRepository.find({
        where: { appId: app.id },
        select: ["id", "link", "createdAt", "metadata"],
      });

      // Get social sources (without credentials)
      const socialCredentials = await this.socialCredentialsRepository.findByAppId(app.id);

      appWithDetails = {
        ...appWithDetails,
        appLinks,
        socialSources: socialCredentials,
      };
    }

    return appWithDetails;
  }

  async getPublicApp(uniqueId: string): Promise<PublicAppResponseDto> {
    const app = await this.appRepository.findOne({
      where: {
        uniqueId: uniqueId,
      },
      select: ["id", "name", "displayName", "uniqueId", "description", "userId", "logo"],
    });

    if (!app) {
      throw new NotFoundException("App not found");
    }

    const logo = await this.getLogo(app);

    return {
      id: app.id,
      name: app.name,
      displayName: app.displayName,
      logo: logo,
      uniqueId: app.uniqueId,
      description: app.description,
      userId: app.userId,
    };
  }

  async getSuggestedQuestions(uniqueId: string, userId: number) {
    const app = await this.appRepository.findOne({
      where: { uniqueId, userId, isOfficial: false },
      select: ["id", "name", "displayName", "description", "instruction", "suggestedQuestionsConfig"],
    });

    if (!app) {
      throw new NotFoundException("App not found or not authorized");
    }

    return app.suggestedQuestionsConfig;
  }

  async generateSuggestedQuestionsFromInput(
    description: string,
    instruction: string,
    numberOfQuestions: number,
  ): Promise<{ questions: string[] }> {
    const prompt = `You are helping to generate engaging conversation starter questions for a digital clone:

${description ? `Description: ${description}` : ""}

The digital clone's instruction/personality is:
${instruction}

Generate ${numberOfQuestions} interesting and engaging questions that users might want to ask this digital clone. The questions should:
1. Be relevant to the digital clone's personality and expertise
2. Encourage meaningful conversation
3. Be varied in topic and depth
4. Be open-ended to allow for detailed responses
5. Feel natural and conversational
6. Keep it short and concise
`;

    try {
      const model = modelStringToLanguageModel("gpt-4o-mini");

      // Create dynamic schema based on numberOfQuestions
      const questionsSchema = z.object({
        questions: z.array(z.string().max(200)).min(numberOfQuestions).max(numberOfQuestions),
      });

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-nocheck
      const { object } = await generateObject({
        model,
        schema: questionsSchema as any,
        prompt,
      });

      return { questions: object.questions };
    } catch (error) {
      this.logger.error(`Error generating suggested questions from input:`, error);
      throw error;
    }
  }

  async getAppById(id: number): Promise<AppResponseDto | null> {
    const app = await this.appRepository.findOne({
      where: { id },
    });
    if (!app) {
      return null;
    }
    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include links and social sources
    if (app.isMe) {
      // Get app links and social sources (without credentials) in parallel
      const [appLinks, socialCredentials] = await Promise.all([
        this.appLinkRepository.find({
          where: { appId: app.id },
          select: ["id", "link", "createdAt", "metadata"],
        }),
        this.socialCredentialsRepository.findByAppId(app.id),
      ]);

      appWithDetails = {
        ...appWithDetails,
        appLinks,
        socialSources: socialCredentials,
      };
    }

    return appWithDetails;
  }

  async findByUniqueId(uniqueId: string): Promise<App | null> {
    return this.appRepository.findOne({
      where: { uniqueId },
    });
  }

  public async getLogo(app: App): Promise<string> {
    let logo;
    if (!app?.isOfficial && app?.logo) {
      logo = await this.s3HandlerService.generateSignedUrl(app.logo);
    }

    if (app.isOfficial) {
      logo = getAppLogo(app.name);
    }

    if (!app.isOfficial && !app?.logo) {
      logo = this.defaultLogo;
    }

    return logo;
  }

  async storeCredentials(
    userId: number,
    appId: number,
    socialType: SocialNetworkType,
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): Promise<void> {
    try {
      // Store the credentials
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(userId, socialType);

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        existingCredentials.accessToken = accessToken;
        existingCredentials.refreshToken = refreshToken;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = socialType;
        newCredentials.username = username;
        newCredentials.accessToken = accessToken;
        newCredentials.refreshToken = refreshToken;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch user content based on social network type
      switch (socialType) {
        case SocialNetworkType.THREADS:
          // await this.threadsService.fetchUserContent(userId, appId);
          break;
        case SocialNetworkType.FACEBOOK:
          const facebookContent = await this.facebookService.fetchUserContent(userId, accessToken, username, appId);
          // Store Facebook content in database
          if (facebookContent && Array.isArray(facebookContent)) {
            await Promise.all(
              facebookContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.FACEBOOK,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.INSTAGRAM:
          const instagramContent = await this.instagramService.fetchUserContent(userId, accessToken, username, appId);
          // Store Instagram content in database
          if (instagramContent && Array.isArray(instagramContent)) {
            await Promise.all(
              instagramContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.INSTAGRAM,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.LINKEDIN:
          // LinkedIn is handled separately via storeLinkedInCredentialsAsync
          this.logger.log(`LinkedIn content fetching is handled by dedicated async method for user ${userId}`);
          break;
        case SocialNetworkType.GMAIL:
          const gmailContent = await this.gmailService.fetchUserContent(
            userId,
            accessToken,
            username,
            appId,
            refreshToken,
          );
          // Store Gmail content in database
          if (gmailContent && Array.isArray(gmailContent)) {
            await Promise.all(
              gmailContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GMAIL,
                    content: content.content,
                    type: "email" as any, // Gmail uses "email" type
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.sentAt,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.REDDIT:
          const redditContent = await this.redditService.fetchUserContent(userId, accessToken, username, appId);
          // Store Reddit content in database
          if (redditContent && Array.isArray(redditContent)) {
            await Promise.all(
              redditContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.REDDIT,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.MEDIUM:
          const mediumContent = await this.mediumService.fetchUserContent(userId, username, appId);
          // Store Medium content in database
          if (mediumContent && Array.isArray(mediumContent)) {
            await Promise.all(
              mediumContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.MEDIUM,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.GITHUB:
          const githubContent = await this.gitHubService.fetchUserContent(userId, accessToken, username, appId);
          // Store GitHub content in database
          if (githubContent && Array.isArray(githubContent)) {
            await Promise.all(
              githubContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GITHUB,
                    content: content.content,
                    type: content.type as any, // Use the actual type (profile or repository)
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.createdAt,
                    metadata: content.metadata, // Preserve metadata for UI visualization
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        case SocialNetworkType.GOODREADS:
          const goodreadsContent = await this.goodreadsService.fetchUserContent(userId, username, appId);
          // Store Goodreads content in database
          if (goodreadsContent && Array.isArray(goodreadsContent)) {
            await Promise.all(
              goodreadsContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GOODREADS,
                    content: content.content,
                    type: content.type as any,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                    metadata: content.metadata,
                  },
                  currentCredentials.id,
                );
              }),
            );
          }
          break;
        default:
          throw new Error(`Unsupported social network type: ${socialType}`);
      }
    } catch (error) {
      console.error(`Error storing credentials for ${socialType}:`, error);
      this.rollbar.error("Error storing social credentials", {
        socialType,
        userId,
        appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  async storeMediumCredentials(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Medium credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.MEDIUM,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.MEDIUM;
        newCredentials.username = username;
        // Medium doesn't need access tokens
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Medium content
      const mediumContent = await this.mediumService.fetchUserContent(userId, username, appId);

      // Store Medium content in database
      if (mediumContent && Array.isArray(mediumContent)) {
        await Promise.all(
          mediumContent.map(async (content) => {
            await this.upsertSocialContent(
              {
                source: SocialNetworkType.MEDIUM,
                content: content.content,
                type: content.type,
                externalId: content.externalId,
                appId: appId,
                socialContentCreatedAt: content.postedAt,
              },
              currentCredentials.id,
            );
          }),
        );
      }
    } catch (error) {
      console.error(`Error storing Medium credentials:`, error);
      this.rollbar.error("Error storing Medium credentials", {
        userId,
        appId,
        username,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  async storeSubstackCredentials(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Substack credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.SUBSTACK,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.SUBSTACK;
        newCredentials.username = username;
        // Substack doesn't need access tokens
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Substack content
      const substackContent = await this.substackService.fetchUserContent(userId, username, appId);

      // Store Substack content in database
      if (substackContent && Array.isArray(substackContent)) {
        await Promise.all(
          substackContent.map(async (content) => {
            await this.upsertSocialContent(
              {
                source: SocialNetworkType.SUBSTACK,
                content: content.content,
                type: content.type,
                externalId: content.externalId,
                appId: appId,
                socialContentCreatedAt: content.postedAt,
              },
              currentCredentials.id,
            );
          }),
        );
      }
    } catch (error) {
      console.error(`Error storing Substack credentials:`, error);
      this.rollbar.error("Error storing Substack credentials", {
        userId,
        appId,
        username,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  async storeLinkedInCredentials(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if LinkedIn credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.LINKEDIN,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.LINKEDIN;
        newCredentials.username = username;
        // LinkedIn doesn't need access tokens when using Proxycurl
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // LinkedIn content will be fetched asynchronously by fetchLinkedInContentAsync
    } catch (error) {
      console.error(`Error storing LinkedIn credentials:`, error);
      this.rollbar.error("Error storing LinkedIn credentials", {
        userId,
        appId,
        username,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get consistent redirect URI for OAuth flows
   * @param redirectUri Optional custom redirect URI
   * @returns The redirect URI to use
   */
  private getRedirectUri(redirectUri?: string): string {
    return (
      redirectUri ||
      process.env.FACEBOOK_REDIRECT_URI ||
      `${process.env.FRONTEND_URL || "http://localhost:4000"}/apps/connect`
    );
  }

  async exchangeCodeForTokens(
    socialType: SocialNetworkType,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    username?: string;
    profileId?: string;
  }> {
    try {
      let tokenResponse;

      // Use consistent redirect URI calculation
      const redirectUri = this.getRedirectUri();

      this.logger.log(`Exchanging code for ${socialType} tokens with redirect URI: ${redirectUri}`);
      this.logger.log(`Authorization code: ${code.substring(0, 50)}...`);

      switch (socialType) {
        case SocialNetworkType.FACEBOOK:
          tokenResponse = await this.facebookService.exchangeCodeForToken(code, redirectUri);
          break;
        case SocialNetworkType.INSTAGRAM:
          tokenResponse = await this.instagramService.exchangeCodeForToken(code, redirectUri);
          break;
        case SocialNetworkType.THREADS:
          tokenResponse = await this.threadsService.exchangeCodeForToken(code, redirectUri);
          break;
        case SocialNetworkType.LINKEDIN:
          // LinkedIn OAuth integration removed - using username-only approach
          throw new Error("LinkedIn OAuth integration has been removed. Please use username-only integration.");
          break;
        case SocialNetworkType.GMAIL:
          tokenResponse = await this.gmailService.exchangeCodeForToken(code);
          break;
        case SocialNetworkType.REDDIT:
          tokenResponse = await this.redditService.exchangeCodeForToken(code);
          break;
        case SocialNetworkType.GITHUB:
          tokenResponse = await this.gitHubService.exchangeCodeForToken(code, undefined, "apps");
          break;
        case SocialNetworkType.PRODUCTHUNT:
          tokenResponse = await this.productHuntService.exchangeCodeForToken(code, redirectUri);
          break;
        default:
          throw new Error(`Unsupported social network type: ${socialType}`);
      }

      console.log("tokenResponse", tokenResponse);

      return {
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken || "",
        expiresIn: tokenResponse.expiresIn,
        username: tokenResponse.username,
        profileId: tokenResponse.profileId,
      };
    } catch (error) {
      console.error(`Error exchanging code for tokens for ${socialType}:`, error);
      throw error;
    }
  }

  /**
   * Creates app entity immediately without async processing
   * This is step 1 in the new flow
   */
  async createAppImmediate(createAppDto: CreateAppDto, userId: number): Promise<AppResponseDto> {
    // Check if the user already has a digital version (isMe: true)
    if (createAppDto.isMe) {
      const existingDigitalVersion = await this.appRepository.findOne({
        where: {
          userId: userId,
          isMe: true,
        },
      });
      if (existingDigitalVersion) {
        throw new BadRequestException("You have already created your digital version.");
      }
    }

    // For published apps, check if name is already taken by another published app
    if (createAppDto.isPublished && createAppDto.isMe) {
      const existingPublishedApp = await this.appRepository.findOne({
        where: {
          name: createAppDto.name,
          isPublished: true,
          isMe: true,
        },
      });
      if (existingPublishedApp) {
        throw new BadRequestException(
          "This name is already taken by another published digital clone. Please choose another one.",
        );
      }
    }

    // Validate free plan limits for digital clone creation
    if (createAppDto.isMe) {
      const validationResult = await this.validateFreePlanLimits(
        userId,
        createAppDto.socialCredentials || [],
        createAppDto.links || [],
      );

      if (!validationResult.isValid) {
        throw new BadRequestException(`Free plan limitations: ${validationResult.errors.join(", ")}`);
      }
    }

    // Create basic app without processing social data
    const app = new App();
    app.name = createAppDto.name;
    app.uniqueId = nanoid(12);
    app.displayName = createAppDto.displayName;
    app.logo = createAppDto.logo;
    app.description = createAppDto.description;
    app.instruction = createAppDto.instruction;
    app.capabilities = createAppDto.capabilities;
    app.userId = userId;
    app.isMe = createAppDto.isMe;
    app.isPublished = createAppDto.isPublished || false;
    app.suggestedQuestionsConfig = createAppDto.suggestedQuestionsConfig || null;
    await this.appRepository.save(app, { reload: true });

    // Get the logo and prepare response
    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include expected social sources and links structure
    if (app.isMe) {
      // Convert social credentials to expected format for frontend
      const socialSources = createAppDto.socialCredentials
        ? createAppDto.socialCredentials.map((cred) => ({
            id: 0, // Temporary ID since it's not created yet
            type: cred.source,
            username: cred.username || "Connecting...",
            createdAt: new Date(),
          }))
        : [];

      // Convert links to expected format for frontend
      const appLinks = createAppDto.links
        ? createAppDto.links.map((link) => ({
            id: 0, // Temporary ID since it's not created yet
            link: link,
            content: null,
            embedding: null,
            searchVector: null,
            appId: app.id,
            app: app,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        : [];

      appWithDetails = {
        ...appWithDetails,
        appLinks,
        socialSources,
      };
    }

    return appWithDetails;
  }

  /**
   * Starts async processing for external data fetching (social/links)
   * This is step 2 in the new flow - fire and forget
   */
  processExternalDataAsync(createAppDto: CreateAppDto, userId: number, appId: number): void {
    const hasDataSources = createAppDto.socialCredentials?.length > 0 || createAppDto.links?.length > 0;

    // Process social credentials and links WITHOUT awaiting
    if (createAppDto.socialCredentials?.length > 0) {
      this.processSocialCredentialsAsync(createAppDto.socialCredentials, userId, appId);
    }

    if (createAppDto.links?.length > 0) {
      this.processAllLinksAsync(createAppDto.links, userId, appId);
    }

    // Build personality insights from ingested content if this is a "me" app
    if (createAppDto.isMe && !hasDataSources) {
      // Build basic personality if no external data sources
      this.buildPersonalityAsync(userId, appId, createAppDto.instruction);
    }
    // Note: If hasDataSources is true, personality will be rebuilt by the individual async functions
  }

  async createApp(createAppDto: CreateAppDto, userId: number): Promise<AppResponseDto> {
    // Check if the user already has a digital version (isMe: true)
    if (createAppDto.isMe) {
      const existingDigitalVersion = await this.appRepository.findOne({
        where: {
          userId: userId,
          isMe: true,
        },
      });
      if (existingDigitalVersion) {
        throw new BadRequestException("You have already created your digital version.");
      }
    }

    // For published apps, check if name is already taken by another published app
    if (createAppDto.isPublished && createAppDto.isMe) {
      const existingPublishedApp = await this.appRepository.findOne({
        where: {
          name: createAppDto.name,
          isPublished: true,
          isMe: true,
        },
      });
      if (existingPublishedApp) {
        throw new BadRequestException(
          "This name is already taken by another published digital clone. Please choose another one.",
        );
      }
    }

    // Validate free plan limits for digital clone creation
    if (createAppDto.isMe) {
      const validationResult = await this.validateFreePlanLimits(
        userId,
        createAppDto.socialCredentials || [],
        createAppDto.links || [],
      );

      if (!validationResult.isValid) {
        throw new BadRequestException(`Free plan limitations: ${validationResult.errors.join(", ")}`);
      }
    }

    // Check if instruction is missing for non-Me apps
    if (!createAppDto.isMe && !createAppDto.instruction) {
      throw new BadRequestException("Instruction is required for non-personal apps.");
    }

    const app = new App();
    app.name = createAppDto.name;
    app.uniqueId = nanoid(12);
    app.displayName = createAppDto.displayName;
    app.logo = createAppDto.logo;
    app.description = createAppDto.description;
    app.instruction = createAppDto.instruction;
    app.capabilities = createAppDto.capabilities;
    app.userId = userId;
    app.isMe = createAppDto.isMe;
    app.isPublished = createAppDto.isPublished || false;
    app.suggestedQuestionsConfig = createAppDto.suggestedQuestionsConfig || null;
    await this.appRepository.save(app, { reload: true });

    // Process social credentials and links concurrently WITHOUT awaiting
    // This allows them to run in the background
    this.processSocialCredentialsAsync(createAppDto.socialCredentials, userId, app.id);
    this.processAllLinksAsync(createAppDto.links, userId, app.id);

    // Build personality insights from ingested content if this is a "me" app
    // Run this asynchronously without blocking the response
    if (createAppDto.isMe) {
      this.buildPersonalityAsync(userId, app.id, app.instruction);
    }

    // Get the logo and prepare response
    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include links and social sources
    if (app.isMe) {
      // Get app links and social sources (without credentials) in parallel
      const [appLinks, socialCredentials] = await Promise.all([
        this.appLinkRepository.find({
          where: { appId: app.id },
          select: ["id", "link", "createdAt", "metadata"],
        }),
        this.socialCredentialsRepository.findByAppId(app.id),
      ]);

      appWithDetails = {
        ...appWithDetails,
        appLinks,
        socialSources: socialCredentials,
      };
    }

    return appWithDetails;
  }

  /**
   * Clean Twitter handle from URL format to just the handle
   * Handles formats like:
   * - https://x.com/username
   * - https://twitter.com/username
   * - x.com/username
   * - @username
   * - username
   */
  private cleanTwitterHandle(input: string): string {
    let cleaned = input.trim();

    // Remove @ symbol if present
    cleaned = cleaned.replace(/^@/, "");

    // Remove protocol
    cleaned = cleaned.replace(/^https?:\/\//i, "");

    // Remove www
    cleaned = cleaned.replace(/^www\./i, "");

    // Remove Twitter/X domain patterns
    // Matches: x.com/username, twitter.com/username, x.com/@username, twitter.com/@username
    cleaned = cleaned.replace(/^(.*\.)?(x\.com|twitter\.com)\/@?/i, "");

    // Remove trailing slashes and query parameters
    cleaned = cleaned.replace(/\/.*$/, "");
    cleaned = cleaned.replace(/\?.*$/, "");
    cleaned = cleaned.replace(/#.*$/, "");

    // Remove any remaining @ symbols
    cleaned = cleaned.replace(/@/g, "");

    return cleaned;
  }

  /**
   * Validate Twitter handle format
   * Twitter handles must be 1-15 characters, alphanumeric and underscores only
   * Cannot start with a number
   */
  private isValidTwitterHandleFormat(handle: string): boolean {
    // Twitter handles must be 1-15 characters, alphanumeric and underscores only
    // Cannot start with a number
    const twitterHandleRegex = /^[a-zA-Z_][a-zA-Z0-9_]{0,14}$/;
    return twitterHandleRegex.test(handle);
  }

  async validateSocialHandle(
    platform: "linkedin" | "twitter",
    username: string,
  ): Promise<{
    valid: boolean;
    profileSummary?: { name: string; headline?: string; avatar?: string; bio?: string };
    error?: string;
  }> {
    if (platform === "linkedin") {
      return await this.linkedInService.validateUsername(username);
    } else if (platform === "twitter") {
      // Clean the username first to extract handle from URL if needed
      const cleanedUsername = this.cleanTwitterHandle(username);

      // Validate format before making API call
      if (!this.isValidTwitterHandleFormat(cleanedUsername)) {
        return {
          valid: false,
          error:
            "Invalid Twitter handle format. Handles must be 1-15 characters, alphanumeric and underscores only, and cannot start with a number. Please enter just the handle (e.g., 'johndoe') not the full URL.",
        };
      }

      return await this.twitterService.validateUsername(cleanedUsername);
    }
    throw new BadRequestException(`Unsupported platform: ${platform}`);
  }

  async processLinks(links: string[]): Promise<string[]> {
    const contents = await this.exa.getContents(links, { text: true });
    this.logger.log(`contents`, JSON.stringify(contents, null, 2));
    return contents.results.map((content) => content.text);
  }

  async deleteApp(uniqueId: string, userId: number): Promise<void> {
    const app = await this.appRepository.findOne({
      where: { uniqueId, userId, isOfficial: false },
    });
    if (!app) {
      throw new NotFoundException("App not found or not authorized");
    }

    // Use a transaction to ensure all database deletions are atomic
    await this.appRepository.manager.transaction(async (transactionalEntityManager) => {
      try {
        // Delete in the correct order to avoid foreign key constraint issues

        // 1. Delete all social content associated with the app
        await transactionalEntityManager.delete(SocialContent, {
          appId: app.id,
        });
        this.logger.log(`Deleted social content for app ${app.id}`);

        // 2. Delete all social credentials associated with the app
        const socialCredentials = await transactionalEntityManager.find(SocialCredential, {
          where: { appId: app.id },
          select: ["id"],
        });
        if (socialCredentials && socialCredentials.length > 0) {
          const credentialIds = socialCredentials.map((cred) => cred.id);
          await transactionalEntityManager.delete(SocialCredential, credentialIds);
          this.logger.log(`Deleted ${socialCredentials.length} social credentials for app ${app.id}`);
        }

        // 3. Delete all app links associated with the app
        await transactionalEntityManager.delete(AppLink, { appId: app.id });
        this.logger.log(`Deleted app links for app ${app.id}`);

        // 4. Finally, delete the app itself
        await transactionalEntityManager.delete(App, app.id);
        this.logger.log(`Successfully deleted app ${app.id} from database`);

        // 5. Delete memories from mem0 (external service - outside transaction)
        // This is done after the transaction commits successfully
        try {
          await this.memoryService.deleteAppMemories(userId, app.id);
          this.logger.log(`Deleted memories from mem0 for app ${app.id}`);
        } catch (memoryError) {
          // Log the error but don't fail the entire operation since database deletion succeeded
          this.logger.error(
            `Failed to delete memories from mem0 for app ${app.id}, but database deletion succeeded:`,
            memoryError,
          );
          this.rollbar.error("Failed to delete memories during app deletion", {
            appId: app.id,
            userId,
            error: memoryError.message || String(memoryError),
            stack: memoryError.stack,
          });
          // Optionally, you could implement a cleanup job to retry mem0 deletion later
        }
        // Delete from Chroma as well (outside DB transaction)
        try {
          await this.chromaService.deleteByApp(app.id);
          this.logger.log(`Deleted Chroma vectors for app ${app.id}`);
        } catch (chromaError) {
          this.logger.error(
            `Failed to delete Chroma vectors for app ${app.id}, but database deletion succeeded:`,
            chromaError,
          );
          this.rollbar.error("Failed to delete Chroma vectors during app deletion", {
            appId: app.id,
            userId,
            error: chromaError.message || String(chromaError),
            stack: chromaError.stack,
          });
        }
      } catch (error) {
        this.logger.error(`Error deleting app ${app.id} and related data:`, error);
        this.rollbar.error("Error deleting app and related data", {
          appId: app.id,
          userId,
          error: error.message || String(error),
          stack: error.stack,
        });
        throw new BadRequestException(`Failed to delete app: ${error.message}`);
      }
    });

    this.logger.log(`Successfully completed deletion of app ${app.id} and all related data`);
  }

  /**
   * Updates app entity immediately without async processing
   * This is step 1 in the new flow for updates
   */
  async updateAppImmediate(uniqueId: string, updateAppDto: UpdateAppDto, userId: number): Promise<AppResponseDto> {
    // Log the incoming DTO for debugging
    this.logger.log(`Updating app ${uniqueId} with DTO:`, JSON.stringify(updateAppDto, null, 2));

    const app = await this.appRepository.findOne({
      where: { uniqueId, userId, isOfficial: false },
    });
    if (!app) {
      throw new NotFoundException("App not found or not authorized");
    }

    // Check if app is being published and name conflicts with existing published apps
    if (updateAppDto.isPublished && app.isMe && updateAppDto.name && updateAppDto.name !== app.name) {
      const existingPublishedApp = await this.appRepository.findOne({
        where: {
          name: updateAppDto.name,
          isPublished: true,
          isMe: true,
        },
      });
      if (existingPublishedApp) {
        throw new BadRequestException(
          "This name is already taken by another published digital clone. Please choose another one.",
        );
      }
    }

    // Use transaction to ensure all database operations are atomic
    await this.appRepository.manager.transaction(async (transactionalEntityManager) => {
      // Update basic app properties
      const { socialCredentials, links, removeSocialCredentialIds, removeAppLinkIds, ...basicUpdateData } =
        updateAppDto;
      Object.assign(app, basicUpdateData);
      await transactionalEntityManager.save(app);

      // Handle social credentials removal (sync database operations only)
      if (removeSocialCredentialIds && removeSocialCredentialIds.length > 0) {
        this.logger.log(
          `Attempting to remove social credentials with IDs: ${JSON.stringify(removeSocialCredentialIds)}`,
        );

        const validIds = removeSocialCredentialIds.filter((id) => typeof id === "number");
        this.logger.log(`Valid credential IDs to remove: ${JSON.stringify(validIds)}`);

        // Delete social content associated with these credentials
        const deletedContent = await transactionalEntityManager.delete(SocialContent, {
          socialCredentialId: In(validIds),
        });
        this.logger.log(`Deleted ${deletedContent.affected} social content entries`);

        // Delete the social credentials
        const deletedCredentials = await transactionalEntityManager.delete(SocialCredential, {
          id: In(validIds),
          appId: app.id,
        });
        this.logger.log(`Deleted ${deletedCredentials.affected} social credentials`);
      } else {
        this.logger.log(`No social credentials to remove`);
      }

      // Handle app links removal (sync database operations only)
      if (removeAppLinkIds && removeAppLinkIds.length > 0) {
        const validLinkIds = removeAppLinkIds.filter((id) => typeof id === "number");

        this.logger.log(`Attempting to remove app links with IDs: ${JSON.stringify(validLinkIds)}`);

        // Delete the app links
        const deletedLinks = await transactionalEntityManager.delete(AppLink, {
          id: In(validLinkIds),
          appId: app.id,
        });
        this.logger.log(`Deleted ${deletedLinks.affected} app links`);
      }
    });

    // Get the logo and prepare response
    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include links and social sources
    if (app.isMe) {
      // Get current app links and social sources (without credentials) in parallel
      const [existingAppLinks, existingSocialCredentials] = await Promise.all([
        this.appLinkRepository.find({
          where: { appId: app.id },
          select: ["id", "link", "createdAt", "metadata"],
        }),
        this.socialCredentialsRepository.findByAppId(app.id),
      ]);

      // Include new social credentials that are being added
      const newSocialSources = updateAppDto.socialCredentials
        ? updateAppDto.socialCredentials.map((cred) => ({
            id: 0, // Temporary ID since it's not created yet
            type: cred.source,
            username: cred.username || "Connecting...",
            createdAt: new Date(),
          }))
        : [];

      // Include new links that are being added
      const newAppLinks = updateAppDto.links
        ? updateAppDto.links.map((link) => ({
            id: 0, // Temporary ID since it's not created yet
            link: link,
            content: null,
            embedding: null,
            searchVector: null,
            appId: app.id,
            app: app,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
        : [];

      // Filter out removed items from existing data
      const filteredExistingCredentials = existingSocialCredentials.filter(
        (cred) => !(updateAppDto.removeSocialCredentialIds || []).includes(cred.id),
      );
      const filteredExistingLinks = existingAppLinks.filter(
        (link) => !(updateAppDto.removeAppLinkIds || []).includes(link.id),
      );

      appWithDetails = {
        ...appWithDetails,
        appLinks: [...filteredExistingLinks, ...newAppLinks],
        socialSources: [...filteredExistingCredentials, ...newSocialSources],
      };
    }

    return appWithDetails;
  }

  /**
   * Starts async processing for external data operations (social/links/deletions)
   * This is step 2 in the new flow for updates - fire and forget
   */
  processUpdateDataAsync(uniqueId: string, updateAppDto: UpdateAppDto, userId: number, appId: number): void {
    const hasDataChanges =
      updateAppDto.removeSocialCredentialIds?.length > 0 ||
      updateAppDto.removeAppLinkIds?.length > 0 ||
      updateAppDto.socialCredentials?.length > 0 ||
      updateAppDto.links?.length > 0;

    // Process deletions asynchronously (memory cleanup)
    if (updateAppDto.removeSocialCredentialIds?.length > 0 || updateAppDto.removeAppLinkIds?.length > 0) {
      this.processAsyncDeletions(
        userId,
        appId,
        updateAppDto.removeSocialCredentialIds,
        updateAppDto.removeAppLinkIds || [],
      );
    }

    // Process new social credentials and links
    if (updateAppDto.socialCredentials?.length > 0) {
      this.processSocialCredentialsAsync(updateAppDto.socialCredentials, userId, appId);
    }

    if (updateAppDto.links?.length > 0) {
      this.processAllLinksAsync(updateAppDto.links, userId, appId);
    }

    // Note: Personality will be rebuilt by individual async functions after processing data sources
  }

  /**
   * Process async deletions for memory cleanup
   */
  private async processAsyncDeletions(
    userId: number,
    appId: number,
    removedSocialIds: number[],
    removedLinkIds: number[],
  ): Promise<void> {
    try {
      const deletionPromises: Promise<void>[] = [];

      // Get the credentials that were removed for memory cleanup
      if (removedSocialIds.length > 0) {
        const credentialsToRemove = await this.socialCredentialsRepository.find({
          where: {
            id: In(removedSocialIds),
          },
        });

        if (credentialsToRemove.length > 0) {
          deletionPromises.push(this.deleteSocialCredentialsAsync(userId, appId, credentialsToRemove));
        }
      }

      // Get the links that were removed for memory cleanup

      if (removedLinkIds.length > 0) {
        const linksToRemove = await this.appLinkRepository.find({
          where: {
            id: In(removedLinkIds),
          },
        });

        if (linksToRemove.length > 0) {
          deletionPromises.push(this.deleteAppLinksAsync(userId, appId, linksToRemove));
        }
      }

      // Wait for all deletions to complete before rebuilding personality
      if (deletionPromises.length > 0) {
        await Promise.all(deletionPromises);

        // Rebuild personality and instruction after deletions are complete
        await this.rebuildPersonalityAndUpdateInstructionAsync(userId, appId);
      }
    } catch (error) {
      this.logger.error(`Error in async deletion processing:`, error);
      this.rollbar.error("Error in async deletion processing", {
        userId,
        appId,
        error: error.message || String(error),
        stack: error.stack,
      });
    }
  }

  async updateApp(uniqueId: string, updateAppDto: UpdateAppDto, userId: number): Promise<AppResponseDto> {
    // Log the incoming DTO for debugging
    this.logger.log(`Updating app ${uniqueId} with DTO:`, JSON.stringify(updateAppDto, null, 2));

    const app = await this.appRepository.findOne({
      where: { uniqueId, userId, isOfficial: false },
    });
    if (!app) {
      throw new NotFoundException("App not found or not authorized");
    }

    // Check if app is being published and name conflicts with existing published apps
    if (updateAppDto.isPublished && app.isMe && updateAppDto.name && updateAppDto.name !== app.name) {
      const existingPublishedApp = await this.appRepository.findOne({
        where: {
          name: updateAppDto.name,
          isPublished: true,
          isMe: true,
        },
      });
      if (existingPublishedApp) {
        throw new BadRequestException(
          "This name is already taken by another published digital clone. Please choose another one.",
        );
      }
    }

    // Validate free plan limits for digital clone updates
    if (app.isMe && (updateAppDto.socialCredentials || updateAppDto.links)) {
      // Calculate net new items (additions minus removals)
      const newSocialCredentials = updateAppDto.socialCredentials || [];
      const newLinks = updateAppDto.links || [];

      // For update operations, we need to consider the net change
      // Get current counts and subtract what's being removed
      const currentApp = await this.appRepository.findOne({
        where: { id: app.id },
        relations: ["appLinks"],
      });

      const currentSocialCredentials = await this.socialCredentialsRepository.findByAppId(app.id);
      const currentLinksCount = currentApp?.appLinks?.length || 0;
      const currentSocialCount = currentSocialCredentials.length;

      // Calculate net changes
      const socialRemovalCount = updateAppDto.removeSocialCredentialIds?.length || 0;
      const linkRemovalCount = updateAppDto.removeAppLinkIds?.length || 0;

      const netSocialChange = newSocialCredentials.length - socialRemovalCount;
      const netLinkChange = newLinks.length - linkRemovalCount;

      // Only validate if we're adding new items
      if (netSocialChange > 0 || netLinkChange > 0) {
        const validationResult = await this.validateFreePlanLimits(
          userId,
          netSocialChange > 0 ? newSocialCredentials : [],
          netLinkChange > 0 ? newLinks : [],
        );

        if (!validationResult.isValid) {
          throw new BadRequestException(`Free plan limitations: ${validationResult.errors.join(", ")}`);
        }
      }
    }

    // Use transaction to ensure all operations are atomic
    await this.appRepository.manager.transaction(async (transactionalEntityManager) => {
      // Update basic app properties
      const { socialCredentials, links, removeSocialCredentialIds, removeAppLinkIds, ...basicUpdateData } =
        updateAppDto;
      Object.assign(app, basicUpdateData);
      await transactionalEntityManager.save(app);

      // Handle social credentials removal
      if (removeSocialCredentialIds && removeSocialCredentialIds.length > 0) {
        this.logger.log(
          `Attempting to remove social credentials with IDs: ${JSON.stringify(removeSocialCredentialIds)}`,
        );

        const validIds = removeSocialCredentialIds.filter((id) => typeof id === "number");
        this.logger.log(`Valid credential IDs to remove: ${JSON.stringify(validIds)}`);

        // Get the credentials to remove for memory cleanup
        const credentialsToRemove = await transactionalEntityManager.find(SocialCredential, {
          where: {
            id: In(validIds),
            appId: app.id,
          },
        });

        this.logger.log(`Found ${credentialsToRemove.length} credentials to remove for app ${app.id}`);
        credentialsToRemove.forEach((cred) => {
          this.logger.log(`Removing credential: ID=${cred.id}, Type=${cred.type}, Username=${cred.username}`);
        });

        // Delete social content associated with these credentials
        const deletedContent = await transactionalEntityManager.delete(SocialContent, {
          socialCredentialId: In(validIds),
        });
        this.logger.log(`Deleted ${deletedContent.affected} social content entries`);

        // Delete the social credentials
        const deletedCredentials = await transactionalEntityManager.delete(SocialCredential, {
          id: In(validIds),
          appId: app.id,
        });
        this.logger.log(`Deleted ${deletedCredentials.affected} social credentials`);

        // Delete memories asynchronously (fire-and-forget)
        this.deleteSocialCredentialsAsync(userId, app.id, credentialsToRemove);
      } else {
        this.logger.log(`No social credentials to remove`);
      }

      // Handle app links removal
      if (removeAppLinkIds && removeAppLinkIds.length > 0) {
        const validLinkIds = removeAppLinkIds.filter((id) => typeof id === "number");

        // Get the links to remove for memory cleanup
        const linksToRemove = await transactionalEntityManager.find(AppLink, {
          where: {
            id: In(validLinkIds),
            appId: app.id,
          },
        });

        // Delete the app links
        await transactionalEntityManager.delete(AppLink, {
          id: In(validLinkIds),
          appId: app.id,
        });

        // Delete memories asynchronously (fire-and-forget)
        this.deleteAppLinksAsync(userId, app.id, linksToRemove);
      }

      // Handle new social credentials (async processing)
      if (socialCredentials && socialCredentials.length > 0) {
        this.processSocialCredentialsAsync(socialCredentials, userId, app.id);
      }

      // Handle new links (async processing)
      if (links && links.length > 0) {
        this.processLinksAsync(links, userId, app.id);
      }
    });

    // Get the logo and prepare response
    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // If this is a "me" app, include links and social sources
    if (app.isMe) {
      // Get app links and social sources (without credentials) in parallel
      const [appLinks, socialCredentials] = await Promise.all([
        this.appLinkRepository.find({
          where: { appId: app.id },
          select: ["id", "link", "createdAt", "metadata"],
        }),
        this.socialCredentialsRepository.findByAppId(app.id),
      ]);

      appWithDetails = {
        ...appWithDetails,
        appLinks,
        socialSources: socialCredentials,
      };
    }

    return appWithDetails;
  }

  /**
   * Fetches and stores social content for a specific user, app, and social network type
   * @param userId The user ID
   * @param appId The app ID
   * @param socialType The social network type
   * @returns The fetched content or an error message
   */
  async fetchAndStoreSocialContent(userId: number, appId: number, socialType: SocialNetworkType) {
    try {
      // Verify credentials exist
      const credentials = await this.socialCredentialsRepository.findByUserAndType(userId, socialType);

      if (!credentials || !credentials.accessToken) {
        throw new Error(`No valid ${socialType} credentials found for user`);
      }

      // Fetch content based on social network type
      switch (socialType) {
        case SocialNetworkType.THREADS:
          // return await this.threadsService.fetchUserContent(userId, appId);
          break;

        case SocialNetworkType.FACEBOOK:
          return await this.facebookService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );

        case SocialNetworkType.INSTAGRAM:
          return await this.instagramService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );

        case SocialNetworkType.LINKEDIN:
          // LinkedIn content is handled by dedicated fetchLinkedInContentAsync method
          throw new Error(
            "LinkedIn content fetching should use the dedicated async method. Please use the LinkedIn credential flow instead.",
          );

        case SocialNetworkType.GMAIL:
          return await this.gmailService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
            credentials.refreshToken,
          );

        case SocialNetworkType.REDDIT:
          return await this.redditService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );

        case SocialNetworkType.GITHUB:
          return await this.gitHubService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );

        case SocialNetworkType.GOODREADS:
          return await this.goodreadsService.fetchUserContent(userId, credentials.username, appId);

        default:
          throw new Error(`Unsupported social network type: ${socialType}`);
      }
    } catch (error) {
      console.error(error);
      this.rollbar.error("Error fetching social content", {
        socialType,
        userId,
        appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Builds personality insights asynchronously without blocking the response
   * @param userId The user ID
   * @param appId The app ID
   * @param originalInstruction The original app instruction
   */
  private async buildPersonalityAsync(userId: number, appId: number, originalInstruction: string): Promise<void> {
    try {
      // Wait a moment for content to be fully ingested
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.logger.log(`Building personality insights for app ${appId}`);
      const personalityInsights = await this.personalityBuilderService.buildPersonalityFromContent(userId, appId);

      // Enhance the app instruction with personality insights
      if (originalInstruction) {
        const enhancedInstruction = await this.personalityBuilderService.generatePersonalityEnhancedInstruction(
          originalInstruction,
          personalityInsights,
        );

        // Update the app with enhanced instruction
        await this.appRepository.update(appId, {
          instruction: enhancedInstruction,
        });

        this.logger.log(`Enhanced instruction with personality insights for app ${appId}`);
      }
    } catch (error) {
      this.logger.error(`Error building personality for app ${appId}:`, error);
      this.rollbar.error("Error building personality for app", {
        appId,
        userId,
        error: error.message || String(error),
        stack: error.stack,
      });
      // Continue even if personality building fails
    }
  }

  /**
   * Get OAuth URL for a specific social network
   * @param network The social network type
   * @param redirectUri Optional custom redirect URI
   */
  async getOAuthUrl(network: string, redirectUri?: string): Promise<{ url: string }> {
    // Use consistent redirect URI calculation
    const finalRedirectUri = this.getRedirectUri(redirectUri);

    this.logger.log(`Generating OAuth URL for ${network} with redirect URI: ${finalRedirectUri}`);

    switch (network.toLowerCase()) {
      case "facebook":
        return { url: this.facebookService.generateOAuthUrl(finalRedirectUri) };

      case "gmail":
        return { url: this.gmailService.generateAuthUrl() };

      case "linkedin":
        // LinkedIn OAuth integration removed - return error
        throw new Error("LinkedIn OAuth integration has been removed. Please use username-only integration.");

      case "instagram":
        // Instagram uses Facebook OAuth
        return {
          url: this.instagramService.generateOAuthUrl(finalRedirectUri),
        };

      case "threads":
        // Threads uses Facebook OAuth
        return { url: this.threadsService.generateOAuthUrl(finalRedirectUri) };

      case "reddit":
        return { url: this.redditService.generateOAuthUrl(finalRedirectUri) };

      case "github":
        // For apps flow, use the registered callback URL and specify flow type
        return { url: this.gitHubService.generateOAuthUrl(undefined, "apps") };

      case "producthunt":
        return { url: this.productHuntService.generateOAuthUrl(finalRedirectUri) };

      default:
        throw new BadRequestException(`Unsupported social network: ${network}`);
    }
  }

  /**
   * Stores or updates social content data in the social-content entity (upsert)
   * @param socialContentData The social content data to store
   * @param socialCredentialId The social credential ID
   */
  async upsertSocialContent(
    socialContentData: {
      source: SocialNetworkType;
      content: string;
      type: "post" | "comment" | "email" | "profile" | "repository" | "book" | "product";
      externalId: string;
      appId: number;
      socialContentCreatedAt?: Date;
      metadata?: any;
    },
    socialCredentialId: number,
  ): Promise<SocialContent> {
    // Validate required fields
    if (!socialContentData.source) {
      throw new Error("Source is required for social content");
    }
    if (!socialContentData.content || socialContentData.content.trim().length === 0) {
      throw new Error("Content is required and cannot be empty");
    }
    if (!socialContentData.externalId) {
      throw new Error("External ID is required for social content");
    }
    if (!socialContentData.appId) {
      throw new Error("App ID is required for social content");
    }
    if (!socialCredentialId) {
      throw new Error("Social credential ID is required");
    }
    if (!socialContentData.type) {
      throw new Error("Content type is required");
    }

    // Map SocialNetworkType to SocialContentSource first (needed for the query)
    const sourceMapping: Record<SocialNetworkType, SocialContentSource> = {
      [SocialNetworkType.FACEBOOK]: SocialContentSource.FACEBOOK,
      [SocialNetworkType.INSTAGRAM]: SocialContentSource.INSTAGRAM,
      [SocialNetworkType.THREADS]: SocialContentSource.THREADS,
      [SocialNetworkType.LINKEDIN]: SocialContentSource.LINKEDIN,
      [SocialNetworkType.GMAIL]: SocialContentSource.GMAIL,
      [SocialNetworkType.REDDIT]: SocialContentSource.REDDIT,
      [SocialNetworkType.MEDIUM]: SocialContentSource.MEDIUM,
      [SocialNetworkType.GITHUB]: SocialContentSource.GITHUB,
      [SocialNetworkType.GOODREADS]: SocialContentSource.GOODREADS,
      [SocialNetworkType.PRODUCTHUNT]: SocialContentSource.PRODUCTHUNT,
      [SocialNetworkType.SUBSTACK]: SocialContentSource.SUBSTACK,
      // TODO: Add other mappings as needed - using FACEBOOK as fallback for now
      [SocialNetworkType.YOUTUBE]: SocialContentSource.FACEBOOK,
      [SocialNetworkType.TIKTOK]: SocialContentSource.FACEBOOK,
      [SocialNetworkType.TWITTER]: SocialContentSource.TWITTER,
    };

    const mappedSource = sourceMapping[socialContentData.source] || SocialContentSource.FACEBOOK;

    // Check if content already exists based on the unique constraint: (appId, source, externalId)
    const existingContent = await this.socialContentRepository.findOne({
      where: {
        externalId: socialContentData.externalId,
        source: mappedSource,
        appId: socialContentData.appId,
      },
    });

    let socialContent: SocialContent;
    if (existingContent) {
      // Update existing content
      socialContent = existingContent;
      socialContent.content = socialContentData.content;
      socialContent.metadata = socialContentData.metadata;
      socialContent.socialContentCreatedAt = socialContentData.socialContentCreatedAt;
    } else {
      // Create new content
      socialContent = new SocialContent();
      socialContent.externalId = socialContentData.externalId;
      socialContent.appId = socialContentData.appId;
      socialContent.socialCredentialId = socialCredentialId;
      socialContent.content = socialContentData.content;
      socialContent.socialContentCreatedAt = socialContentData.socialContentCreatedAt;
      socialContent.metadata = socialContentData.metadata;
    }

    // Set the mapped source
    socialContent.source = mappedSource;

    // Map content type
    if (socialContentData.type === "post") {
      socialContent.type = SocialContentType.POST;
    } else if (socialContentData.type === "comment") {
      socialContent.type = SocialContentType.COMMENT;
    } else if (socialContentData.type === "email") {
      socialContent.type = SocialContentType.EMAIL;
    } else if (socialContentData.type === "profile") {
      socialContent.type = SocialContentType.PROFILE;
    } else if (socialContentData.type === "repository") {
      socialContent.type = SocialContentType.REPOSITORY;
    } else if (socialContentData.type === "book") {
      socialContent.type = SocialContentType.BOOK;
    } else if (socialContentData.type === "product") {
      socialContent.type = SocialContentType.PRODUCT;
    }

    // Skip embeddings and search vectors for Goodreads (stores JSON content)
    const skipEmbeddingTypes = [SocialNetworkType.GOODREADS];
    const shouldGenerateEmbedding = !skipEmbeddingTypes.includes(socialContentData.source);

    if (shouldGenerateEmbedding) {
      // Generate embeddings for the content
      try {
        // Prepare text for embedding with metadata
        const textForEmbedding = this.embeddingsService.prepareTextForEmbedding(
          socialContentData.content,
          socialContentData.metadata,
        );

        const embeddingResult = await this.embeddingsService.generateEmbedding(textForEmbedding);

        socialContent.embedding = pgvector.toSql(embeddingResult.embedding);

        this.logger.log(
          `Generated embedding for ${socialContentData.source} content (${embeddingResult.tokens} tokens)`,
        );
      } catch (embeddingError) {
        this.logger.error(`Failed to generate embedding for social content: ${embeddingError.message}`, {
          source: socialContentData.source,
          externalId: socialContentData.externalId,
          contentLength: socialContentData.content?.length || 0,
          error: embeddingError.message,
          stack: embeddingError.stack,
        });
        this.rollbar.error("Failed to generate embedding", {
          source: socialContentData.source,
          externalId: socialContentData.externalId,
          error: embeddingError.message || String(embeddingError),
          stack: embeddingError.stack,
        });
        // Continue without embedding if generation fails
      }
    } else {
      this.logger.log(`Skipping embedding generation for ${socialContentData.source} (JSON content)`);
    }

    // Generate search vector using raw query to use PostgreSQL's to_tsvector function
    try {
      // Add detailed logging before save
      this.logger.log(`Attempting to save social content`, {
        source: socialContentData.source,
        type: socialContentData.type,
        externalId: socialContentData.externalId,
        appId: socialContentData.appId,
        socialCredentialId,
        contentLength: socialContentData.content?.length || 0,
        hasEmbedding: !!socialContent.embedding,
        isUpdate: !!existingContent,
      });

      let savedContent: SocialContent;

      if (existingContent) {
        // For updates, use raw SQL to avoid searchVector issues
        const updateResult = await this.socialContentRepository.query(
          `UPDATE social_contents 
           SET content = $1, metadata = $2, "socialContentCreatedAt" = $3, embedding = $4, "updatedAt" = CURRENT_TIMESTAMP
           WHERE id = $5
           RETURNING *`,
          [
            socialContent.content,
            socialContent.metadata,
            socialContent.socialContentCreatedAt,
            socialContent.embedding,
            existingContent.id,
          ],
        );
        savedContent = updateResult[0];
      } else {
        // For inserts, use raw SQL to completely avoid searchVector field
        const insertResult = await this.socialContentRepository.query(
          `INSERT INTO social_contents 
           (source, content, type, "appId", "externalId", "socialCredentialId", "socialContentCreatedAt", metadata, embedding, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            socialContent.source,
            socialContent.content,
            socialContent.type,
            socialContent.appId,
            socialContent.externalId,
            socialContent.socialCredentialId,
            socialContent.socialContentCreatedAt,
            socialContent.metadata,
            socialContent.embedding,
          ],
        );
        savedContent = insertResult[0];
      }

      this.logger.log(
        `Successfully ${existingContent ? "updated" : "created"} social content for ${socialContentData.source} - ID: ${
          savedContent.id
        }`,
      );

      // Update search vector after saving (skip for JSON content types)
      if (socialContentData.content && shouldGenerateEmbedding) {
        try {
          // Check if searchVector column exists before attempting to update it
          const columnExists = await this.socialContentRepository.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'social_contents' AND column_name = 'searchVector'`,
          );

          if (columnExists && columnExists.length > 0) {
            await this.socialContentRepository.query(
              `UPDATE social_contents SET "searchVector" = to_tsvector('simple', COALESCE($1, '')) WHERE id = $2`,
              [socialContentData.content, savedContent.id],
            );
            this.logger.log(`Updated search vector for social content ID: ${savedContent.id}`);
          } else {
            this.logger.warn(
              `Skipping search vector update for content ID ${savedContent.id}: searchVector column does not exist. Run migrations to enable full-text search.`,
            );
          }
        } catch (searchVectorError) {
          this.logger.error(
            `Failed to update search vector for content ID ${savedContent.id}: ${searchVectorError.message}`,
          );
          // Don't fail the entire operation for search vector update errors
        }
      }

      // Dual-write to Chroma (use same embedding and metadata mapping)
      await this.upsertSocialContentToChroma(savedContent.id, socialContentData);

      return savedContent;
    } catch (saveError) {
      this.logger.error(`Failed to save social content for ${socialContentData.source}:`, {
        source: socialContentData.source,
        type: socialContentData.type,
        externalId: socialContentData.externalId,
        appId: socialContentData.appId,
        socialCredentialId,
        contentLength: socialContentData.content?.length || 0,
        hasEmbedding: !!socialContent.embedding,
        isUpdate: !!existingContent,
        error: saveError.message,
        stack: saveError.stack,
        sqlState: saveError.code,
        constraint: saveError.constraint,
        detail: saveError.detail,
      });
      this.rollbar.error("Failed to save social content", {
        source: socialContentData.source,
        type: socialContentData.type,
        externalId: socialContentData.externalId,
        appId: socialContentData.appId,
        socialCredentialId,
        error: saveError.message || String(saveError),
        stack: saveError.stack,
        sqlState: saveError.code,
        constraint: saveError.constraint,
        detail: saveError.detail,
      });
      throw saveError;
    }
  }

  /**
   * Stores social content data in the social-content entity with upsert logic
   * @param socialContentData The social content data to store
   * @param socialCredentialId The social credential ID
   */
  async storeSocialContent(
    socialContentData: {
      source: SocialNetworkType;
      content: string;
      type: "post" | "comment" | "email" | "profile" | "repository" | "book" | "product";
      externalId: string;
      appId: number;
      socialContentCreatedAt?: Date;
      metadata?: any;
    },
    socialCredentialId: number,
  ): Promise<SocialContent> {
    try {
      // Map SocialNetworkType to SocialContentSource
      const sourceMapping: Record<SocialNetworkType, SocialContentSource> = {
        [SocialNetworkType.FACEBOOK]: SocialContentSource.FACEBOOK,
        [SocialNetworkType.INSTAGRAM]: SocialContentSource.INSTAGRAM,
        [SocialNetworkType.THREADS]: SocialContentSource.THREADS,
        [SocialNetworkType.LINKEDIN]: SocialContentSource.LINKEDIN,
        [SocialNetworkType.GMAIL]: SocialContentSource.GMAIL,
        [SocialNetworkType.REDDIT]: SocialContentSource.REDDIT,
        [SocialNetworkType.MEDIUM]: SocialContentSource.MEDIUM,
        [SocialNetworkType.GITHUB]: SocialContentSource.GITHUB,
        [SocialNetworkType.GOODREADS]: SocialContentSource.GOODREADS,
        [SocialNetworkType.PRODUCTHUNT]: SocialContentSource.PRODUCTHUNT,
        [SocialNetworkType.SUBSTACK]: SocialContentSource.SUBSTACK,
        // TODO: Add other mappings as needed - using FACEBOOK as fallback for now
        [SocialNetworkType.TWITTER]: SocialContentSource.FACEBOOK,
        [SocialNetworkType.YOUTUBE]: SocialContentSource.FACEBOOK,
        [SocialNetworkType.TIKTOK]: SocialContentSource.FACEBOOK,
      };

      const mappedSource = sourceMapping[socialContentData.source] || SocialContentSource.FACEBOOK;

      // Map content type
      const typeMapping = {
        post: SocialContentType.POST,
        comment: SocialContentType.COMMENT,
        email: SocialContentType.EMAIL,
        profile: SocialContentType.PROFILE,
        repository: SocialContentType.REPOSITORY,
        book: SocialContentType.BOOK,
        product: SocialContentType.PRODUCT,
      };

      const mappedType = typeMapping[socialContentData.type] || SocialContentType.POST;

      // Check if content already exists
      const existingContent = await this.socialContentRepository.findOne({
        where: {
          appId: socialContentData.appId,
          source: mappedSource,
          externalId: socialContentData.externalId,
        },
      });

      // Skip embeddings and search vectors for Goodreads (stores JSON content)
      const skipEmbeddingTypes = [SocialNetworkType.GOODREADS];
      const shouldGenerateEmbedding = !skipEmbeddingTypes.includes(socialContentData.source);

      let embedding: string | null = null;

      if (shouldGenerateEmbedding) {
        // Generate embeddings for the content
        try {
          // Prepare text for embedding with metadata
          const textForEmbedding = this.embeddingsService.prepareTextForEmbedding(
            socialContentData.content,
            socialContentData.metadata,
          );

          const embeddingResult = await this.embeddingsService.generateEmbedding(textForEmbedding);
          embedding = pgvector.toSql(embeddingResult.embedding);

          this.logger.log(
            `Generated embedding for ${socialContentData.source} content (${embeddingResult.tokens} tokens)`,
          );
        } catch (error) {
          this.logger.error(`Failed to generate embedding for social content: ${error.message}`);
          // Continue without embedding if generation fails
        }
      } else {
        this.logger.log(`Skipping embedding generation for ${socialContentData.source} (JSON content)`);
      }

      let savedContent: SocialContent;

      if (existingContent) {
        // Update existing content
        existingContent.content = socialContentData.content;
        existingContent.type = mappedType;
        existingContent.socialCredentialId = socialCredentialId;
        existingContent.socialContentCreatedAt = socialContentData.socialContentCreatedAt;
        existingContent.metadata = socialContentData.metadata;
        if (embedding) {
          existingContent.embedding = embedding;
        }

        // For updates, use raw SQL to avoid searchVector issues
        const updateResult = await this.socialContentRepository.query(
          `UPDATE social_contents 
           SET content = $1, type = $2, "socialCredentialId" = $3, "socialContentCreatedAt" = $4, metadata = $5, embedding = $6, "updatedAt" = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING *`,
          [
            existingContent.content,
            existingContent.type,
            existingContent.socialCredentialId,
            existingContent.socialContentCreatedAt,
            existingContent.metadata,
            existingContent.embedding,
            existingContent.id,
          ],
        );
        savedContent = updateResult[0];
        this.logger.log(`Successfully updated social content for ${socialContentData.source} - ID: ${savedContent.id}`);
      } else {
        // Create new content
        const socialContent = new SocialContent();
        socialContent.source = mappedSource;
        socialContent.content = socialContentData.content;
        socialContent.type = mappedType;
        socialContent.externalId = socialContentData.externalId;
        socialContent.appId = socialContentData.appId;
        socialContent.socialCredentialId = socialCredentialId;
        socialContent.socialContentCreatedAt = socialContentData.socialContentCreatedAt;
        socialContent.metadata = socialContentData.metadata;
        if (embedding) {
          socialContent.embedding = embedding;
        }

        // For inserts, use raw SQL to completely avoid searchVector field
        const insertResult = await this.socialContentRepository.query(
          `INSERT INTO social_contents 
           (source, content, type, "appId", "externalId", "socialCredentialId", "socialContentCreatedAt", metadata, embedding, "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            socialContent.source,
            socialContent.content,
            socialContent.type,
            socialContent.appId,
            socialContent.externalId,
            socialContent.socialCredentialId,
            socialContent.socialContentCreatedAt,
            socialContent.metadata,
            socialContent.embedding,
          ],
        );
        savedContent = insertResult[0];
        this.logger.log(`Successfully created social content for ${socialContentData.source} - ID: ${savedContent.id}`);
      }

      // Update search vector after saving (skip for JSON content types)
      if (socialContentData.content && shouldGenerateEmbedding) {
        try {
          // Check if searchVector column exists before attempting to update it
          const columnExists = await this.socialContentRepository.query(
            `SELECT column_name FROM information_schema.columns 
             WHERE table_name = 'social_contents' AND column_name = 'searchVector'`,
          );

          if (columnExists && columnExists.length > 0) {
            await this.socialContentRepository.query(
              `UPDATE social_contents SET "searchVector" = to_tsvector('simple', COALESCE($1, '')) WHERE id = $2`,
              [socialContentData.content, savedContent.id],
            );
            this.logger.log(`Updated search vector for social content ID: ${savedContent.id}`);
          } else {
            this.logger.warn(
              `Skipping search vector update for content ID ${savedContent.id}: searchVector column does not exist. Run migrations to enable full-text search.`,
            );
          }
        } catch (searchVectorError) {
          this.logger.error(
            `Failed to update search vector for content ID ${savedContent.id}: ${searchVectorError.message}`,
          );
          // Don't fail the entire operation for search vector update errors
        }
      }

      // Dual-write to Chroma
      await this.upsertSocialContentToChroma(savedContent.id, socialContentData);

      return savedContent;
    } catch (error) {
      this.logger.error(`Failed to save social content for ${socialContentData.source}:`, error);
      this.rollbar.error("Failed to save social content", {
        source: socialContentData.source,
        type: socialContentData.type,
        externalId: socialContentData.externalId,
        appId: socialContentData.appId,
        socialCredentialId,
        error: error.message || String(error),
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Helper method to upsert social content to Chroma
   * Fetches userId from app and handles chunking/upserting
   */
  private async upsertSocialContentToChroma(
    socialContentId: number,
    socialContentData: {
      content: string;
      appId: number;
      source: SocialNetworkType;
      type: string;
      externalId: string;
      socialContentCreatedAt?: Date;
    },
  ): Promise<void> {
    try {
      const app = await this.appRepository.findOne({ where: { id: socialContentData.appId } });
      if (!app) {
        throw new Error(`App not found for appId: ${socialContentData.appId}`);
      }

      const docId = generateSocialContentDocId(socialContentId);
      const chunkedDocs = await this.chromaService.chunkDocument({
        id: docId,
        text: socialContentData.content,
        metadata: {
          userId: app.userId,
          id: socialContentId,
          appId: socialContentData.appId,
          source: socialContentData.source,
          type: socialContentData.type,
          externalId: socialContentData.externalId,
          createdAt: socialContentData.socialContentCreatedAt?.toISOString?.() || undefined,
          origin: "social_content",
        },
      });

      await this.chromaService.upsertDocuments(chunkedDocs);
    } catch (chromaError) {
      this.logger.error(`Failed to upsert social content to Chroma: ${chromaError.message}`);
    }
  }

  /**
   * Helper method to upsert app link to Chroma
   */
  private async upsertAppLinkToChroma(
    appLinkId: number,
    userId: number,
    appId: number,
    link: string,
    content: string,
    createdAt?: Date,
  ): Promise<void> {
    try {
      const docId = generateAppLinkDocId(appLinkId);
      const chunkedDocs = await this.chromaService.chunkDocument({
        id: docId,
        text: content,
        metadata: {
          userId,
          id: appLinkId,
          appId,
          link,
          createdAt: createdAt?.toISOString?.() || undefined,
          origin: "app_link",
        },
      });

      await this.chromaService.upsertDocuments(chunkedDocs);
    } catch (chromaError) {
      this.logger.error(`Failed to upsert app link to Chroma: ${chromaError.message}`);
    }
  }

  /**
   * Get all published apps (public endpoint)
   */
  async getPublishedApps(): Promise<App[]> {
    const publishedApps = await this.appRepository.find({
      where: {
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
      order: {
        createdAt: "DESC",
      },
    });

    return Promise.all(
      publishedApps.map(async (app) => ({
        ...app,
        logo: await this.getLogo(app),
      })),
    );
  }

  /**
   * Get all published digital clones sorted by social connections and links count (public endpoint)
   */
  async getPublishedDigitalClones(): Promise<App[]> {
    try {
      this.logger.log("Starting getPublishedDigitalClones query...");

      // Get published digital clones with connection counts and sort them
      const apps = await this.appRepository
        .createQueryBuilder("app")
        .leftJoin("app.socialCredentials", "socialCredentials")
        .leftJoin("app.appLinks", "appLinks")
        .where("app.isPublished = :isPublished", { isPublished: true })
        .andWhere("app.isMe = :isMe", { isMe: true })
        .groupBy("app.id")
        .orderBy("(COUNT(DISTINCT socialCredentials.id) + COUNT(DISTINCT appLinks.id))", "DESC")
        .addOrderBy("app.createdAt", "DESC")
        .getMany();

      this.logger.log(`Found ${apps.length} published digital clones`);

      if (apps.length === 0) {
        return [];
      }

      // Add logos to all apps
      const result = await Promise.all(
        apps.map(async (app) => ({
          ...app,
          logo: await this.getLogo(app),
        })),
      );

      this.logger.log(`Returning ${result.length} digital clones`);
      return result;
    } catch (error) {
      this.logger.error("Error in getPublishedDigitalClones:", error);
      // If database fails, return empty array gracefully
      return [];
    }
  }

  /**
   * Get a published app by name (public endpoint)
   */
  async getPublishedApp(name: string): Promise<AppResponseDto> {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
    });

    console.log("app", JSON.stringify(app, null, 2));

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    const logo = await this.getLogo(app);
    let appWithDetails: AppWithDetails = { ...app, logo };

    // Include links and social sources for published apps
    const [appLinks, socialCredentials] = await Promise.all([
      this.appLinkRepository.find({
        where: { appId: app.id },
        select: ["id", "link", "createdAt", "metadata"],
      }),
      this.socialCredentialsRepository.findByAppId(app.id),
    ]);

    appWithDetails = {
      ...appWithDetails,
      appLinks,
      socialSources: socialCredentials,
    };

    return appWithDetails;
  }

  async getPublishedAppSuggestedQuestions(name: string) {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
      select: ["id", "name", "displayName", "description", "instruction", "suggestedQuestionsConfig"],
    });

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    return app.suggestedQuestionsConfig;
  }

  /**
   * Get About markdown for a published app (public endpoint)
   */
  async getPublishedAppAbout(name: string): Promise<{ about: string | null }> {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
      select: ["id", "about"],
    });

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    return { about: app.about ?? null };
  }

  /**
   * Get knowledge graph data for a published app (public endpoint)
   */
  async getPublishedAppKnowledgeGraph(name: string): Promise<{
    knowledgeGraph: {
      nodes: Array<{ id: string; label: string; type: string; weight: number }>;
      edges: Array<{ source: string; target: string; label: string }>;
    } | null;
  }> {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true,
      },
      select: ["id", "knowledgeGraph"],
    });

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    return { knowledgeGraph: app.knowledgeGraph ?? null };
  }

  /**
   * Get social content for a published app (public endpoint)
   */
  async getPublishedAppSocialContent(name: string, source: string): Promise<SocialContent[]> {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true, // Only "me" apps can be published
      },
    });

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    // Validate source parameter
    const validSources = Object.values(SocialContentSource);
    if (!validSources.includes(source as SocialContentSource)) {
      throw new BadRequestException(`Invalid source. Valid sources are: ${validSources.join(", ")}`);
    }

    // Get social content for the specific source
    // Note: We return the content but without the full details - just summaries
    const socialContent = await this.socialContentRepository.find({
      where: {
        appId: app.id,
        source: source as SocialContentSource,
      },
      order: {
        createdAt: "DESC",
      },
      take: 50, // Limit to 50 most recent items for public access
    });

    // For privacy, we should return limited information
    return socialContent.map((content) => ({
      ...content,
      // Keep content but don't expose sensitive metadata
      content: this.summarizeContentForPublic(content.content),
    }));
  }

  /**
   * Get aggregated timeline of social content for a published app (public endpoint)
   * Returns all social content across all sources EXCEPT Gmail, ordered by date
   */
  async getPublishedAppTimeline(
    name: string,
    page: number = 1,
    limit: number = 20,
    sourceFilter?: string,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const app = await this.appRepository.findOne({
      where: {
        name: name,
        isPublished: true,
        isMe: true,
      },
    });

    if (!app) {
      throw new NotFoundException("Published app not found");
    }

    // Validate source filter if provided
    if (sourceFilter) {
      const validSources = Object.values(SocialContentSource).filter(
        (s) => s !== SocialContentSource.GMAIL,
      );
      if (!validSources.includes(sourceFilter as SocialContentSource)) {
        throw new BadRequestException(
          `Invalid source. Valid sources are: ${validSources.join(", ")}`,
        );
      }
    }

    // Build where conditions - exclude Gmail and email content types
    const whereConditions: any = {
      appId: app.id,
      type: Not(SocialContentType.EMAIL),
    };

    if (sourceFilter) {
      whereConditions.source = sourceFilter as SocialContentSource;
    } else {
      whereConditions.source = Not(SocialContentSource.GMAIL);
    }

    const skip = (page - 1) * limit;

    const [items, total] = await this.socialContentRepository.findAndCount({
      where: whereConditions,
      order: {
        socialContentCreatedAt: { direction: "DESC", nulls: "LAST" },
      },
      select: [
        "id",
        "source",
        "content",
        "type",
        "externalId",
        "socialContentCreatedAt",
        "metadata",
        "createdAt",
      ],
      take: limit,
      skip: skip,
    });

    return {
      items: items.map((item) => ({
        id: item.id,
        source: item.source,
        content: item.content,
        type: item.type,
        externalId: item.externalId,
        socialContentCreatedAt: item.socialContentCreatedAt,
        createdAt: item.createdAt,
        metadata: item.metadata,
      })),
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  /**
   * Summarize content for public viewing (privacy protection)
   */
  private summarizeContentForPublic(content: string): string {
    // For public viewing, we might want to show only the first few words
    // or a summary rather than full content to protect privacy
    if (content.length > 200) {
      return content.substring(0, 200) + "...";
    }
    return content;
  }

  /**
   * Process social credentials asynchronously without blocking
   */
  private async processSocialCredentialsAsync(socialCredentials: any[], userId: number, appId: number): Promise<void> {
    if (!socialCredentials?.length) return;

    try {
      let successfullyProcessed = 0;

      // Process each credential and wait for all to complete
      await Promise.all(
        socialCredentials.map(async (credential) => {
          try {
            this.logger.log(
              `Processing credential: source="${credential.source}", username="${
                credential.username
              }", hasCode=${!!credential.code}`,
            );
            this.logger.log(`SocialNetworkType.SUBSTACK = "${SocialNetworkType.SUBSTACK}"`);
            this.logger.log(`Is Substack? ${credential.source === SocialNetworkType.SUBSTACK}`);

            // Handle Medium differently as it doesn't use OAuth
            if (credential.source === SocialNetworkType.MEDIUM) {
              if (!credential.username) {
                throw new Error("Username is required for Medium authentication");
              }

              // Validate Medium username
              const isValidUsername = await this.mediumService.validateUsername(credential.username);
              if (!isValidUsername) {
                throw new Error(`Invalid Medium username: @${credential.username}`);
              }

              // Store Medium credentials without OAuth tokens
              await this.storeMediumCredentialsAsync(userId, appId, credential.username);
              successfullyProcessed++;
              return;
            }

            // Handle Substack differently as it doesn't use OAuth
            if (credential.source === SocialNetworkType.SUBSTACK) {
              this.logger.log(`Processing Substack credential for username: ${credential.username}`);
              if (!credential.username) {
                throw new Error("Username is required for Substack authentication");
              }

              // Validate Substack username
              this.logger.log(`Validating Substack username: ${credential.username}`);
              const isValidUsername = await this.substackService.validateUsername(credential.username);
              if (!isValidUsername) {
                throw new Error(`Invalid Substack username: ${credential.username}`);
              }

              // Store Substack credentials without OAuth tokens
              this.logger.log(`Storing Substack credentials for user ${userId}, app ${appId}`);
              await this.storeSubstackCredentialsAsync(userId, appId, credential.username);
              successfullyProcessed++;
              return;
            }
            console.log("credential", credential);

            // Handle LinkedIn and Goodreads differently as they don't use OAuth
            if (credential.source === SocialNetworkType.LINKEDIN || credential.source === SocialNetworkType.GOODREADS) {
              if (!credential.username) {
                throw new Error(`Username is required for ${credential.source} authentication`);
              }

              if (credential.source === SocialNetworkType.LINKEDIN) {
                // Validate LinkedIn username
                const isValidUsername = await this.linkedInService.validateUsername(credential.username);
                if (!isValidUsername) {
                  throw new Error(`Invalid LinkedIn username: ${credential.username}`);
                }

                // Store LinkedIn credentials without OAuth tokens
                await this.storeLinkedInCredentialsAsync(userId, appId, credential.username);
              } else if (credential.source === SocialNetworkType.GOODREADS) {
                // Goodreads validation
                const isValid = await this.goodreadsService.validateRssFeedUrl(credential.username);
                if (!isValid) {
                  throw new Error(`Invalid Goodreads user ID: ${credential.username}`);
                }

                // Store Goodreads credentials without OAuth tokens
                await this.storeGoodreadsCredentialsAsync(userId, appId, credential.username);
              }

              successfullyProcessed++;
              return;
            }

            // Handle Twitter differently as it doesn't use OAuth
            if (credential.source === SocialNetworkType.TWITTER) {
              if (!credential.username) {
                throw new Error("Username is required for Twitter authentication");
              }

              // Clean Twitter handle from URL format if needed
              const cleanedUsername = this.cleanTwitterHandle(credential.username);

              // Validate format before making API call
              if (!this.isValidTwitterHandleFormat(cleanedUsername)) {
                throw new Error(
                  `Invalid Twitter handle format: ${credential.username}. Handles must be 1-15 characters, alphanumeric and underscores only, and cannot start with a number. Please enter just the handle (e.g., 'johndoe') not the full URL.`,
                );
              }

              // Twitter validation
              const validationResult = await this.twitterService.validateUsername(cleanedUsername);
              if (!validationResult.valid) {
                throw new Error(
                  `Invalid Twitter username: ${cleanedUsername} - ${validationResult.error || "Unknown error"}`,
                );
              }

              this.logger.log(`Valid Twitter username ${cleanedUsername}, storing credentials`);

              // Store Twitter credentials without OAuth tokens (use cleaned username)
              await this.storeTwitterCredentialsAsync(userId, appId, cleanedUsername);
              successfullyProcessed++;
              return;
            }

            if (!credential.code) {
              this.logger.error(
                `No authorization code for ${credential.source}. This network might need special handling.`,
              );
              throw new Error("Authorization code is required for social network authentication");
            }

            const { accessToken, refreshToken, expiresIn, username, profileId } = await this.exchangeCodeForTokens(
              credential.source,
              credential.code,
            );

            const finalUsername = username || credential.username;

            await this.storeCredentialsAsync(
              userId,
              appId,
              credential.source,
              finalUsername,
              accessToken,
              refreshToken,
              expiresIn,
            );
            successfullyProcessed++;
          } catch (error) {
            this.logger.error(`Error storing credentials for ${credential.source}:`, error);
            this.logger.error(`Full error details:`, error.message, error.stack);
            // Continue with other credentials even if one fails
          }
        }),
      );

      this.logger.log(
        `Successfully processed ${successfullyProcessed}/${socialCredentials.length} social credentials for app ${appId}`,
      );

      // Rebuild personality after all social credentials have been processed
      if (successfullyProcessed > 0) {
        // Wait for content to be fully ingested, then update instruction
        setTimeout(async () => {
          try {
            await this.rebuildPersonalityAndUpdateInstructionAsync(userId, appId);
          } catch (personalityError) {
            this.logger.error(
              `Error rebuilding personality after social processing for app ${appId}: ${personalityError.message}`,
              personalityError.stack,
            );
          }
        }, 3000);
        this.logger.log(
          `Scheduled personality rebuild after processing ${successfullyProcessed} social credentials for app ${appId}`,
        );
      }
    } catch (error) {
      this.logger.error("Error processing social credentials:", error);
    }
  }

  /**
   * Process links asynchronously without blocking
   */
  private async processLinksAsync(links: string[], userId: number, appId: number): Promise<void> {
    if (!links?.length) return;

    try {
      const contents = await this.processLinks(links);
      let successfullyProcessed = 0;

      // Process each link and wait for all to complete
      await Promise.all(
        links.map(async (link, index) => {
          try {
            // Store in app-link entity
            const appLink = new AppLink();
            appLink.link = link;
            appLink.content = contents[index];
            appLink.appId = appId;

            // Fetch and save metadata
            try {
              const metadata = await this.linkMetadataService.extractMetadata(link);
              appLink.metadata = metadata;
              this.logger.log(`Extracted metadata for link ${link}:`, metadata);
            } catch (error) {
              this.logger.error(`Failed to extract metadata for link ${link}: ${error.message}`);
              // Continue without metadata if extraction fails
            }

            // Generate embedding for the link content
            try {
              const embeddingResult = await this.embeddingsService.generateEmbedding(contents[index]);
              appLink.embedding = pgvector.toSql(embeddingResult.embedding);
              this.logger.log(`Generated embedding for link ${link} (${embeddingResult.tokens} tokens)`);
            } catch (error) {
              this.logger.error(`Failed to generate embedding for link ${link}: ${error.message}`);
              // Continue without embedding if generation fails
            }

            // Create the app link using repository method
            const savedAppLink = await this.appLinkRepository.createAppLinkWithEmbedding({
              link: appLink.link,
              content: appLink.content,
              appId: appLink.appId,
              embedding: appLink.embedding,
              metadata: appLink.metadata,
            });

            // Update search vector after saving
            if (contents[index]) {
              try {
                await this.appLinkRepository.updateSearchVector(savedAppLink.id, contents[index]);
              } catch (searchVectorError) {
                this.logger.error(
                  `Failed to update search vector for app link ID ${savedAppLink.id}: ${searchVectorError.message}`,
                );
                // Don't fail the entire operation for search vector update errors
              }
            }

            // Dual-write to Chroma for app link
            await this.upsertAppLinkToChroma(
              savedAppLink.id,
              userId,
              appId,
              link,
              contents[index] || "",
              savedAppLink.createdAt,
            );

            // Store in memory service for AI processing
            await this.memoryService.ingestLinkContent(userId, appId, {
              url: link,
              content: contents[index],
            });
            successfullyProcessed++;
          } catch (error) {
            this.logger.error(`Error processing link ${link}:`, error);
          }
        }),
      );

      this.logger.log(`Successfully processed ${successfullyProcessed}/${contents.length} links for app ${appId}`);

      // Rebuild personality after all links have been processed
      if (successfullyProcessed > 0) {
        // Wait for content to be fully ingested, then update instruction
        setTimeout(async () => {
          try {
            await this.rebuildPersonalityAndUpdateInstructionAsync(userId, appId);
          } catch (personalityError) {
            this.logger.error(
              `Error rebuilding personality after link processing for app ${appId}: ${personalityError.message}`,
              personalityError.stack,
            );
          }
        }, 2000);
        this.logger.log(
          `Scheduled personality rebuild after processing ${successfullyProcessed} links for app ${appId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing links for app ${appId}:`, error);
    }
  }

  /**
   * Process all links (both regular and YouTube) asynchronously without blocking
   */
  private async processAllLinksAsync(links: string[], userId: number, appId: number): Promise<void> {
    if (!links?.length) return;

    try {
      // Classify links
      const youtubeLinks: string[] = [];
      const regularLinks: string[] = [];

      links.forEach((link) => {
        if (this.isYouTubeUrl(link)) {
          youtubeLinks.push(link);
        } else {
          regularLinks.push(link);
        }
      });

      // Process regular links and YouTube links in parallel
      await Promise.all([
        regularLinks.length > 0 ? this.processLinksAsync(regularLinks, userId, appId) : Promise.resolve(),
        youtubeLinks.length > 0 ? this.processYouTubeLinksAsync(youtubeLinks, userId, appId) : Promise.resolve(),
      ]);
    } catch (error) {
      this.logger.error(`Error processing all links for app ${appId}:`, error);
    }
  }

  /**
   * Check if a URL is a YouTube URL
   */
  private isYouTubeUrl(url: string): boolean {
    const youtubeRegex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  }

  /**
   * Process YouTube links asynchronously without blocking
   */
  private async processYouTubeLinksAsync(youtubeLinks: string[], userId: number, appId: number): Promise<void> {
    if (!youtubeLinks?.length) return;

    try {
      this.logger.log(`Processing ${youtubeLinks.length} YouTube links for app ${appId}`);

      // Validate YouTube URLs first
      const validationResult = this.youtubeService.validateUrls(youtubeLinks);
      if (validationResult.invalid.length > 0) {
        this.logger.warn(`Invalid YouTube URLs found: ${validationResult.invalid.join(", ")}`);
      }

      if (validationResult.valid.length === 0) {
        this.logger.warn(`No valid YouTube URLs found for app ${appId}`);
        return;
      }

      // Extract content from valid YouTube URLs
      const youtubeContents = await this.youtubeService.extractMultipleContents(validationResult.valid);
      let successfullyProcessed = 0;

      // Process each YouTube link and wait for all to complete
      await Promise.all(
        youtubeContents.map(async (youtubeContent, index) => {
          if (!youtubeContent) {
            this.logger.warn(`Failed to extract content from YouTube URL: ${validationResult.valid[index]}`);
            return;
          }

          try {
            // Store YouTube content in app-link entity with clear distinction
            const appLink = new AppLink();
            appLink.link = youtubeContent.url;

            // Structure YouTube content in a more organized way
            appLink.content = youtubeContent.transcript;
            appLink.appId = appId;

            // Create comprehensive metadata for YouTube content
            let metadata: any = {
              videoId: youtubeContent.videoId,
              hasTranscript: !!youtubeContent.transcript,
            };

            // Fetch standard metadata using LinkMetadataService
            try {
              const linkMetadata = await this.linkMetadataService.extractMetadata(youtubeContent.url);
              if (linkMetadata) {
                metadata = {
                  ...metadata,
                  title: linkMetadata.title,
                  description: linkMetadata.description,
                  siteName: linkMetadata.siteName,
                  image: linkMetadata.image,
                  favicon: linkMetadata.favicon,
                };
              }
              this.logger.log(`Extracted metadata for YouTube URL ${youtubeContent.url}:`, linkMetadata);
            } catch (error) {
              this.logger.error(`Failed to extract metadata for YouTube URL ${youtubeContent.url}: ${error.message}`);
              // Continue without metadata if extraction fails
            }

            appLink.metadata = metadata;

            // Generate embedding for the YouTube content
            try {
              const embeddingResult = await this.embeddingsService.generateEmbedding(youtubeContent.transcript);
              appLink.embedding = pgvector.toSql(embeddingResult.embedding);
              this.logger.log(
                `Generated embedding for YouTube video: ${youtubeContent.videoId} (${embeddingResult.tokens} tokens)`,
              );
            } catch (error) {
              this.logger.error(
                `Failed to generate embedding for YouTube video ${youtubeContent.videoId}: ${error.message}`,
              );
              // Continue without embedding if generation fails
            }

            // Create the app link using repository method
            const savedAppLink = await this.appLinkRepository.createAppLinkWithEmbedding({
              link: appLink.link,
              content: appLink.content,
              appId: appLink.appId,
              embedding: appLink.embedding,
              metadata: appLink.metadata,
            });

            // Update search vector after saving
            if (youtubeContent.transcript) {
              try {
                await this.appLinkRepository.updateSearchVector(savedAppLink.id, youtubeContent.transcript);
              } catch (searchVectorError) {
                this.logger.error(
                  `Failed to update search vector for YouTube link ID ${savedAppLink.id}: ${searchVectorError.message}`,
                );
                // Don't fail the entire operation for search vector update errors
              }
            }

            // Store in memory service for AI processing with YouTube-specific context
            await this.memoryService.ingestYouTubeContent(userId, appId, {
              url: youtubeContent.url,
              content: youtubeContent.transcript,
              videoId: youtubeContent.videoId,
              title: metadata.title || "Unknown Title",
              channelName: metadata.siteName || "Unknown Channel",
              hasTranscript: !!youtubeContent.transcript,
            });

            successfullyProcessed++;
            // Dual-write to Chroma for YouTube transcript
            await this.upsertAppLinkToChroma(
              savedAppLink.id,
              userId,
              appId,
              youtubeContent.url,
              youtubeContent.transcript || "",
              savedAppLink.createdAt,
            );
            this.logger.log(`Successfully processed YouTube video: ${youtubeContent.videoId}`);
          } catch (error) {
            this.logger.error(`Error processing YouTube video ${youtubeContent.videoId}:`, error);
          }
        }),
      );

      this.logger.log(
        `Successfully processed ${successfullyProcessed}/${youtubeContents.length} YouTube videos for app ${appId}`,
      );

      // Rebuild personality after all YouTube links have been processed
      if (successfullyProcessed > 0) {
        // Wait for content to be fully ingested, then update instruction
        setTimeout(async () => {
          try {
            await this.rebuildPersonalityAndUpdateInstructionAsync(userId, appId);
          } catch (personalityError) {
            this.logger.error(
              `Error rebuilding personality after YouTube processing for app ${appId}: ${personalityError.message}`,
              personalityError.stack,
            );
          }
        }, 2000);
        this.logger.log(
          `Scheduled personality rebuild after processing ${successfullyProcessed} YouTube videos for app ${appId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Error processing YouTube links for app ${appId}:`, error);
    }
  }

  /**
   * Store credentials asynchronously without blocking
   */
  private async storeCredentialsAsync(
    userId: number,
    appId: number,
    socialType: SocialNetworkType,
    username: string,
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
  ): Promise<void> {
    try {
      // Store the credentials first
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(userId, socialType);

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        existingCredentials.accessToken = accessToken;
        existingCredentials.refreshToken = refreshToken;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = socialType;
        newCredentials.username = username;
        newCredentials.accessToken = accessToken;
        newCredentials.refreshToken = refreshToken;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch user content based on social network type (async, no await)
      this.fetchAndStoreSocialContentAsync(userId, appId, socialType, currentCredentials);
    } catch (error) {
      this.logger.error(`Error storing credentials for ${socialType}:`, error);
    }
  }

  /**
   * Store Medium credentials asynchronously without blocking
   */
  private async storeMediumCredentialsAsync(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Medium credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.MEDIUM,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.MEDIUM;
        newCredentials.username = username;
        // Medium doesn't need access tokens
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Medium content (async, no await)
      this.fetchMediumContentAsync(userId, username, appId, currentCredentials.id);
    } catch (error) {
      this.logger.error(`Error storing Medium credentials:`, error);
    }
  }

  /**
   * Store Goodreads credentials asynchronously without blocking
   */
  private async storeGoodreadsCredentialsAsync(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Goodreads credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.GOODREADS,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.GOODREADS;
        newCredentials.username = username;
        // Goodreads doesn't need access tokens
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Goodreads content (async, no await)
      this.fetchGoodreadsContentAsync(userId, username, appId, currentCredentials.id);
    } catch (error) {
      this.logger.error(`Error storing Goodreads credentials:`, error);
    }
  }

  /**
   * Store Substack credentials asynchronously without blocking
   */
  private async storeSubstackCredentialsAsync(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Substack credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.SUBSTACK,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.SUBSTACK;
        newCredentials.username = username;
        // Substack doesn't need access tokens
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Substack content (async, no await)
      this.fetchSubstackContentAsync(userId, username, appId, currentCredentials.id);
    } catch (error) {
      this.logger.error(`Error storing Substack credentials:`, error);
    }
  }

  /**
   * Store LinkedIn credentials asynchronously without blocking
   */
  private async storeLinkedInCredentialsAsync(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if LinkedIn credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.LINKEDIN,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.LINKEDIN;
        newCredentials.username = username;
        // LinkedIn doesn't need access tokens when using Proxycurl
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch LinkedIn content using common async method
      this.fetchAndStoreSocialContentAsync(userId, appId, SocialNetworkType.LINKEDIN, currentCredentials);
    } catch (error) {
      this.logger.error(`Error storing LinkedIn credentials:`, error);
    }
  }

  private async storeTwitterCredentialsAsync(userId: number, appId: number, username: string): Promise<void> {
    try {
      // Check if Twitter credentials already exist for this user
      const existingCredentials = await this.socialCredentialsRepository.findByUserAndType(
        userId,
        SocialNetworkType.TWITTER,
      );

      let currentCredentials: SocialCredential;

      if (existingCredentials) {
        existingCredentials.username = username;
        if (appId) {
          existingCredentials.appId = appId;
        }
        currentCredentials = await this.socialCredentialsRepository.save(existingCredentials);
      } else {
        const newCredentials = new SocialCredential();
        newCredentials.userId = userId;
        if (appId) {
          newCredentials.appId = appId;
        }
        newCredentials.type = SocialNetworkType.TWITTER;
        newCredentials.username = username;
        // Twitter doesn't need access tokens when using Apify
        newCredentials.accessToken = null;
        newCredentials.refreshToken = null;
        currentCredentials = await this.socialCredentialsRepository.save(newCredentials);
      }

      // Fetch Twitter content using common async method
      this.fetchAndStoreSocialContentAsync(userId, appId, SocialNetworkType.TWITTER, currentCredentials);
    } catch (error) {
      this.logger.error(`Error storing Twitter credentials:`, error);
    }
  }

  /**
   * Sync data from a specific social source (fire and forget)
   */
  async syncDataSourceAsync(uniqueId: string, sourceName: string, userId: number): Promise<void> {
    try {
      // Find the app
      const app = await this.appRepository.findOne({
        where: { uniqueId, userId, isOfficial: false },
      });

      if (!app) {
        this.logger.error(`App not found for sync: ${uniqueId}`);
        return;
      }

      // Map source name to SocialNetworkType
      const sourceMapping: Record<string, SocialNetworkType> = {
        facebook: SocialNetworkType.FACEBOOK,
        instagram: SocialNetworkType.INSTAGRAM,
        twitter: SocialNetworkType.TWITTER,
        linkedin: SocialNetworkType.LINKEDIN,
        github: SocialNetworkType.GITHUB,
        gmail: SocialNetworkType.GMAIL,
        reddit: SocialNetworkType.REDDIT,
        medium: SocialNetworkType.MEDIUM,
        goodreads: SocialNetworkType.GOODREADS,
        producthunt: SocialNetworkType.PRODUCTHUNT,
        substack: SocialNetworkType.SUBSTACK,
        threads: SocialNetworkType.THREADS,
      };

      const socialType = sourceMapping[sourceName.toLowerCase()];
      if (!socialType) {
        this.logger.error(`Unsupported source name: ${sourceName}`);
        return;
      }

      // Find existing credentials for this social type
      const credentials = await this.socialCredentialsRepository.findByUserAndType(userId, socialType);
      if (!credentials) {
        this.logger.error(`No credentials found for ${sourceName} for user ${userId}`);
        return;
      }

      this.logger.log(`Starting sync for ${sourceName} (${socialType}) for app ${app.id}`);

      // Fetch and upsert content with better error handling
      try {
        await this.fetchAndStoreSocialContentAsync(userId, app.id, socialType, credentials);
        this.logger.log(`Successfully completed sync for ${sourceName} (${socialType}) for app ${app.id}`);
      } catch (syncError) {
        this.logger.error(`Failed to sync content for ${sourceName} (${socialType}) for app ${app.id}:`, syncError);
        this.rollbar.error("Failed to sync social content", {
          uniqueId,
          sourceName,
          socialType,
          userId,
          appId: app.id,
          error: syncError.message || String(syncError),
          stack: syncError.stack,
        });
        // Re-throw to prevent personality rebuild on failed sync
        throw syncError;
      }

      // Rebuild personality after sync (with proper error handling)
      setTimeout(async () => {
        try {
          await this.rebuildPersonalityAndUpdateInstructionAsync(userId, app.id);
        } catch (personalityError) {
          this.logger.error(
            `Error rebuilding personality after sync for app ${app.id}: ${personalityError.message}`,
            personalityError.stack,
          );
        }
      }, 2000);
    } catch (error) {
      this.logger.error(`Error syncing ${sourceName} for app ${uniqueId}:`, error);
      this.rollbar.error("Error syncing data source", {
        uniqueId,
        sourceName,
        userId,
        error: error.message || String(error),
        stack: error.stack,
      });
    }
  }

  /**
   * Fetch and store social content asynchronously
   */
  private async fetchAndStoreSocialContentAsync(
    userId: number,
    appId: number,
    socialType: SocialNetworkType,
    credentials: SocialCredential,
  ): Promise<void> {
    try {
      let contentFetched = false;

      switch (socialType) {
        case SocialNetworkType.FACEBOOK:
          const facebookContent = await this.facebookService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );
          // Store Facebook content in database
          if (facebookContent && Array.isArray(facebookContent)) {
            await Promise.all(
              facebookContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.FACEBOOK,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = facebookContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestFacebookContentToMemoryAsync(facebookContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest Facebook content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        case SocialNetworkType.INSTAGRAM:
          const instagramContent = await this.instagramService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );
          // Store Instagram content in database
          if (instagramContent && Array.isArray(instagramContent)) {
            await Promise.all(
              instagramContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.INSTAGRAM,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = instagramContent.length > 0;
          }
          break;

        case SocialNetworkType.GMAIL:
          const gmailContent = await this.gmailService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
            credentials.refreshToken,
          );
          // Store Gmail content in database
          if (gmailContent && Array.isArray(gmailContent)) {
            await Promise.all(
              gmailContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GMAIL,
                    content: content.content,
                    type: "email" as any,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.sentAt,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = gmailContent.length > 0;
          }
          break;

        case SocialNetworkType.LINKEDIN:
          const linkedinContent = await this.linkedInService.fetchUserContent(userId, credentials.username, appId);
          // Store LinkedIn content in database FIRST
          if (linkedinContent && Array.isArray(linkedinContent)) {
            try {
              await Promise.all(
                linkedinContent.map(async (content, index) => {
                  try {
                    await this.upsertSocialContent(
                      {
                        source: SocialNetworkType.LINKEDIN,
                        content: content.content,
                        type: content.type,
                        externalId: content.externalId,
                        appId: appId,
                        socialContentCreatedAt: content.postedAt,
                        metadata: content.metadata || {},
                      },
                      credentials.id,
                    );
                  } catch (contentError) {
                    this.logger.error(
                      `Failed to upsert LinkedIn content item ${index + 1}/${linkedinContent.length}: ${
                        contentError.message
                      }`,
                      contentError.stack,
                    );
                    // Continue with other items
                  }
                }),
              );
              contentFetched = linkedinContent.length > 0;

              // After DB storage, ingest to memory asynchronously (non-blocking)
              this.ingestLinkedInContentToMemoryAsync(linkedinContent, userId, appId).catch((error) => {
                this.logger.error(`Failed to ingest LinkedIn content to memory for user ${userId}: ${error.message}`);
              });
            } catch (batchError) {
              this.logger.error(`Error processing LinkedIn content batch: ${batchError.message}`, batchError.stack);
              // Still set contentFetched if we have content, even if some items failed
              contentFetched = linkedinContent.length > 0;
            }
          }
          break;

        case SocialNetworkType.REDDIT:
          const redditContent = await this.redditService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );
          // Store Reddit content in database
          if (redditContent && Array.isArray(redditContent)) {
            await Promise.all(
              redditContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.REDDIT,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = redditContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestRedditContentToMemoryAsync(redditContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest Reddit content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        case SocialNetworkType.GITHUB:
          const githubContent = await this.gitHubService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );
          // Store GitHub content in database
          if (githubContent && Array.isArray(githubContent)) {
            await Promise.all(
              githubContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GITHUB,
                    content: content.content,
                    type: content.type as any, // Use the actual type (profile or repository)
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.createdAt,
                    metadata: content.metadata, // Preserve metadata for UI visualization
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = githubContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestGitHubContentToMemoryAsync(githubContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest GitHub content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        case SocialNetworkType.GOODREADS:
          const goodreadsContent = await this.goodreadsService.fetchUserContent(userId, credentials.username, appId);
          // Store Goodreads content in database
          if (goodreadsContent && Array.isArray(goodreadsContent)) {
            await Promise.all(
              goodreadsContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.GOODREADS,
                    content: content.content,
                    type: content.type as any,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                    metadata: content.metadata,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = goodreadsContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestGoodreadsContentToMemoryAsync(goodreadsContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest Goodreads content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        case SocialNetworkType.PRODUCTHUNT:
          const productHuntContent = await this.productHuntService.fetchUserContent(
            userId,
            credentials.accessToken,
            credentials.username,
            appId,
          );
          // Store ProductHunt content in database
          if (productHuntContent && Array.isArray(productHuntContent)) {
            await Promise.all(
              productHuntContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.PRODUCTHUNT,
                    content: content.content,
                    type: content.type as any,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                    metadata: content.metadata,
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = productHuntContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestProductHuntContentToMemoryAsync(productHuntContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest ProductHunt content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        case SocialNetworkType.TWITTER:
          const twitterContent = await this.twitterService.fetchUserContent(userId, credentials.username, appId);
          // Store Twitter content in database
          if (twitterContent && Array.isArray(twitterContent)) {
            await Promise.all(
              twitterContent.map(async (content) => {
                await this.upsertSocialContent(
                  {
                    source: SocialNetworkType.TWITTER,
                    content: content.content,
                    type: content.type,
                    externalId: content.externalId,
                    appId: appId,
                    socialContentCreatedAt: content.postedAt,
                    metadata: content.metadata || {},
                  },
                  credentials.id,
                );
              }),
            );
            contentFetched = twitterContent.length > 0;

            // After DB storage, ingest to memory asynchronously (non-blocking)
            this.ingestTwitterContentToMemoryAsync(twitterContent, userId, appId).catch((error) => {
              this.logger.error(`Failed to ingest Twitter content to memory for user ${userId}: ${error.message}`);
            });
          }
          break;

        default:
          this.logger.warn(`Unsupported social network type: ${socialType}`);
      }

      // Log successful content fetching - personality will be updated centrally
      if (contentFetched) {
        this.logger.log(`Successfully fetched ${socialType} content for app ${appId}`);
      } else {
        this.logger.warn(`No content fetched for ${socialType} for app ${appId} - this might indicate an issue`);
      }
    } catch (error) {
      console.log(error);
      this.logger.error(`Error fetching content for ${socialType}:`, error);
      // Re-throw the error to propagate it up to the caller
      throw error;
    }
  }

  /**
   * Fetch Medium content asynchronously
   */
  private async fetchMediumContentAsync(
    userId: number,
    username: string,
    appId: number,
    credentialId: number,
  ): Promise<void> {
    try {
      const mediumContent = await this.mediumService.fetchUserContent(userId, username, appId);

      // Store Medium content in database
      if (mediumContent && Array.isArray(mediumContent)) {
        await Promise.all(
          mediumContent.map(async (content) => {
            await this.upsertSocialContent(
              {
                source: SocialNetworkType.MEDIUM,
                content: content.content,
                type: content.type,
                externalId: content.externalId,
                appId: appId,
                socialContentCreatedAt: content.postedAt,
              },
              credentialId,
            );
          }),
        );

        // After DB storage, ingest to memory asynchronously (non-blocking)
        if (mediumContent.length > 0) {
          this.ingestMediumContentToMemoryAsync(mediumContent, userId, appId).catch((error) => {
            this.logger.error(`Failed to ingest Medium content to memory for user ${userId}: ${error.message}`);
          });

          this.logger.log(`Successfully fetched Medium content for app ${appId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching Medium content:`, error);
    }
  }

  /**
   * Fetch Goodreads content asynchronously
   */
  private async fetchGoodreadsContentAsync(
    userId: number,
    username: string,
    appId: number,
    credentialId: number,
  ): Promise<void> {
    try {
      const goodreadsContent = await this.goodreadsService.fetchUserContent(userId, username, appId);
      console.log("goodreadsContent", goodreadsContent);

      // Store Goodreads content in database
      if (goodreadsContent && Array.isArray(goodreadsContent)) {
        await Promise.all(
          goodreadsContent.map(async (content) => {
            await this.upsertSocialContent(
              {
                source: SocialNetworkType.GOODREADS,
                content: content.content,
                type: content.type as any,
                externalId: content.externalId,
                appId: appId,
                socialContentCreatedAt: content.postedAt,
                metadata: content.metadata,
              },
              credentialId,
            );
          }),
        );

        // Memory ingestion is already handled by GoodreadsService.fetchUserContent()
        // so we don't need to do it again here to avoid duplication
        if (goodreadsContent.length > 0) {
          this.logger.log(`Successfully fetched ${goodreadsContent.length} Goodreads items for app ${appId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching Goodreads content:`, error);
    }
  }

  /**
   * Fetch Substack content asynchronously
   */
  private async fetchSubstackContentAsync(
    userId: number,
    username: string,
    appId: number,
    credentialId: number,
  ): Promise<void> {
    try {
      const substackContent = await this.substackService.fetchUserContent(userId, username, appId);

      // Store Substack content in database
      if (substackContent && Array.isArray(substackContent)) {
        await Promise.all(
          substackContent.map(async (content) => {
            await this.upsertSocialContent(
              {
                source: SocialNetworkType.SUBSTACK,
                content: content.content,
                type: content.type,
                externalId: content.externalId,
                appId: appId,
                socialContentCreatedAt: content.postedAt,
              },
              credentialId,
            );
          }),
        );

        // After DB storage, ingest to memory asynchronously (non-blocking)
        if (substackContent.length > 0) {
          this.ingestSubstackContentToMemoryAsync(substackContent, userId, appId).catch((error) => {
            this.logger.error(`Failed to ingest Substack content to memory for user ${userId}: ${error.message}`);
          });

          this.logger.log(`Successfully fetched Substack content for app ${appId}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error fetching Substack content:`, error);
    }
  }

  /**
   * Ingest LinkedIn content to memory asynchronously after DB storage
   */
  private async ingestLinkedInContentToMemoryAsync(
    linkedinContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${linkedinContent.length} LinkedIn items`);

      for (const content of linkedinContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "linkedin");
          const link = this.memoryService.generateLinkForContent(content, "linkedin");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.LINKEDIN,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest LinkedIn item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for LinkedIn content`);
    } catch (error) {
      this.logger.error(`Error in async LinkedIn memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Twitter content to memory asynchronously after DB storage
   */
  private async ingestTwitterContentToMemoryAsync(twitterContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${twitterContent.length} Twitter items`);

      for (const content of twitterContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "twitter");
          const link = this.memoryService.generateLinkForContent(content, "twitter");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.TWITTER,
            link,
            content.postedAt,
          );
        } catch (contentError) {
          this.logger.error(`Failed to ingest Twitter item to memory: ${contentError.message}`);
          // Continue with other content items
        }
      }

      this.logger.log(`Completed async memory ingestion for Twitter content`);
    } catch (error) {
      this.logger.error(`Error in async Twitter memory ingestion: ${error.message}`);
    }
  }

  /**
   * Update app with async processing for social credentials and links
   */
  async updateAppAsync(uniqueId: string, updateAppDto: UpdateAppDto, userId: number): Promise<void> {
    try {
      await this.updateApp(uniqueId, updateAppDto, userId);
    } catch (error) {
      this.logger.error("Error in async app update:", error);
      // Don't throw - this runs in background
    }
  }

  /**
   * Delete social credentials and their memories asynchronously
   */
  private async deleteSocialCredentialsAsync(
    userId: number,
    appId: number,
    credentialsToRemove: SocialCredential[],
  ): Promise<void> {
    try {
      this.logger.log(`Starting async deletion of ${credentialsToRemove.length} social credentials for app ${appId}`);

      // Delete memories from external service (this is the time-consuming part)
      for (const credential of credentialsToRemove) {
        try {
          await this.memoryService.deleteSocialMemories(userId, appId, credential.type);
          this.logger.log(`Deleted memories for ${credential.type} (credential ID: ${credential.id})`);
        } catch (error) {
          this.logger.error(`Failed to delete memories for ${credential.type}:`, error);
          // Continue with other deletions even if one fails
        }
        // Delete from Chroma by source
        try {
          await this.chromaService.deleteBySource(appId, credential.type);
          this.logger.log(`Deleted Chroma vectors for source ${credential.type} (credential ID: ${credential.id})`);
        } catch (chromaError) {
          this.logger.error(`Failed to delete Chroma vectors for ${credential.type}:`, chromaError);
        }
      }

      this.logger.log(`Completed async deletion of social credential memories for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error in async social credential deletion for app ${appId}:`, error);
    }
  }

  /**
   * Delete app links and their memories asynchronously
   */
  private async deleteAppLinksAsync(userId: number, appId: number, linksToRemove: AppLink[]): Promise<void> {
    try {
      this.logger.log(`Starting async deletion of ${linksToRemove.length} app links for app ${appId}`);

      // Delete memories from external service (this is the time-consuming part)
      for (const link of linksToRemove) {
        try {
          await this.memoryService.deleteLinkMemories(userId, appId, link.link);
          this.logger.log(`Deleted memories for link: ${link.link}`);
        } catch (error) {
          this.logger.error(`Failed to delete memories for link ${link.link}:`, error);
          // Continue with other deletions even if one fails
        }
        // Delete from Chroma by link
        try {
          await this.chromaService.deleteByLink(appId, link.link);
          this.logger.log(`Deleted Chroma vectors for link: ${link.link}`);
        } catch (chromaError) {
          this.logger.error(`Failed to delete Chroma vectors for link ${link.link}:`, chromaError);
        }
      }

      this.logger.log(`Completed async deletion of app link memories for app ${appId}`);
    } catch (error) {
      this.logger.error(`Error in async app link deletion for app ${appId}:`, error);
    }
  }

  /**
   * Rebuilds personality insights and updates app instruction asynchronously
   * This should be called after adding or removing data sources
   */
  private async rebuildPersonalityAndUpdateInstructionAsync(userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting personality rebuild for app ${appId}`);

      // Get the current app to retrieve original instruction
      const app = await this.appRepository.findOne({
        where: { id: appId },
      });

      if (!app || !app.isMe) {
        this.logger.warn(`App ${appId} not found or not a digital clone app`);
        return;
      }

      // Wait a moment for content to be fully processed
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Build new personality insights from updated content
      const personalityInsights = await this.personalityBuilderService.buildPersonalityFromContent(userId, appId);

      if (personalityInsights) {
        // Use the current instruction as base - this preserves any previous updates
        // and allows for incremental enhancement based on new data
        const baseInstruction = app.instruction || "You are a helpful AI assistant that represents this person.";

        // Generate enhanced instruction with new personality insights
        // This will preserve the current instruction content while updating personality elements
        const enhancedInstruction = await this.personalityBuilderService.generatePersonalityEnhancedInstruction(
          baseInstruction,
          personalityInsights,
        );

        // Update the app with the new enhanced instruction
        await this.appRepository.update(appId, {
          instruction: enhancedInstruction,
        });

        this.logger.log(`Successfully updated instruction for app ${appId} with refreshed personality insights`);
      } else {
        this.logger.warn(`No personality insights generated for app ${appId}`);
      }
    } catch (error) {
      this.logger.error(`Error rebuilding personality for app ${appId}:`, error);
    }
  }

  /**
   * Ingest Facebook content to memory asynchronously after DB storage
   */
  private async ingestFacebookContentToMemoryAsync(
    facebookContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${facebookContent.length} Facebook items`);

      for (const content of facebookContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "facebook");
          const link = this.memoryService.generateLinkForContent(content, "facebook");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.FACEBOOK,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Facebook item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Facebook content`);
    } catch (error) {
      this.logger.error(`Error in async Facebook memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Reddit content to memory asynchronously after DB storage
   */
  private async ingestRedditContentToMemoryAsync(redditContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${redditContent.length} Reddit items`);

      for (const content of redditContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "reddit");
          const link = this.memoryService.generateLinkForContent(content, "reddit");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.REDDIT,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Reddit item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Reddit content`);
    } catch (error) {
      this.logger.error(`Error in async Reddit memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest GitHub content to memory asynchronously after DB storage
   */
  private async ingestGitHubContentToMemoryAsync(githubContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${githubContent.length} GitHub items`);

      for (const content of githubContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "github");
          const link = this.memoryService.generateLinkForContent(content, "github");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.GITHUB,
            link,
            content.createdAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest GitHub item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for GitHub content`);
    } catch (error) {
      this.logger.error(`Error in async GitHub memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Goodreads content to memory asynchronously after DB storage
   */
  private async ingestGoodreadsContentToMemoryAsync(
    goodreadsContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${goodreadsContent.length} Goodreads items`);

      for (const content of goodreadsContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "goodreads");
          const link = this.memoryService.generateLinkForContent(content, "goodreads");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.GOODREADS,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Goodreads item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Goodreads content`);
    } catch (error) {
      this.logger.error(`Error in async Goodreads memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest ProductHunt content to memory asynchronously (non-blocking)
   */
  private async ingestProductHuntContentToMemoryAsync(
    productHuntContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${productHuntContent.length} ProductHunt items`);

      for (const content of productHuntContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "producthunt");
          const link = this.memoryService.generateLinkForContent(content, "producthunt");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            "producthunt",
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest ProductHunt item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for ProductHunt content`);
    } catch (error) {
      this.logger.error(`Error in async ProductHunt memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Medium content to memory asynchronously after DB storage
   */
  private async ingestMediumContentToMemoryAsync(mediumContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${mediumContent.length} Medium items`);

      for (const content of mediumContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "medium");
          const link = this.memoryService.generateLinkForContent(content, "medium");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.MEDIUM,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Medium item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Medium content`);
    } catch (error) {
      this.logger.error(`Error in async Medium memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Substack content to memory asynchronously after DB storage
   */
  private async ingestSubstackContentToMemoryAsync(
    substackContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${substackContent.length} Substack items`);

      for (const content of substackContent) {
        try {
          const formattedContent = this.formatSubstackContentForMemory(content);
          const link = content.metadata?.link || `https://${content.username}.substack.com`;

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.SUBSTACK,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Substack item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Substack content`);
    } catch (error) {
      this.logger.error(`Error in async Substack memory ingestion: ${error.message}`);
    }
  }

  /**
   * Format Substack content for memory storage
   */
  private formatSubstackContentForMemory(content: any): string {
    const timestamp = content.postedAt.toISOString().split("T")[0];
    const metadata = content.metadata;

    return `Substack Article by @${content.username} published on ${timestamp}:

Title: ${metadata?.title || "Untitled"}

Content: ${content.content}

Article URL: ${metadata?.link || ""}`;
  }

  /**
   * Ingest Instagram content to memory asynchronously after DB storage
   */
  private async ingestInstagramContentToMemoryAsync(
    instagramContent: any[],
    userId: number,
    appId: number,
  ): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${instagramContent.length} Instagram items`);

      for (const content of instagramContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "instagram");
          const link = this.memoryService.generateLinkForContent(content, "instagram");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.INSTAGRAM,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Instagram item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Instagram content`);
    } catch (error) {
      this.logger.error(`Error in async Instagram memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Threads content to memory asynchronously after DB storage
   */
  private async ingestThreadsContentToMemoryAsync(threadsContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${threadsContent.length} Threads items`);

      for (const content of threadsContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "threads");
          const link = this.memoryService.generateLinkForContent(content, "threads");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.THREADS,
            link,
            content.postedAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Threads item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Threads content`);
    } catch (error) {
      this.logger.error(`Error in async Threads memory ingestion: ${error.message}`);
    }
  }

  /**
   * Ingest Gmail content to memory asynchronously after DB storage
   */
  private async ingestGmailContentToMemoryAsync(gmailContent: any[], userId: number, appId: number): Promise<void> {
    try {
      this.logger.log(`Starting async memory ingestion for ${gmailContent.length} Gmail items`);

      for (const content of gmailContent) {
        try {
          const formattedContent = this.memoryService.formatContentForMemory(content, "gmail");

          await this.memoryService.ingestSocialContent(
            userId,
            appId,
            content.externalId,
            formattedContent,
            content.type,
            SocialNetworkType.GMAIL,
            undefined,
            content.sentAt,
          );
        } catch (error) {
          this.logger.warn(`Failed to ingest Gmail item ${content.externalId} to memory: ${error.message}`);
          // Continue with other items
        }
      }

      this.logger.log(`Completed async memory ingestion for Gmail content`);
    } catch (error) {
      this.logger.error(`Error in async Gmail memory ingestion: ${error.message}`);
    }
  }

  // Free plan validation methods
  async canAddSocialIntegration(
    userId: number,
    newIntegrationType: SocialNetworkType,
  ): Promise<{ canAdd: boolean; error?: string }> {
    const user = await this.usersService.findById(userId);

    if (user.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
      return { canAdd: true };
    }

    // For free users, check if they've reached the social integration limit
    const existingCredentials = await this.socialCredentialsRepository.find({ where: { userId } });

    if (existingCredentials.length >= FreePlanLimits.maxSocialIntegrations) {
      return {
        canAdd: false,
        error: `Free plan users can connect up to ${FreePlanLimits.maxSocialIntegrations} social media accounts. Upgrade to Plus for unlimited connections.`,
      };
    }

    return { canAdd: true };
  }

  async canAddLinks(userId: number, newLinksCount: number): Promise<{ canAdd: boolean; error?: string }> {
    const user = await this.usersService.findById(userId);

    if (user.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
      return { canAdd: true };
    }

    // For free users, check existing links count
    const existingApp = await this.appRepository.findOne({
      where: { userId },
      relations: ["appLinks"],
    });

    const currentLinksCount = existingApp?.appLinks?.length || 0;
    const totalLinksAfterAdd = currentLinksCount + newLinksCount;

    if (totalLinksAfterAdd > FreePlanLimits.maxLinks) {
      return {
        canAdd: false,
        error: `Free plan users can add up to ${FreePlanLimits.maxLinks} links. Upgrade to Plus for unlimited links.`,
      };
    }

    return { canAdd: true };
  }

  async validateFreePlanLimits(
    userId: number,
    socialCredentials: SocialCredentialsDto[],
    links: string[],
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const user = await this.usersService.findById(userId);

    // Skip validation for Plus users
    if (user.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
      return { isValid: true, errors: [] };
    }

    // Validate social integrations for free users
    if (socialCredentials && socialCredentials.length > 0) {
      for (const credential of socialCredentials) {
        const { canAdd, error } = await this.canAddSocialIntegration(userId, credential.source);
        if (!canAdd && error) {
          errors.push(error);
        }
      }
    }

    // Validate links for free users
    if (links && links.length > 0) {
      const { canAdd, error } = await this.canAddLinks(userId, links.length);
      if (!canAdd && error) {
        errors.push(error);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
