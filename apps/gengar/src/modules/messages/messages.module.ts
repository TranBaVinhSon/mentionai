import { Module } from "@nestjs/common";
import { Message } from "src/db/entities/message.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MessageRepository } from "src/db/repositories/message.repository";
import { MessagesService } from "./messages.service";
import { Conversation } from "src/db/entities/conversation.entity";
import { ConversationRepository } from "src/db/repositories/conversation.repository";

@Module({
  imports: [TypeOrmModule.forFeature([Message, Conversation])],
  controllers: [],
  providers: [MessagesService, MessageRepository, ConversationRepository],
  exports: [MessagesService],
})
export class MessagesModule {}
