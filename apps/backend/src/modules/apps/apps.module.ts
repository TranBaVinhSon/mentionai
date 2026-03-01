import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { App } from "src/db/entities/app.entity";
import { AppsService } from "./apps.service";
import { AppsController } from "./apps.controller";
import { AppRepository } from "src/db/repositories/app.repository";
import { S3HandlerModule } from "../s3-handler/s3-handler.module";
import { SocialCredentialsRepository } from "src/db/repositories/social-credential.repository";
import { MemoryModule } from "../memory/memory.module";
import { LinkedInModule } from "../linkedin/linkedin.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { FacebookService } from "./services/facebook.service";
import { InstagramService } from "./services/instagram.service";
import { ThreadsService } from "./services/threads.service";
import { LinkedInService } from "./services/linkedin.service";
import { RedditService } from "./services/reddit.service";
import { GmailService } from "./services/gmail.service";
import { MediumService } from "./services/medium.service";
import { GitHubService } from "./services/github.service";
import { PersonalityBuilderService } from "./services/personality-builder.service";
import { SocialCredential } from "src/db/entities/social-credential.entity";
import { AppLink } from "src/db/entities/app-link.entity";
import { SocialContent } from "src/db/entities/social-content.entity";
import { AppLinkRepository } from "src/db/repositories/app-link.repository";
import { SocialContentRepository } from "src/db/repositories/social-content.repository";
import { GoodreadsService } from "./services/goodreads.service";
import { ProductHuntService } from "./services/producthunt.service";
import { SubstackService } from "./services/substack.service";
import { LinkMetadataService } from "./services/link-metadata.service";
import { YouTubeService } from "./services/youtube.service";
import { rollbarProvider } from "src/config/rollbar.provider";
import { TwitterService } from "./services/twitter.service";
import { TwitterModule } from "../twitter/twitter.module";
import { UsersModule } from "../users/users.module";
import { ChromaModule } from "../chroma/chroma.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([App, SocialCredential, AppLink, SocialContent]),
    S3HandlerModule,
    MemoryModule,
    LinkedInModule,
    TwitterModule,
    EmbeddingsModule,
    UsersModule,
    ChromaModule,
  ],
  controllers: [AppsController],
  providers: [
    AppsService,
    AppRepository,
    SocialCredentialsRepository,
    AppLinkRepository,
    SocialContentRepository,
    FacebookService,
    InstagramService,
    ThreadsService,
    LinkedInService,
    TwitterService,
    RedditService,
    GmailService,
    MediumService,
    GitHubService,
    GoodreadsService,
    ProductHuntService,
    SubstackService,
    PersonalityBuilderService,
    LinkMetadataService,
    YouTubeService,
    rollbarProvider,
  ],
  exports: [
    AppsService,
    AppRepository,
    FacebookService,
    InstagramService,
    ThreadsService,
    LinkedInService,
    TwitterService,
    RedditService,
    GmailService,
    MediumService,
    GitHubService,
    GoodreadsService,
    ProductHuntService,
    SubstackService,
    SocialCredentialsRepository,
    SocialContentRepository,
    LinkMetadataService,
    YouTubeService,
  ],
})
export class AppsModule {}
