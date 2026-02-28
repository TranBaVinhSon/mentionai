import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, In } from "typeorm";
import { App } from "src/db/entities/app.entity";
import { Conversation } from "src/db/entities/conversation.entity";
import { Message } from "src/db/entities/message.entity";
import { User } from "src/db/entities/user.entity";
import { AnalyticsResponseDto } from "./dto/analytics-response.dto";
import { ConversationListResponseDto } from "./dto/conversation-list-response.dto";
import { PostHogService } from "./posthog.service";

@Injectable()
export class AppAnalyticsService {
  constructor(
    @InjectRepository(App)
    private appRepository: Repository<App>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private postHogService: PostHogService,
  ) {}

  async getAnalytics(uniqueId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsResponseDto> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    // Use Promise.all to fetch PostHog data and conversation stats in parallel
    const [postHogData, { totalConversations, totalMessages }] = await Promise.all([
      this.postHogService.getAppAnalytics(uniqueId, startDate, endDate),
      this.getConversationStats(app.id, startDate, endDate),
    ]);

    return {
      ...postHogData,
      totalConversations,
      totalMessages,
    };
  }

  private async getConversationStats(
    appId: number,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ totalConversations: number; totalMessages: number }> {
    const whereConditions: any = { appId };

    if (startDate && endDate) {
      whereConditions.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      whereConditions.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      whereConditions.createdAt = LessThanOrEqual(endDate);
    }

    const totalConversations = await this.conversationRepository.count({
      where: whereConditions,
    });

    const totalMessages = await this.messageRepository.count({
      where: whereConditions,
    });

    return { totalConversations, totalMessages };
  }

  async getBasicAnalytics(uniqueId: string): Promise<{ totalConversations: number; totalMessages: number }> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    return this.getConversationStats(app.id);
  }

  async getConversations(
    uniqueId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
    offset?: number,
  ): Promise<ConversationListResponseDto> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    const whereConditions: any = {
      appId: app.id,
    };

    // Don't filter conversations by date range for the conversations list
    // We want to show all conversations regardless of when they were created
    // The date range filtering is more relevant for analytics, not for the conversation list

    // Get all conversations without pagination by default
    const [conversations, total] = await this.conversationRepository.findAndCount({
      where: whereConditions,
      relations: ["user"],
      order: {
        updatedAt: "DESC",
        createdAt: "DESC",
      },
      ...(limit && { take: limit }),
      ...(offset && { skip: offset }),
    });

    if (conversations.length === 0) {
      return {
        total,
        limit: limit || total,
        offset: offset || 0,
        conversations: [],
      };
    }

    // Extract conversation IDs for bulk queries
    const conversationIds = conversations.map((c) => c.id);

    // Fetch all messages for all conversations in one query
    const [allMessages, messageCounts, lastMessages] = await Promise.all([
      this.messageRepository.find({
        where: { conversationId: In(conversationIds) },
        order: { createdAt: "ASC" },
      }),
      // Get message count for each conversation
      this.messageRepository
        .createQueryBuilder("message")
        .select("message.conversationId", "conversationId")
        .addSelect("COUNT(message.id)", "count")
        .where("message.conversationId IN (:...conversationIds)", { conversationIds })
        .groupBy("message.conversationId")
        .getRawMany(),
      // Get last message for each conversation
      this.messageRepository
        .createQueryBuilder("message")
        .select("message.conversationId", "conversationId")
        .addSelect("MAX(message.createdAt)", "lastMessageAt")
        .where("message.conversationId IN (:...conversationIds)", { conversationIds })
        .groupBy("message.conversationId")
        .getRawMany(),
    ]);

    // Group messages by conversation ID
    const messagesByConversation = allMessages.reduce((acc, message) => {
      if (!acc[message.conversationId]) {
        acc[message.conversationId] = [];
      }
      acc[message.conversationId].push(message);
      return acc;
    }, {});

    // Create lookup maps for message counts and last message times
    const messageCountMap = messageCounts.reduce((acc, item) => {
      acc[item.conversationId] = parseInt(item.count);
      return acc;
    }, {});

    const lastMessageMap = lastMessages.reduce((acc, item) => {
      acc[item.conversationId] = item.lastMessageAt;
      return acc;
    }, {});

    // Build final result
    const conversationsWithMessages = conversations.map((conversation) => {
      const messages = messagesByConversation[conversation.id] || [];
      const messageCount = messageCountMap[conversation.id] || 0;
      const lastMessageAt = lastMessageMap[conversation.id] || conversation.createdAt;

      return {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount,
        lastMessageAt,
        user: conversation.user
          ? {
              email: conversation.user.email,
              avatar: conversation.user.avatar || "",
            }
          : null,
        messages: messages.map((message) => ({
          id: message.id,
          content: message.content,
          role: message.role,
          createdAt: message.createdAt,
        })),
      };
    });

    // Sort by lastMessageAt (most recent first) to ensure conversations with recent activity appear first
    conversationsWithMessages.sort((a, b) => {
      const aTime = new Date(a.lastMessageAt).getTime();
      const bTime = new Date(b.lastMessageAt).getTime();
      return bTime - aTime; // DESC order
    });

    return {
      total,
      limit: limit || total,
      offset: offset || 0,
      conversations: conversationsWithMessages,
    };
  }

  /**
   * Get top questions asked to the app (first user message in each conversation)
   */
  async getTopQuestions(
    uniqueId: string,
    limit: number = 10,
  ): Promise<{ questions: Array<{ question: string; count: number }> }> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    // Get the first user message from each conversation (the opening question)
    const results = await this.messageRepository
      .createQueryBuilder("message")
      .select("message.content", "question")
      .addSelect("COUNT(*)", "count")
      .innerJoin("message.conversation", "conversation")
      .where("conversation.appId = :appId", { appId: app.id })
      .andWhere("message.role = :role", { role: "user" })
      .andWhere(
        "message.id = (SELECT MIN(m2.id) FROM messages m2 WHERE m2.\"conversationId\" = conversation.id AND m2.role = :role)",
        { role: "user" },
      )
      .groupBy("message.content")
      .orderBy("count", "DESC")
      .limit(limit)
      .getRawMany();

    return {
      questions: results.map((r) => ({
        question: r.question,
        count: parseInt(r.count),
      })),
    };
  }

  /**
   * Get engagement metrics: avg messages per conversation, unique users, repeat visitor rate
   */
  async getEngagementMetrics(
    uniqueId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    avgMessagesPerConversation: number;
    uniqueUsers: number;
    repeatVisitorRate: number;
    totalConversations: number;
  }> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Run queries in parallel
    const [avgResult, uniqueUsersResult, repeatUsersResult, totalConversations] = await Promise.all([
      // Average messages per conversation
      this.messageRepository
        .createQueryBuilder("message")
        .select("AVG(msg_count.count)", "avg")
        .from((subQuery) => {
          let qb = subQuery
            .select("message.conversationId", "conversationId")
            .addSelect("COUNT(message.id)", "count")
            .from(Message, "message")
            .innerJoin("message.conversation", "conversation")
            .where("conversation.appId = :appId", { appId: app.id });
          if (dateFilter.length > 0) {
            qb = qb.andWhere(dateFilter[0], dateFilter[1]);
          }
          return qb.groupBy("message.conversationId");
        }, "msg_count")
        .getRawOne(),
      // Unique users
      this.conversationRepository
        .createQueryBuilder("conversation")
        .select("COUNT(DISTINCT conversation.userId)", "count")
        .where("conversation.appId = :appId", { appId: app.id })
        .andWhere("conversation.userId IS NOT NULL")
        .getRawOne(),
      // Users with more than 1 conversation (repeat visitors)
      this.conversationRepository
        .createQueryBuilder("conversation")
        .select("COUNT(*)", "count")
        .from((subQuery) => {
          return subQuery
            .select("conversation.userId", "userId")
            .from(Conversation, "conversation")
            .where("conversation.appId = :appId", { appId: app.id })
            .andWhere("conversation.userId IS NOT NULL")
            .groupBy("conversation.userId")
            .having("COUNT(conversation.id) > 1");
        }, "repeat_users")
        .getRawOne(),
      // Total conversations
      this.conversationRepository.count({ where: { appId: app.id } }),
    ]);

    const uniqueUsers = parseInt(uniqueUsersResult?.count || "0");
    const repeatUsers = parseInt(repeatUsersResult?.count || "0");

    return {
      avgMessagesPerConversation: parseFloat(avgResult?.avg || "0"),
      uniqueUsers,
      repeatVisitorRate: uniqueUsers > 0 ? repeatUsers / uniqueUsers : 0,
      totalConversations,
    };
  }

  /**
   * Get topic breakdown based on ConversationCategory distribution
   */
  async getTopicBreakdown(
    uniqueId: string,
  ): Promise<{ topics: Array<{ category: string; count: number; percentage: number }> }> {
    const app = await this.appRepository.findOne({ where: { uniqueId } });
    if (!app) {
      throw new NotFoundException("App not found");
    }

    const results = await this.conversationRepository
      .createQueryBuilder("conversation")
      .select("conversation.category", "category")
      .addSelect("COUNT(*)", "count")
      .where("conversation.appId = :appId", { appId: app.id })
      .andWhere("conversation.category IS NOT NULL")
      .groupBy("conversation.category")
      .orderBy("count", "DESC")
      .getRawMany();

    const total = results.reduce((sum, r) => sum + parseInt(r.count), 0);

    return {
      topics: results.map((r) => ({
        category: r.category,
        count: parseInt(r.count),
        percentage: total > 0 ? (parseInt(r.count) / total) * 100 : 0,
      })),
    };
  }

  private buildDateFilter(startDate?: Date, endDate?: Date): [string, any] | [] {
    if (startDate && endDate) {
      return ["conversation.createdAt BETWEEN :startDate AND :endDate", { startDate, endDate }];
    } else if (startDate) {
      return ["conversation.createdAt >= :startDate", { startDate }];
    } else if (endDate) {
      return ["conversation.createdAt <= :endDate", { endDate }];
    }
    return [];
  }
}
