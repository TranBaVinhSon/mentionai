import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Message } from "../entities/message.entity";

@Injectable()
export class MessageRepository extends Repository<Message> {
  constructor(private dataSource: DataSource) {
    super(Message, dataSource.createEntityManager());
  }

  async findByConversationId(conversationId: number): Promise<Message[]> {
    return await this.find({ where: { conversationId } });
  }

  async findRecentByConversation(conversationId: number, limit = 10): Promise<Message[]> {
    return this.createQueryBuilder("message")
      .where("message.conversationId = :conversationId", { conversationId })
      .orderBy("message.createdAt", "DESC")
      .limit(limit)
      .getMany();
  }

  async findRecentByUser(userId: number, limit = 20): Promise<Message[]> {
    return this.createQueryBuilder("message")
      .leftJoin("message.conversation", "conversation")
      .where("conversation.userId = :userId", { userId })
      .orderBy("message.createdAt", "DESC")
      .limit(limit)
      .getMany();
  }

  async searchByContent(query: string, userId?: number, conversationId?: number, limit = 10): Promise<Message[]> {
    const queryBuilder = this.createQueryBuilder("message")
      .where("LOWER(message.content) LIKE LOWER(:query)", {
        query: `%${query}%`,
      })
      .orderBy("message.createdAt", "DESC")
      .limit(limit);

    if (conversationId) {
      queryBuilder.andWhere("message.conversationId = :conversationId", {
        conversationId,
      });
    } else if (userId) {
      queryBuilder
        .leftJoin("message.conversation", "conversation")
        .andWhere("conversation.userId = :userId", { userId });
    }

    return queryBuilder.getMany();
  }
}
