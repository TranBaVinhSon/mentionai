import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { pipeline } from "node:stream/promises";
import { CreateConversationRequestDto } from "./dto/create-conversation-request.dto";
import OpenAI from "openai";
import { ConversationRepository } from "src/db/repositories/conversation.repository";
import { Conversation } from "src/db/entities/conversation.entity";
import { Message } from "src/db/entities/message.entity";
import { S3HandlerService } from "../s3-handler/s3-handler.service";
import { AVAILABLE_MODELS } from "src/config/constants";
import { ModelType } from "../models/dto/model.dto";
import { AppsService } from "../apps/apps.service";
import { App } from "src/db/entities/app.entity";
import { AppRepository } from "src/db/repositories/app.repository";
import { MessageRepository } from "src/db/repositories/message.repository";
import { AppDto } from "./dto/app.dto";

@Injectable()
export class ConversationsService {
  private imageModels = AVAILABLE_MODELS.filter((model) => model.modelType === ModelType.IMAGE).map(
    (model) => model.name,
  );
  constructor(
    private conversationsRepository: ConversationRepository,
    private s3HandlerService: S3HandlerService,
    private appsService: AppsService,
    private appRepository: AppRepository,
    private messageRepository: MessageRepository,
  ) {}

  async findAll(userId: number): Promise<Conversation[]> {
    return await this.conversationsRepository.findAllWithoutMessages(userId);
  }

  /**
   * Finds all public debate conversations
   * @returns List of public debate conversations
   */
  async findAllPublicDebates(): Promise<Conversation[]> {
    return await this.conversationsRepository.find({
      where: {
        isPublic: true,
        isDebate: true,
      },
      relations: ["app"],
      order: {
        updatedAt: "DESC",
      },
    });
  }

  async getConversation(uniqueId: string): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { uniqueId },
      relations: ["messages", "app"],
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    // Check if this is a debate conversation and update message appIds
    if (conversation.isDebate) {
      await this.updateMessageAppAssociations(conversation);
    }

    // Process message attachments and content
    await Promise.all(
      conversation.messages.map(async (message) => {
        // Handle user message attachments
        if (message.role === "user" && message.attachments && message.attachments.length > 0) {
          message.attachments = await Promise.all(
            message.attachments.map(async (attachment) => ({
              key: await this.s3HandlerService.generateSignedUrl(attachment.key),
            })),
          );
        }

        // For debate mode, add app information to messages with appId
        if (conversation.isDebate && message.appId) {
          const app = await this.appRepository.findOne({
            where: { id: message.appId },
          });
          if (app) {
            // Create app object matching MessageDto format
            message.app = {
              id: app.id,
              name: app.name,
              displayName: app.displayName,
              logo: await this.appsService.getLogo(app),
            } as any; // Use type assertion to avoid type issues
          }
        }

        // Handle image content
        if (this.isMessageImage(message)) {
          const s3Links = this.extractAllS3Links(message.content);
          if (s3Links.length > 0) {
            await Promise.all(
              s3Links.map(async (s3Link) => {
                const key = this.extractS3Key(s3Link);
                if (!key) return;

                const signedUrl = await this.s3HandlerService.generateSignedUrl(key);
                const fullS3Link = this.extractFullS3Link(message.content, s3Link);
                if (fullS3Link) {
                  message.content = message.content.replace(fullS3Link, signedUrl);
                }
              }),
            );
          }
        }
      }),
    );

    // Sort messages by id in ascending order
    conversation.messages.sort((a, b) => a.id - b.id);

    if (conversation.app) {
      conversation.app.logo = await this.appsService.getLogo(conversation.app);
    }

    return conversation;
  }

  // TODO: Store userId, conversationId
  // Input: Here is an image of Japan in winter: ![Japan in winter](https://gengar-local.s3.ap-northeast-1.amazonaws.com/4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png?AWSAccessKeyId=AKIA2OAJUFLYDMVSBQGU&Expires=1726892629&Signature=MhKeertSbw1qZfWK51vUgqUhaE8%3D)
  // Output: https://gengar-local.s3.ap-northeast-1.amazonaws.com/4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png
  private extractS3Link(content: string): string | null {
    const regex = /https:\/\/[^\s]+\.s3\.[^\s]+\.amazonaws\.com\/[^\s]+\.(png|webp|jpeg|jpg)/;
    const match = content.match(regex);
    return match ? match[0] : null;
  }

  // https://gengar-local.s3.ap-northeast-1.amazonaws.com/4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png?AWSAccessKeyId=AKIA2OAJUFLYDMVSBQGU&Expires=1726892629&Signature=MhKeertSbw1qZfWK51vUgqUhaE8%3D
  // Output: 4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png
  private extractS3Key(s3Link: string): string | null {
    const regex = /https:\/\/[^\s]+\.s3\.[^\s]+\.amazonaws\.com\/([^\s]+\.[^\s]+)/;
    const match = s3Link.match(regex);
    return match ? match[1] : null;
  }

  // Input: Here is an image of Japan in winter: ![Japan in winter](https://gengar-local.s3.ap-northeast-1.amazonaws.com/4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png?AWSAccessKeyId=AKIA2OAJUFLYDMVSBQGU&Expires=1726892629&Signature=MhKeertSbw1qZfWK51vUgqUhaE8%3D)
  // Output: https://gengar-local.s3.ap-northeast-1.amazonaws.com/4/2bfc5a32-9871-46a8-baf2-88c4055f0ee1.png?AWSAccessKeyId=AKIA2OAJUFLYDMVSBQGU&Expires=1726892629&Signature=MhKeertSbw1qZfWK51vUgqUhaE8%3D
  private extractFullS3Link(content: string, baseUrl: string): string | null {
    const escapedBaseUrl = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${escapedBaseUrl}(\\?[^\\s]*)?(?=\\))`, "g");
    const match = content.match(regex);
    return match ? match[0] : null;
  }

  private extractAllS3Links(content: string): string[] {
    const regex = /https:\/\/[^\s]+\.s3\.[^\s]+\.amazonaws\.com\/[^\s]+\.(png|webp|jpeg|jpg)/g;
    return content.match(regex) || [];
  }

  private isMessageImage(message: Message): boolean {
    if (!message.models) {
      return false;
    }
    for (const model of message.models) {
      if (this.imageModels.includes(model)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Updates message app associations by checking if any message's models field
   * contains an app's uniqueId, and updating the message.appId accordingly
   */
  private async updateMessageAppAssociations(conversation: Conversation): Promise<void> {
    if (!conversation.messages || conversation.messages.length === 0) {
      return;
    }

    // First check if there are any app associations in debateMetadata
    const appMappingFromMetadata: Record<string, { id: number; uniqueId: string }> = {};
    if (conversation.debateMetadata?.participants) {
      for (const participant of conversation.debateMetadata.participants) {
        if (participant.type === "app" && participant.app) {
          const app = participant.app;
          appMappingFromMetadata[app.uniqueId] = {
            id: app.id,
            uniqueId: app.uniqueId,
          };
        }
      }
    }

    // Process each message
    const updatedMessages: Message[] = [];
    for (const message of conversation.messages) {
      if (message.role === "assistant" && message.models && message.models.length > 0) {
        let appFound = false;

        // Check if any of the models matches an app uniqueId
        for (const modelId of message.models) {
          // First check in our metadata mapping
          if (appMappingFromMetadata[modelId]) {
            if (!message.appId || message.appId !== appMappingFromMetadata[modelId].id) {
              message.appId = appMappingFromMetadata[modelId].id;
              updatedMessages.push(message);
              appFound = true;
              console.log(`Updated message ${message.id} with app ID ${message.appId} from debateMetadata`);
            }
            break;
          }

          // If not found in metadata, try to look it up in the database
          if (!appFound) {
            try {
              const app = await this.appRepository.findOne({
                where: { uniqueId: modelId },
              });

              if (app && (!message.appId || message.appId !== app.id)) {
                message.appId = app.id;
                updatedMessages.push(message);
                console.log(`Updated message ${message.id} with app ID ${app.id} from database lookup`);
              }
            } catch (error) {
              console.error(`Error finding app for uniqueId ${modelId}:`, error);
            }
          }
        }
      }
    }

    // Save any updated messages
    if (updatedMessages.length > 0) {
      console.log(`Saving ${updatedMessages.length} updated messages with app associations`);
      await this.messageRepository.save(updatedMessages);
    }
  }

  /**
   * Updates conversation properties such as isPublic
   * @param uniqueId The unique identifier of the conversation to update
   * @param updateData Object containing properties to update
   * @returns Updated conversation
   */
  async updateConversation(
    uniqueId: string,
    userId: number,
    updateData: { isPublic?: boolean },
  ): Promise<Conversation> {
    const conversation = await this.conversationsRepository.findOne({
      where: { uniqueId },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    if (conversation.userId !== userId) {
      throw new ForbiddenException("You are not allowed to update this conversation");
    }

    // Update only the fields that are provided
    if (updateData.isPublic !== undefined) {
      conversation.isPublic = updateData.isPublic;
    }

    // Save the updated conversation
    return this.conversationsRepository.save(conversation);
  }
}
