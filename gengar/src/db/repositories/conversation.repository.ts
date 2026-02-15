import { DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Conversation } from "../entities/conversation.entity";

@Injectable()
export class ConversationRepository extends Repository<Conversation> {
  constructor(private dataSource: DataSource) {
    super(Conversation, dataSource.createEntityManager());
  }

  async findAllWithoutMessages(userId: number): Promise<Conversation[]> {
    return this.createQueryBuilder("conversation")
      .select([
        "conversation.id",
        "conversation.uniqueId",
        "conversation.title",
        "conversation.createdAt",
        "conversation.updatedAt",
        "conversation.models",
        "conversation.isDebate",
      ])
      .where("conversation.userId = :userId", { userId })
      .orderBy("conversation.id", "DESC")
      .getMany();
  }

  async findOneByUniqueId(uniqueId: string): Promise<Conversation | null> {
    return await this.findOne({ where: { uniqueId } });
  }
}
