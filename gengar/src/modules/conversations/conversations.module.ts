import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { Conversation } from "src/db/entities/conversation.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConversationRepository } from "src/db/repositories/conversation.repository";
import { S3HandlerModule } from "../s3-handler/s3-handler.module";
import { Message } from "src/db/entities/message.entity";
import { MessageRepository } from "src/db/repositories/message.repository";
import { MessagesModule } from "../messages/messages.module";
import { AppsModule } from "../apps/apps.module";
import { App } from "src/db/entities/app.entity";
import { AppRepository } from "src/db/repositories/app.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, App]), S3HandlerModule, MessagesModule, AppsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationRepository, MessageRepository, AppRepository],
  exports: [ConversationsService],
})
export class ConversationsModule {}
