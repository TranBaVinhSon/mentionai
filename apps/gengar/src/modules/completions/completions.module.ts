import { Module } from "@nestjs/common";
import { CompletionsController } from "./completions.controller";
import { CompletionsService } from "./completions.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationRepository } from "src/db/repositories/conversation.repository";
import { Conversation } from "src/db/entities/conversation.entity";
import { Message } from "src/db/entities/message.entity";
import { MessageRepository } from "src/db/repositories/message.repository";
import { App } from "src/db/entities/app.entity";
import { AppRepository } from "src/db/repositories/app.repository";
import { User } from "src/db/entities/user.entity";
import { UserRepository } from "src/db/repositories/user.repository";
import { AppsModule } from "../apps/apps.module";
import { UsageService } from "./usage.service";
import { rollbarProvider } from "src/config/rollbar.provider";
import { MemoryModule } from "../memory/memory.module";
import { RetrievalModule } from "../retrieval/retrieval.module";
import { AppAnalyticsModule } from "../app-analytics/app-analytics.module";
import { EmbeddingsModule } from "../embeddings/embeddings.module";
import { SocialContent } from "src/db/entities/social-content.entity";
import { SocialContentRepository } from "src/db/repositories/social-content.repository";
import { AppLink } from "src/db/entities/app-link.entity";
import { AppLinkRepository } from "src/db/repositories/app-link.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, App, User, SocialContent, AppLink]),
    AppsModule,
    MemoryModule,
    RetrievalModule,
    AppAnalyticsModule,
    EmbeddingsModule,
  ],
  controllers: [CompletionsController],
  providers: [
    CompletionsService,
    ConversationRepository,
    MessageRepository,
    AppRepository,
    UserRepository,
    SocialContentRepository,
    AppLinkRepository,
    UsageService,
    rollbarProvider,
  ],
})
export class CompletionsModule {}
