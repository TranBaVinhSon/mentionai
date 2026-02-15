import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { MessageDto, MessageRole } from "./message.dto";
import { Conversation, ConversationCategory } from "src/db/entities/conversation.entity";
import { AppDto } from "./app.dto";

export class ConversationDto {
  @ApiResponseProperty()
  title: string;

  @ApiResponseProperty()
  uniqueId: string;

  @ApiResponseProperty({
    example: ["gpt-4o-mini", "perplexity"],
  })
  models: string[];

  @ApiResponseProperty({
    example: "2024-02-29T12:00:00Z",
  })
  createdAt: string;

  @ApiResponseProperty({
    example: true,
  })
  isDebate: boolean;

  @ApiResponseProperty({
    example: true,
  })
  isPublic: boolean;

  @ApiResponseProperty({
    example: "education",
  })
  category: ConversationCategory;

  @ApiResponseProperty({
    example: [
      {
        id: "2fc5b2d0-a3e6-4dd4-9069-864a205993a2",
        role: "user",
        content: "I want to be a good engineer",
        model: "gpt-4o-mini",
        createdAt: "2024-02-29T12:00:00Z",
      },
      {
        id: "2fc5b2d0-a3e6-4dd4-9069-864a205993a2",
        role: "assistant",
        content: "I want to be a good engineer",
        model: "gpt-4o-mini",
        createdAt: "2024-02-29T12:00:00Z",
      },
    ],
  })
  messages?: MessageDto[];

  @ApiResponseProperty({
    example: "perplexity",
  })
  app?: AppDto;

  @ApiResponseProperty({
    example: ["What is the capital of France?"],
  })
  followUpQuestions?: string[];

  @ApiResponseProperty({
    example: {
      participants: [
        {
          type: "app",
          app: {
            uniqueId: "perplexity",
          },
        },
      ],
    },
  })
  debateMetadata: any;

  constructor(conversation: Conversation) {
    this.title = conversation.title;
    this.uniqueId = conversation.uniqueId;
    this.models = conversation.models;
    this.createdAt = conversation.createdAt.toString();
    this.followUpQuestions = conversation.followUpQuestions;
    this.isDebate = conversation.isDebate;
    this.isPublic = conversation.isPublic;
    this.debateMetadata = conversation.debateMetadata;
    this.category = conversation.category;

    this.messages = conversation.messages?.map((message) => {
      const messageDto = new MessageDto();
      messageDto.role = message.role as MessageRole;
      messageDto.content = message.content;
      messageDto.models = message.models;
      messageDto.createdAt = message.createdAt;
      messageDto.id = message.id;
      messageDto.toolName = message.toolName;
      messageDto.toolResults = message.toolResults;
      messageDto.appId = message.appId;
      messageDto.app = message.app ? new AppDto(message.app) : undefined;
      messageDto.experimental_attachments = message.attachments?.map((attachment) => ({
        url: attachment.key,
      }));
      return messageDto;
    });

    // Map the app if available
    if (conversation.app) {
      this.app = new AppDto(conversation.app);
    }
  }
}
