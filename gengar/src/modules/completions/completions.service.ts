import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Logger,
  Inject, // Import Logger
} from "@nestjs/common";
import { CreateCompletionRequestDto } from "./dto/create-completion-request.dto";
import {
  streamText,
  stepCountIs,
  CoreMessage,
  CoreUserMessage,
  StreamTextResult,
  LanguageModel,
  TextStreamPart,
  tool,
} from "ai";
import { z } from "zod";
import { ConversationRepository } from "src/db/repositories/conversation.repository";
import { Conversation, ConversationCategory } from "src/db/entities/conversation.entity";
import { randomUUID } from "crypto";
import { webSearchAgent } from "src/agents/web-search";
import type { ExaSearchResult, WebSearchAgentOptions } from "src/agents/web-search";
import { retrieveContentFromUrlAgent } from "src/agents/retrieve-content-from-url";
import { generateImageAgent } from "src/agents/generate-image";

import { Response } from "express";
import { delay, modelStringToLanguageModel } from "../common/utils";
import { AuthenticatedRequest } from "../common/types";
import { MessageRepository } from "src/db/repositories/message.repository";
import { Message } from "src/db/entities/message.entity";
import { GengarSubscriptionPlan } from "src/db/entities/user.entity";
import { AVAILABLE_MODELS } from "src/config/constants";
import { AppRepository } from "src/db/repositories/app.repository";
import { App } from "src/db/entities/app.entity";
import { UserRepository } from "src/db/repositories/user.repository";
import { User } from "src/db/entities/user.entity";
import { AppsService } from "src/modules/apps/apps.service";
import { AppLinkRepository } from "src/db/repositories/app-link.repository";
import { extractS3KeyFromSignedUrl, generateConversationTitle } from "./utils";
import { UsageService } from "./usage.service";
import { getSystemPrompt } from "./prompts/get-system-prompt";
import { getDeepThinkSystemPrompt } from "./prompts/get-deep-think-system-prompt";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { getGroupChatSystemPrompt } from "./prompts/get-group-chat-system-prompt";
import { MemoryService } from "../memory/memory.service";
import { RetrievalOrchestratorService } from "../retrieval/retrieval-orchestrator.service";
import { MemorySearchResult } from "../retrieval/types/retrieval.types";
import { AppAnalyticsService } from "../app-analytics/app-analytics.service";
import { SocialContentRepository } from "src/db/repositories/social-content.repository";
import { EmbeddingsService } from "../embeddings/embeddings.service";

// Define your TOOLS type if not already defined
type TOOLS = Record<string, any>;
export type CHUNK = Extract<
  TextStreamPart<TOOLS>,
  {
    type: "text-delta" | "tool-call" | "tool-call-streaming-start" | "tool-call-delta" | "tool-result";
  }
>;

interface ResponseChunk {
  type: "text" | "tool-results" | "memory-sources" | "conversation-title" | "deep-think-progress";
  content?: string;
  models?: string[];
  conversationUniqueId?: string;
  conversationTitle?: string;
  toolResults?: {
    toolName: string;
    result: any;
  }[];
  memorySources?: {
    id: string | number;
    memory?: string;
    content?: string;
    source?: string;
    type?: string;
    timestamp?: string;
    relevanceScore?: number;
    metadata?: Record<string, any>;
    createdAt?: string;
    // New metadata fields for reference tracking
    toolName?: string;
    foundByTools?: string[];
    bestScore?: number;
    isNewReference?: boolean; // Always true when sent
  }[];
  // Add reference summary
  referenceSummary?: {
    totalUnique: number;
    totalSent: number;
    toolExecutionNumber: number;
    newInThisRound: number;
    toolBreakdown: Record<string, number>;
  };
  deepThinkProgress?: DeepThinkProgressPayload;
}

interface DeepThinkProgressPayload {
  stage: string;
  label?: string;
  message: string;
  planStep?: number;
  totalSteps?: number;
  iteration?: number;
  confidence?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class CompletionsService {
  // Define logger with context
  private readonly logger = new Logger(CompletionsService.name);

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly appRepository: AppRepository,
    private readonly userRepository: UserRepository,
    private readonly appsService: AppsService,
    private readonly usageService: UsageService,
    private readonly memoryService: MemoryService,
    private readonly retrievalOrchestratorService: RetrievalOrchestratorService,
    private readonly appAnalyticsService: AppAnalyticsService,
    private readonly socialContentRepository: SocialContentRepository,
    private readonly embeddingsService: EmbeddingsService,
    private readonly appLinkRepository: AppLinkRepository,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
  ) {}

  // Add an app logo cache as a class property
  private appLogoCache: Record<string, string | null> = {};

  private static readonly WEB_SEARCH_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_WEB_SEARCH_HISTORY = 10;
  private webSearchCache = new Map<string, Map<string, { timestamp: number; result: ExaSearchResult }>>();
  private webSearchHistory = new Map<string, { normalized: string; raw: string }[]>();

  // Add method to preload app logos
  private async preloadAppLogos(appIds: string[]): Promise<void> {
    for (const appId of appIds) {
      // Skip if already cached
      if (this.appLogoCache[appId] !== undefined) continue;

      try {
        const app = await this.appRepository.findOne({
          where: { uniqueId: appId },
        });

        if (app) {
          const logoUrl = await this.appsService.getLogo(app);
          this.appLogoCache[appId] = logoUrl;
        } else {
          this.appLogoCache[appId] = null;
        }
      } catch (error) {
        this.logger.error(`Error preloading logo for app ${appId}`, error.stack, { appId, error });
        this.appLogoCache[appId] = null;
      }
    }
  }

  private normalizeWebSearchQuery(query: string): string {
    return query.trim().replace(/\s+/g, " ").toLowerCase();
  }

  private getCachedWebSearchResult(
    conversationUniqueId: string | undefined,
    query: string,
  ): { result: ExaSearchResult; timestamp: number } | undefined {
    if (!conversationUniqueId) {
      return undefined;
    }

    const normalizedQuery = this.normalizeWebSearchQuery(query);
    const conversationCache = this.webSearchCache.get(conversationUniqueId);
    if (!conversationCache) {
      return undefined;
    }

    const cacheEntry = conversationCache.get(normalizedQuery);
    if (!cacheEntry) {
      return undefined;
    }

    if (Date.now() - cacheEntry.timestamp > CompletionsService.WEB_SEARCH_CACHE_TTL_MS) {
      conversationCache.delete(normalizedQuery);
      if (conversationCache.size === 0) {
        this.webSearchCache.delete(conversationUniqueId);
      }
      return undefined;
    }

    return cacheEntry;
  }

  private setCachedWebSearchResult(
    conversationUniqueId: string | undefined,
    query: string,
    result: ExaSearchResult,
  ): void {
    if (!conversationUniqueId) {
      return;
    }

    const normalizedQuery = this.normalizeWebSearchQuery(query);
    const conversationCache =
      this.webSearchCache.get(conversationUniqueId) ||
      new Map<string, { timestamp: number; result: ExaSearchResult }>();

    conversationCache.set(normalizedQuery, {
      timestamp: Date.now(),
      result,
    });

    this.webSearchCache.set(conversationUniqueId, conversationCache);
  }

  private recordWebSearchQuery(conversationUniqueId: string | undefined, query: string, wasCached: boolean): void {
    if (!conversationUniqueId) {
      return;
    }

    const normalizedQuery = this.normalizeWebSearchQuery(query);
    const trimmedQuery = query.trim();
    const history = this.webSearchHistory.get(conversationUniqueId) || [];
    const existingIndex = history.findIndex((entry) => entry.normalized === normalizedQuery);

    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }

    history.push({
      normalized: normalizedQuery,
      raw: `${trimmedQuery}${wasCached ? " (cached)" : ""}`,
    });

    while (history.length > CompletionsService.MAX_WEB_SEARCH_HISTORY) {
      history.shift();
    }

    this.webSearchHistory.set(conversationUniqueId, history);
  }

  private getRecentWebSearchQueries(conversationUniqueId: string | undefined): string[] {
    if (!conversationUniqueId) {
      return [];
    }

    return (this.webSearchHistory.get(conversationUniqueId) || []).map((entry) => entry.raw);
  }

  private buildWebSearchToolOptions(conversationUniqueId: string | undefined): WebSearchAgentOptions {
    if (!conversationUniqueId) {
      return {};
    }

    return {
      getCachedResult: (query: string) => this.getCachedWebSearchResult(conversationUniqueId, query),
      setCachedResult: (query: string, result: ExaSearchResult) =>
        this.setCachedWebSearchResult(conversationUniqueId, query, result),
      recordQuery: (query: string, wasCached: boolean) =>
        this.recordWebSearchQuery(conversationUniqueId, query, wasCached),
    };
  }

  private appendWebSearchHistoryToSystemPrompt(systemPrompt: string, conversationUniqueId: string | undefined): string {
    const recentQueries = this.getRecentWebSearchQueries(conversationUniqueId);

    if (recentQueries.length === 0) {
      return systemPrompt;
    }

    const historyList = recentQueries.map((query, index) => `${index + 1}. ${query}`).join("\n");
    return `${systemPrompt}

Existing web searches already performed in this conversation:
${historyList}

Do not repeat identical queries unless you intentionally need a refresh. Refine future searches with new keywords, filters, or subtopics to gather new information.`;
  }

  private streamDeepThinkProgress(
    res: Response,
    conversationUniqueId: string,
    models: string[],
    payload: DeepThinkProgressPayload,
  ): void {
    const progressChunk: ResponseChunk = {
      type: "deep-think-progress",
      models,
      conversationUniqueId,
      deepThinkProgress: {
        stage: payload.stage,
        label: payload.label,
        message: payload.message,
        planStep: payload.planStep,
        totalSteps: payload.totalSteps,
        iteration: payload.iteration,
        confidence: payload.confidence,
        metadata: payload.metadata,
      },
    };

    res.write(`data: ${JSON.stringify(progressChunk)}\n\n`);
  }

  public async createCompletion(
    request: CreateCompletionRequestDto,
    res: Response,
    authenticatedRequest: AuthenticatedRequest,
  ): Promise<any> {
    const now = new Date();
    const user = authenticatedRequest.user;
    let app: App;

    if (request.app) {
      // Try to find by name first, then by uniqueId (for URL parameters)
      app = await this.appRepository.findByName(request.app);

      if (!app) {
        app = await this.appRepository.findByUniqueId(request.app);
      }

      if (app) {
        this.logger.log(`[App] Using app from request: ${app.name} (isMe: ${app.isMe}, userId: ${app.userId})`);
      }

      // Security check: Ensure user has access to this app
      // Allow access if: app is official, user is the creator, or app is published
      if (app && !app.isOfficial && app.userId !== user?.id && !app.isPublished) {
        throw new UnauthorizedException("You do not have access to this app");
      }

      // if (app) {
      //   const model = AVAILABLE_MODELS.find(
      //     (model) => model.id === app.baseModelId
      //   )?.name;
      //   request.models = [model];
      // }
    }

    const defaultTextModelName: string = AVAILABLE_MODELS.find((model) => model.id === user?.defaultTextModelId)?.name;

    // Not mention to models but have the setup default model
    if ((!request.models || request.models.length === 0) && defaultTextModelName) {
      request.models = [defaultTextModelName];
    }

    // Not log in user, they can use only gpt-4o-mini
    if (!user && (!request.models || request.models.length === 0)) {
      request.models = ["gpt-4.1-mini"];
    }

    let isConcurrentCall = false;

    // Check if the user would exceed limits
    let isExceedLimits = false;
    if (user?.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
      for (const modelName of request.models) {
        if (this.usageService.checkUsageLimits(user, modelName, res)) {
          isExceedLimits = true;
          break;
        }
      }
    }

    if (isExceedLimits) {
      // End the SSE connection properly
      // res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    // TODO:
    if (user?.subscriptionPlan === GengarSubscriptionPlan.FREE) {
      // Free users can only use tier 1 models
      request.models = request.models.filter((modelName) => {
        const model = AVAILABLE_MODELS.find((m) => m.name === modelName);
        return model && !model.isProModel;
      });
    }

    // Normal completion
    await Promise.all(
      request.models.map(async (tmpModel) => {
        // TODO: Only text model here
        const model = modelStringToLanguageModel(tmpModel);
        if (!model) {
          throw new BadRequestException("Model not found");
        }

        const fullResponse = {
          toolName: "",
          value: "",
          toolResults: [],
          models: [],
        };

        const processedMessages: CoreMessage[] = request.messages.map((message) => {
          // If this is a user message and has attachments, convert to content array
          if (message.role === "user" && message.experimental_attachments?.length) {
            return {
              role: "user",
              content: [
                { type: "text", text: message.content as string },
                ...message.experimental_attachments.map((attachment) => ({
                  type: "image",
                  image: attachment.url,
                })),
              ],
            } as CoreUserMessage;
          }

          // Otherwise return simple string content message
          return {
            role: message.role,
            content: message.content as string,
          } as CoreMessage;
        });

        const { isAnonymous, conversationUniqueId } = request;
        let conversation: Conversation;
        let newConversationUniqueId;

        // For existing conversation
        if (conversationUniqueId) {
          newConversationUniqueId = conversationUniqueId;
          conversation = await this.conversationRepository.findOne({
            where: { uniqueId: conversationUniqueId },
            relations: ["app"],
          });

          if (!conversation) {
            throw new BadRequestException("Conversation not found");
          }

          // For anonymous conversations (userId is null), allow access
          // For authenticated conversations, verify ownership
          if (conversation.userId !== null && conversation.userId !== user?.id) {
            throw new UnauthorizedException("Conversation isn't belong to user");
          }

          // Use the app from the existing conversation if not already set
          if (conversation.app && !app) {
            app = conversation.app;
            this.logger.log(
              `[App] Using app from conversation: ${app.name} (isMe: ${app.isMe}, userId: ${app.userId})`,
            );
          }

          // For the new conversation
        } else if (request.newUniqueId) {
          newConversationUniqueId = request.newUniqueId;
        } else {
          newConversationUniqueId = randomUUID();
        }

        let result: StreamTextResult<TOOLS, any>;
        // Initialize tool execution tracking for reference deduplication
        let toolExecutionCount = 0;

        const isDeepThinkMode = !!request.isDeepThinkMode;
        const deepThinkConfig = {
          maxRounds: 10,
          forceWebSearch: true,
          maxItemsPerSource: 10,
        };
        const deepThinkIterationRef = { value: 0 };
        const hasSentReflectionStage = { value: false };
        const streamDeepThink = (payload: DeepThinkProgressPayload) => {
          if (isDeepThinkMode) {
            this.streamDeepThinkProgress(res, newConversationUniqueId, [tmpModel], payload);
          }
        };

        // Always using gpt4o as a judgement tool to check if the tool call is valid
        // const extractedModels = extractModelsFromRequest(
        //   request.messages[request.messages.length - 1].content
        // );
        // console.log("extractedModels", extractedModels);

        // In case users continue conversation with the current app - MOVE THIS BEFORE TOOL REGISTRATION
        if (conversation?.app) {
          app = conversation.app;
          this.logger.log(
            `[App] Using app from conversation.app: ${app.name} (isMe: ${app.isMe}, userId: ${app.userId})`,
          );
        }

        const tools: Record<string, any> = {};
        let hasUsedWebSearch = false;
        const memorySearchUserId = app?.userId || user?.id || null;

        if (isDeepThinkMode) {
          const deepThinkStageSchema = z.enum(["planning", "research", "analysis", "synthesis", "reflection", "note"]);

          tools.deepThinkProgress = (tool as any)({
            description:
              "Send human-friendly updates to the Deep Think UI. Use this to share plans, interim insights, or synthesis checkpoints.",
            inputSchema: z.object({
              stage: deepThinkStageSchema,
              label: z.string().optional(),
              message: z.string().min(1),
              planStep: z.number().min(1).optional(),
              totalSteps: z.number().min(1).optional(),
              confidence: z.string().optional(),
              metadata: z.record(z.any()).optional(),
            }),
            execute: async ({ stage, label, message, planStep, totalSteps, confidence, metadata }) => {
              streamDeepThink({
                stage,
                label,
                message,
                planStep,
                totalSteps,
                confidence,
                metadata,
                iteration: deepThinkIterationRef.value,
              });

              return { acknowledged: true };
            },
          });

          // Deep Think Mode: Always include web search tool
          tools.webSearch = webSearchAgent(fullResponse, this.buildWebSearchToolOptions(newConversationUniqueId));

          // Deep Think Mode: Always include personal memory retrieval tool when user/app is available
          if (memorySearchUserId) {
            tools.personaMemorySearch = (tool as any)({
              description:
                "Query the creator's personal knowledge base for memories, social content, and documents that match the user's request.",
              inputSchema: z.object({
                query: z.string().min(3),
                maxResults: z.number().min(1).max(40).optional(),
              }),
              execute: async ({ query, maxResults }) => {
                const iteration = ++deepThinkIterationRef.value;
                streamDeepThink({
                  stage: "research",
                  label: "Personal knowledge search",
                  message: `Exploring stored memories for "${query}"`,
                  iteration,
                  metadata: {
                    query,
                    source: "personal-memory",
                    requested: maxResults,
                  },
                });

                const retrievalResults = await this.retrievalOrchestratorService.retrieve({
                  query,
                  userId: memorySearchUserId,
                  appId: app?.id,
                  maxResults: maxResults ?? Math.max(deepThinkConfig.maxItemsPerSource * 2, 10),
                });

                const topMemories = retrievalResults.memories.slice(0, deepThinkConfig.maxItemsPerSource);
                const topContents = (retrievalResults.contents || []).slice(0, deepThinkConfig.maxItemsPerSource);

                const sanitizeMetadata = (metadata: Record<string, any> | undefined) => {
                  if (!metadata) {
                    return {};
                  }
                  const clean = { ...metadata };
                  delete clean.appId;
                  delete clean.userId;
                  delete clean.id;
                  return clean;
                };

                if (topMemories.length > 0 || topContents.length > 0) {
                  const memorySourcesChunk: ResponseChunk = {
                    type: "memory-sources",
                    models: [tmpModel],
                    conversationUniqueId: newConversationUniqueId,
                    memorySources: [
                      ...topMemories.map((memory) => ({
                        id: memory.id,
                        memory: memory.memory,
                        metadata: sanitizeMetadata(memory.metadata),
                        createdAt: memory.createdAt,
                        relevanceScore: memory.relevanceScore,
                        source: memory.metadata?.source || memory.source, // Use metadata.source if available (for chroma sources)
                        toolName: "personaMemorySearch",
                        isNewReference: true,
                      })),
                      ...topContents.map((content) => ({
                        id: content.id,
                        content: content.content,
                        metadata: sanitizeMetadata(content.metadata),
                        createdAt:
                          content.createdAt instanceof Date
                            ? content.createdAt.toISOString()
                            : (content.createdAt as unknown as string),
                        relevanceScore: content.relevanceScore,
                        source: content.metadata?.source || content.source, // Use metadata.source if available
                        toolName: "personaMemorySearch",
                        isNewReference: true,
                        type: content.type,
                      })),
                    ],
                    referenceSummary: {
                      totalUnique: topMemories.length + topContents.length,
                      totalSent: topMemories.length + topContents.length,
                      toolExecutionNumber: iteration,
                      newInThisRound: topMemories.length + topContents.length,
                      toolBreakdown: {
                        personaMemorySearch: topMemories.length + topContents.length,
                      },
                    },
                  };

                  res.write(`data: ${JSON.stringify(memorySourcesChunk)}\n\n`);
                }

                streamDeepThink({
                  stage: "analysis",
                  label: "Personal knowledge findings",
                  message: `Found ${topMemories.length + topContents.length} relevant internal references`,
                  iteration,
                  confidence: retrievalResults.confidenceLevel,
                  metadata: {
                    query,
                    sources: retrievalResults.sourcesUsed,
                    totalResults: retrievalResults.totalResults,
                  },
                });

                return {
                  summary: `Retrieved ${topMemories.length} memories and ${topContents.length} content items for "${query}"`,
                  confidence: retrievalResults.confidenceLevel,
                  memories: topMemories,
                  contents: topContents,
                  queryAnalysis: retrievalResults.queryAnalysis,
                  totalResults: retrievalResults.totalResults,
                };
              },
            });
          }

          // URL content retrieval tool - now enabled for all modes including digital twins
          tools.retrieveContentFromUrl = retrieveContentFromUrlAgent(fullResponse);
        } else {
          tools.webSearch = webSearchAgent(fullResponse, this.buildWebSearchToolOptions(newConversationUniqueId));
          // URL content retrieval tool - now enabled for all modes including digital twins
          tools.retrieveContentFromUrl = retrieveContentFromUrlAgent(fullResponse);
        }

        console.log(
          `[CompletionsService] Tool registration check - app: ${app?.name}, isMe: ${app?.isMe}, user: ${
            user?.id
          }, hasUser: ${!!user}, deepThink: ${isDeepThinkMode}`,
        );

        if (isDeepThinkMode) {
          streamDeepThink({
            stage: "note",
            label: "Deep Think initiated",
            message: "Calibrating persona context and preparing research plan",
            metadata: {
              maxRounds: deepThinkConfig.maxRounds,
              forceWebSearch: deepThinkConfig.forceWebSearch,
              maxItemsPerSource: deepThinkConfig.maxItemsPerSource,
            },
          });
        }

        // Log all available tools before calling LLM
        console.log(
          `[CompletionsService] Final tool list for ${tmpModel}: [${Object.keys(tools).join(", ")}] (${
            Object.keys(tools).length
          } tools)`,
        );
        if (Object.keys(tools).length === 0) {
          console.log(`[CompletionsService] WARNING: No tools available for model ${tmpModel}`);
        }

        if (app) {
        } else {
          if (user?.subscriptionPlan === GengarSubscriptionPlan.PLUS) {
            tools.generateImage = generateImageAgent(fullResponse, user);
          }
        }

        // Log all available tools before calling LLM
        console.log(
          `[CompletionsService] Final tool list for ${tmpModel}: [${Object.keys(tools).join(", ")}] (${
            Object.keys(tools).length
          } tools)`,
        );
        if (Object.keys(tools).length === 0) {
          console.log(`[CompletionsService] WARNING: No tools available for model ${tmpModel}`);
        }

        // let toolChoice: CoreToolChoice<TOOLS> = "auto";
        // if (request.isWebSearchEnabled) {
        //   toolChoice = {
        //     type: "tool",
        //     toolName: "webSearch",
        //   };
        // }

        // Note: Some models (e.g., GPT-5 Responses API) can be strict about tool schemas.
        // Ensure each tool's parameters is a valid JSON Schema object.

        // PROACTIVE MEMORY INTEGRATION: Auto-search memory for personal apps
        let memoryContext = "";
        let isPersonalizedResponse = false;
        const proactiveMemorySources: any[] = [];

        if (app?.isMe && user) {
          try {
            // Get the user's message content for memory search
            const userMessage = (processedMessages[processedMessages.length - 1]?.content as string) || "";

            // Enhance generic queries to be more personal
            const enhancedQuery = userMessage;

            // Search both memory service and retrieval orchestrator
            // For digital clones, use the app owner's ID for memory search since memories are stored under the creator
            const memoryUserId = app.userId || user.id;
            const retrievalResults = await this.retrievalOrchestratorService.retrieve({
              query: enhancedQuery,
              userId: memoryUserId,
              appId: app.id,
              maxResults: 20,
            });

            // DEBUG: Log detailed breakdown
            this.logger.log(
              `[ProactiveMemory] [DEBUG] Retrieval breakdown - ` +
                `memories array: ${retrievalResults.memories ? retrievalResults.memories.length : "undefined"}, ` +
                `contents array: ${retrievalResults.contents ? retrievalResults.contents.length : "undefined"}`,
            );
            this.logger.log(`[ProactiveMemory] [DEBUG] Retrieval keys: ${Object.keys(retrievalResults).join(", ")}`);

            // Format memory context if we have results from Chroma, Mem0, or content sources
            const totalMemories = retrievalResults.memories.length + (retrievalResults.contents?.length || 0);
            if (totalMemories > 0) {
              isPersonalizedResponse = true;

              if (isDeepThinkMode) {
                streamDeepThink({
                  stage: "research",
                  label: "Baseline memory preload",
                  message: `Loaded ${totalMemories} persona references for context seeding`,
                  metadata: {
                    totalMemories,
                    memorySources: retrievalResults.sourcesUsed,
                  },
                });
              }

              this.logger.log(
                `[ProactiveMemory] Found ${retrievalResults.memories.length} memories and ${
                  retrievalResults.contents?.length || 0
                } content items for personalization (total: ${totalMemories})`,
              );

              // Fetch additional social content for memories that have external_id metadata
              const additionalSocialContents = await this.fetchAdditionalSocialContent(
                retrievalResults.memories,
                app.id,
              );

              // Combine memory results with direct content results and fetched social content
              const allMemories = [
                // Chroma/Mem0 memories
                ...retrievalResults.memories.map((memory) => ({
                  id: memory.id,
                  memory: memory.memory,
                  metadata: memory.metadata,
                  created_at: memory.createdAt,
                })),
                // Direct content results (social_content, app_links)
                ...(retrievalResults.contents || []).map((content) => ({
                  id: content.id,
                  memory: content.content, // Map 'content' field to 'memory' for consistent formatting
                  metadata: {
                    ...content.metadata,
                    source: content.source,
                    type: content.type,
                    link: content.link,
                  },
                  created_at: content.createdAt,
                })),
                ...additionalSocialContents, // Add raw social content
              ];

              memoryContext = this.formatMemoryContextForPersonalization(allMemories, userMessage);

              // Send proactive memory sources to frontend via SSE
              if (allMemories.length > 0) {
                // Helper function to clean metadata (remove sensitive fields)
                const cleanMetadata = (metadata: any) => {
                  if (!metadata) return {};
                  const cleaned = { ...metadata };
                  delete cleaned.appId;
                  delete cleaned.userId;
                  delete cleaned.id; // Remove internal database ID
                  return cleaned;
                };

                // Group chunks by parent document for app_link sources
                const documentMap = new Map<string, any>();
                const nonChunkSources: any[] = [];

                // Process Chroma/Mem0 memories
                retrievalResults.memories.slice(0, 20).forEach((memory) => {
                  const metadata = { ...memory.metadata };

                  // Check if this is a chunk from app_link
                  const isChunk = metadata?.origin === "app_link" && metadata?.chunkIndex !== undefined;

                  if (isChunk) {
                    // Use link or document ID as the grouping key
                    const docKey = metadata.link || `doc_${metadata.id}`;

                    if (!documentMap.has(docKey)) {
                      // First chunk of this document - store document metadata only
                      documentMap.set(docKey, {
                        id: docKey,
                        type: "document",
                        link: metadata.link, // Store link for later fetching
                        metadata: cleanMetadata({
                          link: metadata.link,
                          origin: metadata.origin,
                          totalChunks: metadata.totalChunks,
                          createdAt: metadata.createdAt,
                        }),
                        createdAt: memory.createdAt,
                        relevanceScore: memory.relevanceScore,
                        source: memory.source,
                      });
                    }
                  } else {
                    // Not a chunk - send as individual memory (e.g., social posts, regular memories)
                    if (metadata?.source && metadata?.externalId && !metadata?.link) {
                      metadata.link = this.generateSocialLink(metadata.source, metadata.externalId);
                    }
                    // Use metadata.source if available (for chroma sources), otherwise fall back to memory.source
                    const displaySource = metadata?.source || memory.source;
                    nonChunkSources.push({
                      id: memory.id,
                      memory: memory.memory,
                      metadata: cleanMetadata(metadata),
                      createdAt: memory.createdAt,
                      relevanceScore: memory.relevanceScore,
                      source: displaySource,
                    });
                  }
                });

                // Fetch app_link metadata for all document references
                if (documentMap.size > 0 && app?.id) {
                  try {
                    // Extract valid links directly from documentMap
                    const documentLinks: string[] = [];
                    for (const doc of documentMap.values()) {
                      if (doc.link) {
                        documentLinks.push(doc.link);
                      }
                    }

                    // Early exit if no valid links to fetch
                    if (documentLinks.length === 0) {
                      this.logger.debug(`[AppLinkMetadata] No valid document links to fetch metadata for`);
                    } else {
                      // Use repository method for optimized batch fetching
                      const appLinkMap = await this.appLinkRepository.findByLinksWithMetadata(documentLinks, app.id);

                      this.logger.debug(
                        `[AppLinkMetadata] Fetched ${appLinkMap.size} app_link metadata entries for ${documentLinks.length} links`,
                      );

                      // Enhance document references with rich metadata
                      let enrichedCount = 0;
                      for (const doc of documentMap.values()) {
                        if (!doc.link) continue;

                        const appLink = appLinkMap.get(doc.link);
                        if (appLink?.metadata) {
                          // Merge rich metadata from app_links table
                          doc.metadata = {
                            ...doc.metadata,
                            title: appLink.metadata.title,
                            description: appLink.metadata.description,
                            favicon: appLink.metadata.favicon,
                            siteName: appLink.metadata.siteName,
                            image: appLink.metadata.image,
                          };
                          enrichedCount++;
                        }
                      }

                      this.logger.debug(`[AppLinkMetadata] Enriched ${enrichedCount} documents with metadata`);
                    }
                  } catch (error) {
                    this.logger.error(
                      `[AppLinkMetadata] Error fetching app_link metadata for ${documentMap.size} documents:`,
                      error.stack,
                      { appId: app.id, documentCount: documentMap.size },
                    );
                    // Continue without rich metadata if fetch fails
                  }
                }

                // Process content results
                (retrievalResults.contents || []).slice(0, 20).forEach((content) => {
                  const metadata = {
                    ...content.metadata,
                    source: content.source,
                    type: content.type,
                    link:
                      content.link ||
                      this.generateSocialLink(content.metadata?.socialSource, content.metadata?.externalId),
                  };

                  // Use metadata.source if available, otherwise use content.source
                  const displaySource = metadata?.source || content.source;
                  nonChunkSources.push({
                    id: content.id,
                    memory: content.content,
                    metadata: cleanMetadata(metadata),
                    createdAt: content.createdAt?.toISOString() || new Date().toISOString(),
                    relevanceScore: content.relevanceScore,
                    source: displaySource,
                  });
                });

                // Combine document references and non-chunk sources
                const frontendMemorySources = [...Array.from(documentMap.values()), ...nonChunkSources].slice(0, 20); // Limit to 20 total

                // Store memory sources for later saving with the message
                proactiveMemorySources.push(...frontendMemorySources);
                this.logger.log(
                  `[ProactiveMemory] Stored ${proactiveMemorySources.length} memory sources for message saving`,
                );

                const memorySourcesChunk: ResponseChunk = {
                  type: "memory-sources",
                  memorySources: frontendMemorySources,
                  models: [tmpModel],
                  conversationUniqueId: newConversationUniqueId,
                };
                res.write(`data: ${JSON.stringify(memorySourcesChunk)}\n\n`);

                this.logger.log(`[ProactiveMemory] Sent ${frontendMemorySources.length} memory sources to frontend`);
              }
            } else {
              this.logger.log(`[ProactiveMemory] No relevant memories found for query: "${enhancedQuery}"`);
            }
          } catch (error) {
            this.logger.error(`[ProactiveMemory] Error searching memory:`, error.stack);
            // Continue without memory context if search fails
          }
        }

        // For digital clones, we need to get the app creator (the user being cloned)
        let appCreatorUser = user; // Default to current user
        if (app?.isMe && app.userId) {
          // Fetch the actual app creator
          appCreatorUser = await this.userRepository.findOne({ where: { id: app.userId } });
        }

        // Generate system prompt with proactive memory context (if available)
        let systemPrompt = isDeepThinkMode
          ? getDeepThinkSystemPrompt(app, appCreatorUser, {
              personaMemoryContext: memoryContext,
              hasMemorySearch: !!(app?.isMe && user),
              forceWebSearch: deepThinkConfig.forceWebSearch,
            })
          : getSystemPrompt(
              app,
              appCreatorUser, // Pass the app creator (person being cloned) as user
              !hasUsedWebSearch,
              isPersonalizedResponse, // isPersona flag
              memoryContext, // personaMemoryContext
              !!(app?.isMe && user), // hasMemorySearch when in "me" mode
            );

        systemPrompt = this.appendWebSearchHistoryToSystemPrompt(systemPrompt, newConversationUniqueId);

        // AI SDK v5 NATIVE APPROACH: Let SDK handle tool calls automatically
        const maxStepCount = isDeepThinkMode ? Math.max(deepThinkConfig.maxRounds * 2 + 2, 8) : 6;

        try {
          this.logger.log(
            `[AI-SDK] Using AI SDK v5 for automatic tool result handling in ${
              isDeepThinkMode ? "deep-think" : app?.isMe ? "persona" : "normal"
            } mode`,
          );
          result = await streamText({
            model: model as LanguageModel,
            system: systemPrompt,
            messages: processedMessages,
            tools: tools,
            maxRetries: 3,
            stopWhen: stepCountIs(maxStepCount), // Allow multiple tool iterations (AI SDK v5 replaces maxSteps)
            onStepFinish: async (event) => {
              this.logger.log(
                `[AI-SDK] Step ${toolExecutionCount + 1} finished with ${event.toolResults.length} tool results`,
              );
              if (event.toolResults.length > 0) {
                toolExecutionCount++; // Track tool execution order
                const toolResult = event.toolResults[event.toolResults.length - 1];

                if (["generateImage"].includes(toolResult.toolName)) {
                  // Only PLUS users can use these tools
                  this.usageService.incrementImageModelUsage(user);
                }

                // Process each tool result with reference deduplication
                event.toolResults.forEach((toolResult) => {
                  if (toolResult.toolName === "webSearch") {
                    hasUsedWebSearch = true;
                  }

                  const newReferencesToSend: any[] = [];

                  // memory tools removed

                  // Only send NEW, unique references to frontend
                  if (newReferencesToSend.length > 0) {
                    const memorySourcesChunk: ResponseChunk = {
                      type: "memory-sources",
                      memorySources: newReferencesToSend.map((ref) => ({
                        ...ref,
                        isNewReference: true,
                        toolName: toolResult.toolName,
                      })),
                      models: [tmpModel],
                      conversationUniqueId: newConversationUniqueId,
                      referenceSummary: {
                        totalUnique: 0, // Will be calculated by frontend
                        totalSent: 0, // Will be calculated by frontend
                        toolExecutionNumber: toolExecutionCount,
                        newInThisRound: newReferencesToSend.length,
                        toolBreakdown: {}, // Will be calculated by frontend
                      },
                    };
                    res.write(`data: ${JSON.stringify(memorySourcesChunk)}\n\n`);

                    this.logger.log(
                      `[References] Sent ${newReferencesToSend.length} new references from ${toolResult.toolName}. ` +
                        `Total unique references in this execution`,
                    );
                  }

                  // Stream tool results without the raw reference data
                  let shouldStreamToolResult = false;
                  const hasNewReferences = newReferencesToSend.length > 0;

                  // Always stream results for available tools (memory tools removed)
                  shouldStreamToolResult = true;

                  if (shouldStreamToolResult) {
                    const output = toolResult.output as any;

                    if (isDeepThinkMode) {
                      if (toolResult.toolName === "webSearch") {
                        const iteration = ++deepThinkIterationRef.value;
                        const resultCount = output?.results?.length || output?.numberOfResults || 0;
                        streamDeepThink({
                          stage: "research",
                          label: "Web search completed",
                          message: `Collected ${resultCount} web results`,
                          iteration,
                          confidence: output?.confidenceLevel,
                          metadata: {
                            query: output?.query,
                            numberOfResults: output?.numberOfResults ?? resultCount,
                          },
                        });
                      } else if (toolResult.toolName === "retrieveContentFromUrl") {
                        const iteration = ++deepThinkIterationRef.value;
                        streamDeepThink({
                          stage: "analysis",
                          label: "Fetched external content",
                          message: "Retrieved full content from referenced URLs",
                          iteration,
                          metadata: {
                            urls: output?.urls || output?.requestedUrls,
                            characters: typeof output === "string" ? output.length : undefined,
                          },
                        });
                      }
                    }

                    const toolResultsChunk: ResponseChunk = {
                      type: "tool-results",
                      toolResults: [
                        {
                          toolName: toolResult.toolName,
                          result: {
                            ...(typeof output === "object" && output !== null ? output : {}),
                            // Remove raw arrays to avoid duplication
                            memories: undefined,
                            contents: undefined,
                            // Add summary instead
                            summary:
                              output?.summary ||
                              `Found ${(output?.memories?.length || 0) + (output?.contents?.length || 0)} items`,
                            searchMetadata: output?.searchMetadata,
                            newReferencesCount: newReferencesToSend.length,
                          },
                        },
                      ],
                      models: [tmpModel],
                      conversationUniqueId: newConversationUniqueId,
                    };
                    res.write(`data: ${JSON.stringify(toolResultsChunk)}\n\n`);
                  }
                });
              } else {
                // Not using tool
                this.usageService.incrementTextModelUsage(user, tmpModel);
              }
            },

            onChunk: async ({ chunk }) => {
              if (chunk.type === "text-delta") {
                // Send reflection stage when text starts streaming to mark thinking as complete
                if (isDeepThinkMode && !hasSentReflectionStage.value) {
                  hasSentReflectionStage.value = true;
                  streamDeepThink({
                    stage: "reflection",
                    label: "Thought",
                    message: "Response ready, streaming answer",
                  });
                }
                // Send text chunk (tool results are now sent immediately in onStepFinish)
                const responseChunk: ResponseChunk = {
                  type: "text",
                  content: chunk.text,
                  models: [tmpModel],
                  conversationUniqueId: newConversationUniqueId,
                };

                res.write(`data: ${JSON.stringify(responseChunk)}\n\n`);
              }
            },

            // onFinish is called when ALL steps are complete (including tool calls and final response)
            onFinish: async ({ text, usage, finishReason, toolCalls, toolResults }) => {
              this.logger.log(
                `[AI-SDK] Finished with reason: ${finishReason}, text length: ${text?.length || 0}, tool calls: ${
                  toolCalls?.length || 0
                }, tool results: ${toolResults?.length || 0}`,
              );

              if (isDeepThinkMode) {
                streamDeepThink({
                  stage: "synthesis",
                  label: "Deep Think response ready",
                  message: "Consolidated answer prepared for streaming",
                  metadata: {
                    finishReason,
                    toolCalls: toolCalls?.length || 0,
                    toolResults: toolResults?.length || 0,
                  },
                });
              }
              // If the user is not logged in, don't track usage
              if (!user && !isAnonymous) return;

              // For concurrent calls, we should reload the the conversation before saving it to database
              // Continue conversation
              if (conversationUniqueId) {
                const calledModel = tmpModel;
                if (!conversation.models.includes(calledModel)) {
                  conversation.models.push(calledModel);
                }

                const userMessage = new Message();
                userMessage.role = "user";
                userMessage.createdAt = now;
                userMessage.conversationId = conversation.id;
                userMessage.uniqueId = request.messageId;
                const lastMessage = request.messages[request.messages.length - 1];
                userMessage.attachments = lastMessage.experimental_attachments
                  ? lastMessage.experimental_attachments.map((attachment) => {
                      return {
                        key: extractS3KeyFromSignedUrl(attachment.url),
                      };
                    })
                  : [];
                userMessage.content = lastMessage.content as string;

                // Image generation model
                if (
                  fullResponse.models.length > 0 &&
                  !conversation.models.some((model) => fullResponse.models.includes(model))
                ) {
                  conversation.models = [...conversation.models, ...fullResponse.models];
                }

                const assistantMessage = new Message();
                assistantMessage.role = "assistant";
                assistantMessage.content = text;
                assistantMessage.models = [tmpModel];
                assistantMessage.createdAt = new Date();
                assistantMessage.conversationId = conversation.id;
                assistantMessage.uniqueId = randomUUID();

                // Image generation model
                if (fullResponse.models.length > 0) {
                  assistantMessage.models = [...assistantMessage.models, ...fullResponse.models];
                  conversation.models = [...conversation.models, ...fullResponse.models];
                }

                // Add tool results to the conversation
                if (fullResponse.toolResults.length > 0) {
                  // Set toolName based on the last tool used (for backward compatibility)
                  if (toolCalls && toolCalls.length > 0) {
                    assistantMessage.toolName = toolCalls[toolCalls.length - 1].toolName;
                  }
                  assistantMessage.toolResults = fullResponse.toolResults;
                }

                // Add proactive memory sources if available
                try {
                  this.logger.log(
                    `[MessageSaving] Checking proactive memory sources: ${
                      proactiveMemorySources ? proactiveMemorySources.length : "undefined"
                    }`,
                  );
                  if (proactiveMemorySources && proactiveMemorySources.length > 0) {
                    // Merge with existing tool results if any
                    if (!assistantMessage.toolResults) {
                      assistantMessage.toolResults = [];
                    }
                    // Add memory sources as a special tool result
                    assistantMessage.toolResults.push({
                      toolName: "proactiveMemorySearch",
                      result: {
                        memories: [...proactiveMemorySources], // Create a copy to avoid reference issues
                      },
                    });
                  }
                } catch (memoryError) {
                  this.logger.error("Error adding proactive memory sources:", memoryError.stack);
                }

                if (!isConcurrentCall) {
                  isConcurrentCall = true;
                }
                assistantMessage.app = app;

                if (request.messageId) {
                  const oldMessage = await this.messageRepository.findOne({
                    where: { uniqueId: request.messageId },
                  });
                  if (!oldMessage) {
                    await this.messageRepository.save(userMessage);
                  }
                }
                await this.messageRepository.save(assistantMessage);
                await this.conversationRepository.save(conversation);
              } else {
                // New conversation
                let conversation = new Conversation();

                const userMessage = new Message();
                userMessage.role = "user";
                userMessage.createdAt = now;
                userMessage.models = [];
                userMessage.uniqueId = request.messageId;

                const lastMessage = request.messages[request.messages.length - 1];

                userMessage.attachments = lastMessage.experimental_attachments
                  ? lastMessage.experimental_attachments.map((attachment) => {
                      return {
                        key: extractS3KeyFromSignedUrl(attachment.url),
                      };
                    })
                  : [];

                userMessage.content = lastMessage.content as string;

                conversation.createdAt = new Date();
                conversation.updatedAt = new Date();
                conversation.models = [tmpModel];
                console.log(`New conversation with models: ${JSON.stringify(conversation.models)}`);
                // For anonymous conversations, set userId to null
                conversation.userId = isAnonymous ? null : user.id;
                conversation.app = app;
                // Set a default temporary title to avoid null constraint violation
                conversation.title = "New Conversation";
                // Ensure uniqueId is set to avoid null constraint violation
                conversation.uniqueId = newConversationUniqueId;
                conversation.messageCount = 0; // TODO: Fix this later
                await this.conversationRepository.save(conversation, {
                  reload: true,
                });

                const assistantMessage = new Message();
                assistantMessage.role = "assistant";
                assistantMessage.content = text;
                assistantMessage.models = [tmpModel];
                assistantMessage.createdAt = new Date();
                assistantMessage.uniqueId = randomUUID();
                assistantMessage.conversationId = conversation.id;

                // Image generation model
                if (fullResponse.models.length > 0) {
                  assistantMessage.models = [...assistantMessage.models, ...fullResponse.models];
                  conversation.models = [...conversation.models, ...fullResponse.models];
                }

                // Add tool results to the conversation
                if (fullResponse.toolResults.length > 0) {
                  // Set toolName based on the last tool used (for backward compatibility)
                  if (toolCalls && toolCalls.length > 0) {
                    assistantMessage.toolName = toolCalls[toolCalls.length - 1].toolName;
                  }
                  assistantMessage.toolResults = fullResponse.toolResults;
                }

                // Add proactive memory sources if available
                try {
                  this.logger.log(
                    `[MessageSaving] Checking proactive memory sources: ${
                      proactiveMemorySources ? proactiveMemorySources.length : "undefined"
                    }`,
                  );
                  if (proactiveMemorySources && proactiveMemorySources.length > 0) {
                    // Merge with existing tool results if any
                    if (!assistantMessage.toolResults) {
                      assistantMessage.toolResults = [];
                    }
                    // Add memory sources as a special tool result
                    assistantMessage.toolResults.push({
                      toolName: "proactiveMemorySearch",
                      result: {
                        memories: [...proactiveMemorySources], // Create a copy to avoid reference issues
                      },
                    });
                  }
                } catch (memoryError) {
                  this.logger.error("Error adding proactive memory sources:", memoryError.stack);
                }

                // If two concurrent calls are made, we should not generate the title and follow up questions again
                if (!isConcurrentCall) {
                  isConcurrentCall = true;

                  const generateTitleInput = `
                      User message: ${userMessage.content} \n\n
                      Assistant message: ${assistantMessage.content} \n\n
                    `;
                  const conversationTitle = await generateConversationTitle(generateTitleInput);
                  conversation.title = conversationTitle;
                  await this.conversationRepository.save(conversation);

                  // Send conversation title in the stream
                  const titleChunk: ResponseChunk = {
                    type: "conversation-title",
                    conversationTitle: conversationTitle,
                    conversationUniqueId: newConversationUniqueId,
                  };
                  res.write(`data: ${JSON.stringify(titleChunk)}\n\n`);
                }

                conversation.uniqueId = newConversationUniqueId;
                conversation.userId = isAnonymous ? null : user.id;

                try {
                  await this.conversationRepository.save(conversation, {
                    reload: true,
                  });
                } catch (error) {
                  // Try to find existing conversation
                  const existingConversation = await this.conversationRepository.findOne({
                    where: { uniqueId: newConversationUniqueId },
                  });

                  if (!existingConversation) {
                    this.logger.error("Failed to save or find conversation:", error.stack, {
                      error,
                      newConversationUniqueId,
                    });
                    return; // Exit early if we can't get a valid conversation
                  }

                  conversation = existingConversation;
                }

                // Only proceed with message saving if we have a valid conversation with ID
                if (conversation?.id) {
                  userMessage.conversationId = conversation.id;
                  assistantMessage.conversationId = conversation.id;

                  try {
                    if (request.messageId) {
                      const oldMessage = await this.messageRepository.findOne({
                        where: { uniqueId: request.messageId },
                      });
                      if (!oldMessage) {
                        await this.messageRepository.save(userMessage);
                      }
                    }
                    await this.messageRepository.save(assistantMessage);
                  } catch (error) {
                    this.logger.error("Failed to save messages:", error.stack, {
                      error,
                      conversationId: conversation?.id,
                    });
                  }
                }
              }
            },
          });

          // CRITICAL: Consume the stream to ensure all steps are processed
          for await (const chunk of result.fullStream) {
            // Stream consumption is handled by onChunk and onStepFinish
            // This loop ensures the stream is fully consumed for multi-step processing
            if (chunk.type === "error") {
              this.logger.error(`[AI-SDK] Stream error: ${chunk.error}`);
              // Stream the error to the client
              try {
                const errorChunk: ResponseChunk = {
                  type: "text",
                  content: `\n\n[Error: ${chunk.error || "An error occurred during response generation. Please try again."}]`,
                  models: [tmpModel],
                  conversationUniqueId: newConversationUniqueId,
                };
                res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
              } catch (writeError) {
                this.logger.error("Failed to stream inline error to client:", (writeError as any).stack);
              }
            }
          }
        } catch (error) {
          this.logger.error("Streaming error:", error.stack, {
            error,
            conversationUniqueId,
          });

          // Stream the error to the client so they see a meaningful message instead of silence
          try {
            const errorMessage =
              error?.message || "An unexpected error occurred while generating the response.";
            const errorChunk: ResponseChunk = {
              type: "text",
              content: `I'm sorry, I encountered an error while generating my response. Please try again. (${errorMessage})`,
              models: [tmpModel],
              conversationUniqueId: newConversationUniqueId,
            };
            res.write(`data: ${JSON.stringify(errorChunk)}\n\n`);
          } catch (writeError) {
            this.logger.error("Failed to stream error to client:", writeError.stack);
          }

          this.rollbar.error(
            "Streaming error:",
            {
              error: error.message || String(error),
              stack: error.stack,
              conversationUniqueId,
              model: tmpModel,
            },
            (err: any, uuid: string) => {
              if (err) {
                this.logger.error(`Failed to send error to Rollbar: ${err.message}`, err.stack);
              } else {
                this.logger.log(`Rollbar error logged successfully - UUID: ${uuid}`);
              }
            },
          );
        }
      }),
    );
  }

  private generateSocialLink(source: string, externalId: string): string {
    if (!source || !externalId) return "";

    // If externalId is already a full URL, return it as-is
    if (externalId.startsWith("http://") || externalId.startsWith("https://")) {
      return externalId;
    }

    const linkMap: Record<string, string> = {
      linkedin: `https://linkedin.com/feed/update/${externalId}`,
      twitter: `https://twitter.com/status/${externalId}`,
      facebook: `https://facebook.com/${externalId}`,
      instagram: `https://instagram.com/p/${externalId}`,
      reddit: `https://reddit.com/comments/${externalId}`,
      medium: `https://medium.com/p/${externalId}`,
      github: `https://github.com/${externalId}`,
    };

    return linkMap[source.toLowerCase()] || "";
  }

  // Helper method to format memory context for personalization with inline raw content
  private formatMemoryContextForPersonalization(memories: any[], userQuery: string): string {
    if (!memories || memories.length === 0) {
      return "";
    }

    // Separate regular memories from raw social content
    const regularMemories = memories.filter((m) => !m.metadata?.is_raw_social_content);
    const rawContentMap = new Map();

    // Create a map of raw content by external_id for quick lookup
    memories
      .filter((m) => m.metadata?.is_raw_social_content)
      .forEach((rawContent) => {
        const externalId = rawContent.metadata?.external_id;
        if (externalId) {
          rawContentMap.set(externalId, rawContent);
        }
      });

    let context = `PERSONAL CONTEXT FOR: "${userQuery}"\n\n`;
    context += "Your Knowledge Base:\n";

    // Add separator line
    context += "=" + "=".repeat(50) + "\n\n";

    // Format memories with inline raw content and separators
    regularMemories.slice(0, 10).forEach((memory, index) => {
      const source = memory.metadata?.source || "memory";
      const date = memory.created_at ? new Date(memory.created_at).toLocaleDateString() : "";
      const metadata = memory.metadata || {};

      // Format URL metadata
      let metadataContext = "";
      if (metadata.link) {
        metadataContext = ` [Post URL: ${metadata.link}]`;
      }

      // Add memory entry with separator
      context += `${index + 1}. [${source}${date ? `, ${date}` : ""}${metadataContext}] ${memory.memory}\n`;

      // Add corresponding raw content if available
      const externalId = metadata?.external_id;
      if (externalId && rawContentMap.has(externalId)) {
        const rawContent = rawContentMap.get(externalId);
        const rawSource = rawContent.metadata?.source || source;
        const rawDate = rawContent.metadata?.social_content_created_at
          ? new Date(rawContent.metadata.social_content_created_at).toLocaleDateString()
          : rawContent.created_at
          ? new Date(rawContent.created_at).toLocaleDateString()
          : date;

        context += `   RAW CONTENT: [${rawSource}${rawDate ? `, ${rawDate}` : ""}] ${rawContent.memory}\n`;
      }

      // Add separator between memories (except for the last one)
      if (index < Math.min(regularMemories.length, 10) - 1) {
        context += "\n" + "-".repeat(80) + "\n\n";
      } else {
        context += "\n";
      }
    });

    // Add final instruction
    context += "\n" + "=".repeat(50) + "\n";
    context +=
      "INSTRUCTION: Use this personal context to provide authentic responses that feel like the person themselves would answer. Reference specific experiences and make it personal, not generic.";

    return context;
  }

  /**
   * Fetches additional social content for memories that have external_id metadata
   * This method enriches the context by retrieving the full social media posts
   * corresponding to memory entries that reference external social content
   *
   * @param memories Array of memory objects to check for external_id
   * @param appId The app ID to filter social content by
   * @returns Promise resolving to array of additional social contents in memory format
   */
  private async fetchAdditionalSocialContent(memories: MemorySearchResult[], appId: number): Promise<any[]> {
    // Filter memories that have external_id metadata
    const memoriesWithExternalIds = memories.filter(
      (memory) => memory.metadata?.external_id && memory.metadata?.source,
    );

    this.logger.log(`[SocialContentFetch] Found ${memoriesWithExternalIds.length} memories with external_id metadata`);

    if (memoriesWithExternalIds.length === 0) {
      return [];
    }

    // Prepare batch query for social content
    const externalIdQueries = memoriesWithExternalIds.map((memory) => ({
      externalId: memory.metadata?.external_id,
      appId: appId,
      source: memory.metadata?.source,
    }));

    try {
      const socialContents = await this.socialContentRepository.findByExternalIds(externalIdQueries);
      this.logger.log(`[SocialContentFetch] Retrieved ${socialContents.length} social content items`);

      // Map social contents to memory format for context
      return socialContents.map((content) => ({
        id: `social_raw_${content.id}`,
        memory: content.content, // Raw content from social_content entity
        metadata: {
          ...content.metadata,
          source: content.source,
          external_id: content.externalId,
          social_content_created_at: content.socialContentCreatedAt,
          type: content.type,
          is_raw_social_content: true, // Flag to identify raw social content
        },
        created_at: content.socialContentCreatedAt?.toISOString() || content.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`[SocialContentFetch] Error fetching social content: ${error.message}`);
      return [];
    }
  }
}
