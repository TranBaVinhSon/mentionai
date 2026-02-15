import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HttpModule } from "@nestjs/axios";
import { AppAnalyticsController } from "./app-analytics.controller";
import { AppAnalyticsService } from "./app-analytics.service";
import { PostHogService } from "./posthog.service";
import { App } from "src/db/entities/app.entity";
import { Conversation } from "src/db/entities/conversation.entity";
import { Message } from "src/db/entities/message.entity";
import { User } from "src/db/entities/user.entity";
import { AppsModule } from "../apps/apps.module";
import { rollbarProvider } from "src/config/rollbar.provider";

@Module({
  imports: [TypeOrmModule.forFeature([App, Conversation, Message, User]), HttpModule, AppsModule],
  controllers: [AppAnalyticsController],
  providers: [AppAnalyticsService, PostHogService, rollbarProvider],
  exports: [AppAnalyticsService],
})
export class AppAnalyticsModule {}
