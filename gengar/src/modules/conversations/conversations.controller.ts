import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  Request as NestjsRequest,
  Res,
  UseGuards,
  ForbiddenException,
  ParseIntPipe,
  Patch,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ConversationsService } from "./conversations.service";
import { CreateConversationRequestDto } from "./dto/create-conversation-request.dto";
import { UpdateConversationDto } from "./dto/update-conversation.dto";
import { Public } from "../auth/public.decorator";
import { CoreMessage, generateText, streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { Conversation } from "src/db/entities/conversation.entity";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ConversationDto } from "./dto/conversation.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedRequest } from "../common/types";
import { UpdateMessageDto } from "../messages/dto/update-message.dto";
import { MessagesService } from "../messages/messages.service";

// POST api/v1/conversations
// POST api/v1/conversations/:id/messages
// GET api/v1/conversations
// GET api/v1/conversations/:id

// POST api/v1/completions
// INPUT
// model: claude-3-5-sonnet-20241022
// conversationId:
// messages: [{ role: "user", content: "I want to be a good engineer" }, role: "assistant", content: "I want to be a good engineer" ]

// OUTPUT
// conversationId
// messages: [{ role: "user", content: "I want to be a good engineer" }, role: "assistant", content: "I want to be a good engineer" ]

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(readonly conversationsService: ConversationsService, readonly messagesService: MessagesService) {}

  @Get("")
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConversationDto,
    isArray: true,
  })
  @ApiOperation({
    tags: ["Conversations"],
    operationId: "Get all conversations",
    summary: "Get all conversations",
  })
  async getConversations(@NestjsRequest() authenticatedRequest: AuthenticatedRequest): Promise<ConversationDto[]> {
    const conversations = await this.conversationsService.findAll(authenticatedRequest.user.id);

    return conversations.map((conversation) => new ConversationDto(conversation));
  }

  @Public()
  @Get("public/debates")
  @ApiResponse({
    status: HttpStatus.OK,
    type: [ConversationDto],
  })
  @ApiOperation({
    tags: ["Conversations"],
    operationId: "Get all public debate conversations",
    summary: "Get all public debate conversations",
  })
  async getPublicDebates(): Promise<ConversationDto[]> {
    const conversations = await this.conversationsService.findAllPublicDebates();

    return conversations.map((conversation) => new ConversationDto(conversation));
  }

  @Get("/:uniqueId")
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConversationDto,
    example: {
      title: "My first conversation",
      uniqueId: "2fc5b2d0-a3e6-4dd4-9069-864a205993a2",
      models: ["gpt-4o-mini", "perplexity"],
      messages: [
        {
          role: "user",
          content: "I want to be a good engineer",
          createdAt: "2024-02-29T12:00:00Z",
        },
        {
          role: "assistant",
          content: "I want to be a good engineer",
          model: "gpt-4o-mini",
          createdAt: "2024-02-29T12:00:00Z",
        },
      ],
      createdAt: "2024-02-29T12:00:00Z",
      updatedAt: "2024-02-29T12:00:00Z",
    },
  })
  @ApiOperation({
    tags: ["Conversations"],
    operationId: "Get a conversation by unique id",
    summary: "Get a conversation by unique id",
  })
  async getConversation(
    @Param("uniqueId") uniqueId: string,
    @NestjsRequest() authenticatedRequest: AuthenticatedRequest,
  ): Promise<ConversationDto> {
    const conversation = await this.conversationsService.getConversation(uniqueId);
    if (conversation.userId !== authenticatedRequest.user.id) {
      throw new ForbiddenException("You are not allowed to access this conversation");
    }

    return new ConversationDto(conversation);
  }

  @Patch(":uniqueId/messages/:id")
  async updateMessage(
    @Param("uniqueId") uniqueId: string,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateMessageDto: UpdateMessageDto,
    @NestjsRequest() authenticatedRequest: AuthenticatedRequest,
  ) {
    return this.messagesService.updateMessageDislike(
      id,
      uniqueId,
      authenticatedRequest.user.id,
      updateMessageDto.dislike,
    );
  }

  @Patch(":uniqueId")
  @ApiOperation({
    tags: ["Conversations"],
    operationId: "Update conversation properties",
    summary: "Update conversation properties",
  })
  async updateConversation(
    @Param("uniqueId") uniqueId: string,
    @Body() updateConversationDto: UpdateConversationDto,
    @NestjsRequest() authenticatedRequest: AuthenticatedRequest,
  ) {
    return this.conversationsService.updateConversation(uniqueId, authenticatedRequest.user.id, updateConversationDto);
  }

  @Public()
  @Get(":uniqueId/shared")
  @ApiResponse({
    status: HttpStatus.OK,
    type: ConversationDto,
  })
  @ApiOperation({
    tags: ["Conversations"],
    operationId: "Get a shared conversation by unique id",
    summary: "Get a shared conversation by unique id (must be public and debate)",
  })
  async getSharedConversation(@Param("uniqueId") uniqueId: string): Promise<ConversationDto> {
    const conversation = await this.conversationsService.getConversation(uniqueId);

    // Verify that the conversation is both public and a debate
    if (!conversation.isPublic || !conversation.isDebate) {
      throw new UnprocessableEntityException("This conversation is not available for sharing");
    }

    return new ConversationDto(conversation);
  }
}
