import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConversationRepository } from "src/db/repositories/conversation.repository";

import { MessageRepository } from "src/db/repositories/message.repository";

@Injectable()
export class MessagesService {
  constructor(private messageRepository: MessageRepository, private conversationRepository: ConversationRepository) {}

  async updateMessageDislike(id: number, conversationUniqueId: string, userId: number, dislike: boolean) {
    const [message, conversation] = await Promise.all([
      this.messageRepository.findOne({ where: { id } }),
      this.conversationRepository.findOne({
        where: { uniqueId: conversationUniqueId },
      }),
    ]);

    if (!message || !conversation) {
      throw new NotFoundException("Message or conversation not found");
    }

    if (message.conversationId !== conversation.id) {
      throw new BadRequestException("Message not found in conversation");
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException("You are not allowed to update this message");
    }

    if (dislike !== undefined) {
      await this.messageRepository.update(id, { dislike });
    } else {
      throw new BadRequestException("Invalid dislike parameter");
    }
  }
}
