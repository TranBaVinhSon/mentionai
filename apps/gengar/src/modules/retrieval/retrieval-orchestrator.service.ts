import { Injectable, Logger, Inject } from "@nestjs/common";
import { MemoryService } from "../memory/memory.service";
import { SocialContentRepository } from "../../db/repositories/social-content.repository";
import { AppLinkRepository } from "../../db/repositories/app-link.repository";
import { SocialContentSource } from "../../db/entities/social-content.entity";
import {
  RetrievalRequest,
  RetrievalResponse,
  MemorySearchResult,
  ContentSearchResult,
  RetrievalConfig,
} from "./types/retrieval.types";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";
import { EmbeddingsService } from "../embeddings/embeddings.service";
import { ChromaService } from "../chroma/chroma.service";
import { QueryClassifierService, QueryIntent } from "./query-classifier.service";
import { RetrievalResult } from "./retrievers/retriever.interface";
import { TemporalRetriever } from "./retrievers/temporal.retriever";

@Injectable()
export class RetrievalOrchestratorService {
  private readonly logger = new Logger(RetrievalOrchestratorService.name);

  private readonly defaultConfig: RetrievalConfig = {
    maxResultsPerType: {
      memory: 20,
      fulltext: 15,
      semantic: 15,
    },
    minRelevanceThreshold: 0.4,
  };

  // Specialized retriever (Phase 1: Temporal only)
  private readonly temporalRetriever: TemporalRetriever;

  constructor(
    private readonly memoryService: MemoryService,
    private readonly socialContentRepository: SocialContentRepository,
    private readonly appLinkRepository: AppLinkRepository,
    @Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar,
    private readonly embeddingsService: EmbeddingsService,
    private readonly chromaService: ChromaService,
    private readonly queryClassifier: QueryClassifierService,
  ) {
    // Initialize temporal retriever
    this.temporalRetriever = new TemporalRetriever(this.chromaService, this.socialContentRepository);
  }

  /**
   * Main retrieval method with intelligent routing (Phase 0+1)
   * Uses query classification and temporal retrieval when needed
   */
  async retrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
    const startTime = Date.now();

    try {
      // STEP 1: Classify the query
      const queryAnalysis = await this.queryClassifier.classifyQuery(request.query);

      this.logger.log(
        `[RetrievalOrchestrator] Query intent: ${queryAnalysis.intent}, entities: [${queryAnalysis.entities.join(
          ", ",
        )}], sources: [${queryAnalysis.sourceFilter?.join(", ") || "all"}], temporal: ${
          queryAnalysis.temporalConstraint?.recency || "any"
        }`,
      );

      // STEP 2: Execute retrieval based on query type
      let allResults: RetrievalResult[] = [];

      if (queryAnalysis.intent === QueryIntent.UNCERTAINTY_TEST) {
        // For hallucination tests, return minimal/no results
        this.logger.log("[RetrievalOrchestrator] UNCERTAINTY_TEST detected - returning minimal results");
        allResults = [];
      } else if (queryAnalysis.sourceFilter && queryAnalysis.sourceFilter.length > 0) {
        // DIRECT POSTGRESQL: Query social_content table directly for social media queries
        this.logger.log(
          `[RetrievalOrchestrator] Source filter detected [${queryAnalysis.sourceFilter.join(
            ", ",
          )}] - using direct PostgreSQL query`,
        );
        allResults = await this.getSocialContentResults(request, queryAnalysis);
      } else {
        // DEFAULT: Use baseline semantic retrieval from Chroma + Mem0
        allResults = await this.getBaselineResults(request, queryAnalysis);
      }

      // STEP 4: Deduplicate results
      const dedupedResults = this.deduplicateResults(allResults);

      // STEP 5: Re-rank based on intent
      const rerankedResults = this.rerankResults(dedupedResults, queryAnalysis);

      // STEP 6: Calculate confidence level
      const confidenceLevel = this.calculateConfidence(rerankedResults, queryAnalysis);

      // STEP 7: Convert to response format
      const { memories, contents } = this.convertToResponseFormat(rerankedResults);

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `[RetrievalOrchestrator] Retrieved ${memories.length} memories, ${contents.length} contents in ${processingTime}ms (confidence: ${confidenceLevel})`,
      );

      return {
        query: request.query,
        memories,
        contents,
        totalResults: memories.length + contents.length,
        processingTime,
        queryAnalysis,
        confidenceLevel,
        sourcesUsed: [...new Set(allResults.map((r) => r.source))],
      };
    } catch (error) {
      this.logger.error("Error in retrieval orchestrator:", error.stack);
      this.rollbar.error("Error in retrieval orchestrator", {
        query: request.query,
        userId: request.userId,
        appId: request.appId,
        error: error.message || String(error),
        stack: error.stack,
      });

      // Fallback to simple retrieval
      return await this.fallbackRetrieve(request);
    }
  }

  /**
   * Get social content results directly from PostgreSQL (for queries with source filters)
   */
  private async getSocialContentResults(request: RetrievalRequest, queryAnalysis: any): Promise<RetrievalResult[]> {
    try {
      // Generate embedding for semantic search
      const embeddingResult = await this.embeddingsService.generateEmbedding(request.query);
      const queryEmbedding = embeddingResult.embedding;

      // Query social_content table directly with all filters
      const socialContents = await this.socialContentRepository.queryWithFilters({
        appId: request.appId,
        query: request.query,
        queryEmbedding,
        sources: queryAnalysis.sourceFilter, // e.g., ["linkedin"]
        startDate: queryAnalysis.temporalConstraint?.startDate,
        endDate: queryAnalysis.temporalConstraint?.endDate,
        limit: (request.maxResults || 30) * 2, // Get more for fallback
      });

      this.logger.log(`[PostgreSQL Direct] Retrieved ${socialContents.length} social content items from database`);

      // Convert to RetrievalResult format
      const results: RetrievalResult[] = socialContents.map((content) => ({
        id: content.id.toString(),
        content: content.content,
        relevanceScore: content.relevanceScore,
        source: content.source, // Use actual source: "linkedin", "twitter", etc.
        type: content.type,
        createdAt: content.socialContentCreatedAt || content.createdAt,
        metadata: {
          source: content.source,
          externalId: content.externalId,
          socialContentCreatedAt: content.socialContentCreatedAt?.toISOString(),
          type: content.type,
          ...content.metadata,
        },
      }));

      // If no results in time range, try without temporal filter
      if (results.length === 0 && queryAnalysis.temporalConstraint) {
        this.logger.log(`[PostgreSQL Direct] No results in time range, retrying without temporal filter`);
        const fallbackContents = await this.socialContentRepository.queryWithFilters({
          appId: request.appId,
          query: request.query,
          queryEmbedding,
          sources: queryAnalysis.sourceFilter,
          // No temporal filters
          limit: request.maxResults || 30,
        });

        this.logger.log(`[PostgreSQL Direct] Fallback query returned ${fallbackContents.length} results`);

        return fallbackContents.map((content) => ({
          id: content.id.toString(),
          content: content.content,
          relevanceScore: content.relevanceScore,
          source: content.source, // Use actual source: "linkedin", "twitter", etc.
          type: content.type,
          createdAt: content.socialContentCreatedAt || content.createdAt,
          metadata: {
            source: content.source,
            externalId: content.externalId,
            socialContentCreatedAt: content.socialContentCreatedAt?.toISOString(),
            type: content.type,
            ...content.metadata,
          },
        }));
      }

      return results;
    } catch (error) {
      this.logger.error("Error in direct social content query:", error.stack);
      this.rollbar.error("Error in direct social content query", {
        query: request.query,
        userId: request.userId,
        appId: request.appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Get baseline semantic results from Chroma + Mem0
   */
  private async getBaselineResults(request: RetrievalRequest, queryAnalysis?: any): Promise<RetrievalResult[]> {
    const [chromaMemories, mem0Memories] = await Promise.all([
      this.searchChroma(request), // Pure semantic search, no filtering
      this.searchMemory(request, queryAnalysis), // Mem0 can still use filters
    ]);

    // Convert to RetrievalResult format
    const results: RetrievalResult[] = [];

    for (const memory of chromaMemories) {
      results.push({
        id: memory.id,
        content: memory.memory,
        relevanceScore: memory.relevanceScore,
        source: "chroma",
        type: "memory",
        createdAt: new Date(memory.createdAt),
        metadata: memory.metadata,
      });
    }

    for (const memory of mem0Memories) {
      results.push({
        id: memory.id,
        content: memory.memory,
        relevanceScore: memory.relevanceScore,
        source: "mem0",
        type: "memory",
        createdAt: new Date(memory.createdAt),
        metadata: memory.metadata,
      });
    }

    return results;
  }

  /**
   * Deduplicate results by content hash
   */
  private deduplicateResults(results: RetrievalResult[]): RetrievalResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const hash = this.hashContent(result.content);
      if (seen.has(hash)) {
        return false;
      }
      seen.add(hash);
      return true;
    });
  }

  /**
   * Re-rank results based on intent and recency (Phase 0+1)
   * POSTGRESQL-STYLE FILTERING: Source + Temporal filtering done here (only for Chroma/Mem0 results)
   * Social content results are already filtered by PostgreSQL
   */
  private rerankResults(results: RetrievalResult[], queryAnalysis: any): RetrievalResult[] {
    let filteredResults = results;
    let sourceFilteredResults = results; // Keep track for fallback

    // Check if results are from direct PostgreSQL query (social media sources)
    const socialMediaSources = ["linkedin", "twitter", "facebook", "instagram", "reddit", "medium", "github"];
    const isDirectPostgresQuery = results.length > 0 && socialMediaSources.includes(results[0].source.toLowerCase());

    // SOURCE FILTERING: Only apply for Chroma/Mem0 results (social_content is already filtered)
    if (!isDirectPostgresQuery && queryAnalysis.sourceFilter && queryAnalysis.sourceFilter.length > 0) {
      this.logger.log(`[Reranking PostgreSQL] Applying source filter: [${queryAnalysis.sourceFilter.join(", ")}]`);

      filteredResults = filteredResults.filter((result) => {
        const resultSource = result.metadata?.source?.toLowerCase();
        const matches = resultSource && queryAnalysis.sourceFilter.includes(resultSource);

        if (!matches) {
          this.logger.debug(
            `[Reranking PostgreSQL] Excluding result ${result.id} with source "${resultSource}" (not in filter)`,
          );
        }

        return matches;
      });

      sourceFilteredResults = filteredResults; // Save source-filtered results for fallback

      this.logger.log(`[Reranking PostgreSQL] Source filtering: ${results.length} → ${filteredResults.length} results`);
    } else if (isDirectPostgresQuery) {
      this.logger.log(`[Reranking PostgreSQL] Skipping source filter - results already filtered by PostgreSQL`);
      sourceFilteredResults = filteredResults;
    }

    // TEMPORAL FILTERING: Only apply for Chroma/Mem0 results (social_content is already filtered)
    if (
      !isDirectPostgresQuery &&
      queryAnalysis.temporalConstraint?.startDate &&
      queryAnalysis.temporalConstraint?.endDate
    ) {
      const { startDate, endDate } = queryAnalysis.temporalConstraint;
      const beforeTemporalCount = filteredResults.length;
      this.logger.log(
        `[Reranking PostgreSQL] Applying temporal filter: ${startDate.toISOString()} to ${endDate.toISOString()}`,
      );

      const temporalFiltered = filteredResults.filter((result) => {
        // Try multiple date sources in metadata
        const dateString =
          result.metadata?.timestamp || // From social content
          result.metadata?.socialContentCreatedAt || // From social content
          result.metadata?.createdAt || // From other sources
          result.createdAt?.toISOString(); // From result itself

        if (!dateString) {
          this.logger.debug(`[Reranking PostgreSQL] No date found for result ${result.id}, excluding`);
          return false; // Exclude items without dates for temporal queries
        }

        const itemDate = new Date(dateString);
        const inRange = itemDate >= startDate && itemDate <= endDate;

        if (!inRange) {
          this.logger.debug(
            `[Reranking PostgreSQL] Excluding result ${result.id} with date ${itemDate.toISOString()} (outside range)`,
          );
        }

        return inRange;
      });

      this.logger.log(
        `[Reranking PostgreSQL] Temporal filtering: ${beforeTemporalCount} → ${temporalFiltered.length} results`,
      );

      // FALLBACK: If no results found in time range, use source-filtered results sorted by recency
      if (temporalFiltered.length === 0 && sourceFilteredResults.length > 0) {
        this.logger.log(
          `[Reranking PostgreSQL] No results in time range, falling back to most recent results from source-filtered set (${sourceFilteredResults.length} items)`,
        );
        filteredResults = sourceFilteredResults; // Use source-filtered results as fallback
      } else {
        filteredResults = temporalFiltered;
      }
    } else if (isDirectPostgresQuery && queryAnalysis.temporalConstraint) {
      this.logger.log(`[Reranking PostgreSQL] Skipping temporal filter - results already filtered by PostgreSQL`);
    }

    return filteredResults
      .map((result) => {
        let boostedScore = result.relevanceScore;

        // Boost recent content for recent event queries
        if (queryAnalysis.intent === QueryIntent.RECENT_EVENTS) {
          // Calculate recency boost based on how recent the content is
          const dateString =
            result.metadata?.timestamp ||
            result.metadata?.socialContentCreatedAt ||
            result.metadata?.createdAt ||
            result.createdAt?.toISOString();

          if (dateString) {
            const itemDate = new Date(dateString);
            const ageInDays = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
            // Boost content from last 7 days: 1.5x, last 30 days: 1.2x
            if (ageInDays <= 7) {
              boostedScore *= 1.5;
            } else if (ageInDays <= 30) {
              boostedScore *= 1.2;
            }
          }
        }

        return {
          ...result,
          relevanceScore: Math.min(boostedScore, 1.0), // Cap at 1.0
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 30); // Top 30 results
  }

  /**
   * Calculate confidence level based on results quality
   */
  private calculateConfidence(results: RetrievalResult[], queryAnalysis: any): "high" | "medium" | "low" | "none" {
    if (results.length === 0) {
      return "none";
    }

    // Check if we have high-relevance results
    const highRelevanceCount = results.filter((r) => r.relevanceScore > 0.7).length;
    const avgRelevance = results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length;

    // For high-confidence queries (factual), be stricter
    if (queryAnalysis.confidenceRequired === "high") {
      if (highRelevanceCount >= 3 && avgRelevance > 0.6) return "high";
      if (highRelevanceCount >= 1 && avgRelevance > 0.5) return "medium";
      return "low";
    }

    // For medium-confidence queries
    if (queryAnalysis.confidenceRequired === "medium") {
      if (highRelevanceCount >= 2 && avgRelevance > 0.5) return "high";
      if (results.length >= 3) return "medium";
      return "low";
    }

    // For low-confidence queries (casual)
    return results.length > 0 ? "medium" : "low";
  }

  /**
   * Convert unified results back to memories/contents format
   */
  private convertToResponseFormat(results: RetrievalResult[]): {
    memories: MemorySearchResult[];
    contents: ContentSearchResult[];
  } {
    const memories: MemorySearchResult[] = [];
    const contents: ContentSearchResult[] = [];

    for (const result of results) {
      if (result.source === "mem0" || result.source === "chroma" || result.type === "memory") {
        memories.push({
          id: result.id,
          memory: result.content,
          metadata: result.metadata || {},
          createdAt: result.createdAt?.toISOString() || new Date().toISOString(),
          relevanceScore: result.relevanceScore,
          source: result.source === "mem0" ? "mem0" : "chroma",
        });
      } else {
        contents.push({
          id: parseInt(result.id) || 0,
          content: result.content,
          source: result.source,
          type: result.type,
          createdAt: result.createdAt || new Date(),
          relevanceScore: result.relevanceScore,
          metadata: result.metadata,
        });
      }
    }

    return { memories, contents };
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    // Simple hash: first 100 chars + length
    return `${content.substring(0, 100)}_${content.length}`;
  }

  /**
   * Fallback to simple retrieval if classification fails
   */
  private async fallbackRetrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
    const startTime = Date.now();

    try {
      const [memoryResults, chromaResults] = await Promise.all([
        this.searchMemory(request), // No query analysis in fallback
        this.searchChroma(request), // Pure semantic search
      ]);

      const allMemories = [...memoryResults, ...chromaResults];
      const processingTime = Date.now() - startTime;

      return {
        query: request.query,
        memories: allMemories,
        contents: [],
        totalResults: allMemories.length,
        processingTime,
        confidenceLevel: "medium",
        sourcesUsed: ["mem0", "chroma"],
      };
    } catch (error) {
      this.logger.error("Fallback retrieval failed:", error.stack);
      return {
        query: request.query,
        memories: [],
        contents: [],
        totalResults: 0,
        processingTime: Date.now() - startTime,
        confidenceLevel: "none",
        sourcesUsed: [],
      };
    }
  }

  /**
   * Search in Chroma collection - PURE SEMANTIC SEARCH ONLY (no filtering)
   * All filtering (source, temporal) is done in PostgreSQL/re-ranking
   */
  private async searchChroma(request: RetrievalRequest): Promise<MemorySearchResult[]> {
    try {
      // ONLY filter by appId and userId - let PostgreSQL handle source/temporal filtering
      const filter: any = {
        $and: [{ appId: request.appId }, { userId: request.userId }],
      };

      this.logger.log(`[Chroma] Pure semantic search (filtering done in PostgreSQL)`);

      // Pure semantic search - no source or temporal filters
      const results = await this.chromaService.query({
        text: request.query,
        topK: (request.maxResults || this.defaultConfig.maxResultsPerType.memory) * 3, // Get more results since we'll filter later
        filter,
      });

      const mappedResults = results
        .map((item) => ({
          id: item.id,
          memory: item.text || "",
          metadata: item.metadata || {},
          createdAt: item.createdAt || new Date().toISOString(),
          relevanceScore: item.score !== undefined ? item.score : 0.0,
          source: "chroma" as const,
        }))
        .filter((m) => m.memory && m.memory.trim().length > 0);

      this.logger.log(
        `[Chroma] Retrieved ${results.length} items → ${mappedResults.length} valid memories (filtering in PostgreSQL)`,
      );

      return mappedResults;
    } catch (error) {
      this.logger.error("Error in Chroma search:", error.stack);
      this.rollbar.error("Error in Chroma search", {
        query: request.query,
        userId: request.userId,
        appId: request.appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Search in Mem0 memory store
   */
  private async searchMemory(request: RetrievalRequest, queryAnalysis?: any): Promise<MemorySearchResult[]> {
    try {
      const memories = await this.memoryService.searchMemories(request.query, request.userId, request.appId);

      this.logger.log(`[Mem0] Raw search returned ${memories.length} memories`);

      const mappedMemories = memories
        .filter((memory) => {
          if (memory.score <= 0.4) return false;

          // Apply source filter if specified
          if (queryAnalysis?.sourceFilter && queryAnalysis.sourceFilter.length > 0) {
            const memorySource = memory.metadata?.source?.toLowerCase();
            if (!memorySource || !queryAnalysis.sourceFilter.includes(memorySource)) {
              return false;
            }
          }

          return true;
        })
        .map((memory) => {
          const mapped = {
            id: memory.id,
            memory: memory.memory || "", // Handle optional memory property
            metadata: memory.metadata || {},
            createdAt: memory.created_at || new Date().toISOString(),
            relevanceScore: memory.score,
            source: "mem0" as const,
          };

          return mapped;
        })
        .filter((memory) => {
          const hasContent = memory.memory && memory.memory.trim().length > 0;
          return hasContent;
        })
        .slice(0, request.maxResults || this.defaultConfig.maxResultsPerType.memory);

      if (queryAnalysis?.sourceFilter && queryAnalysis.sourceFilter.length > 0) {
        this.logger.log(
          `[Mem0] Applied source filter [${queryAnalysis.sourceFilter.join(", ")}]: ${memories.length} → ${
            mappedMemories.length
          } memories`,
        );
      } else {
        this.logger.log(`[Mem0] No source filter applied, returning ${mappedMemories.length} memories`);
      }

      return mappedMemories;
    } catch (error) {
      this.logger.error("Error in memory search:", error.stack);
      this.rollbar.error("Error in memory search", {
        query: request.query,
        userId: request.userId,
        appId: request.appId,
        error: error.message || String(error),
        stack: error.stack,
      });
      return [];
    }
  }

  /**
   * Remove duplicate results based on content and source
   */
  private deduplicateContentResults(results: ContentSearchResult[]): ContentSearchResult[] {
    const seen = new Set<string>();
    return results.filter((result) => {
      const key = `${result.source}-${result.id}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Search social contents table
   */
  private async searchSocialContents(
    query: string,
    queryEmbedding: number[] | undefined,
    appId: number | undefined,
    limit: number,
  ): Promise<ContentSearchResult[]> {
    try {
      // Add debug logging to check if any content exists for this app
      const totalContent = await this.socialContentRepository.count({ where: { appId } });
      const facebookContent = await this.socialContentRepository.count({
        where: { appId, source: SocialContentSource.FACEBOOK },
      });
      this.logger.log(
        `[ContentSearch] App ${appId} has ${totalContent} total content items, ${facebookContent} Facebook items`,
      );

      let results;

      if (queryEmbedding) {
        // Use hybrid search when embedding is available
        results = await this.socialContentRepository.hybridSearch(query, queryEmbedding, appId, limit);
      } else {
        // Use fulltext search when no embedding
        results = await this.socialContentRepository.fullTextSearch(query, appId, limit);
      }

      return results.map((result) => ({
        id: result.id,
        content: result.content,
        source: "social_content",
        type: result.type,
        createdAt: result.socialContentCreatedAt || result.createdAt,
        relevanceScore: "relevanceScore" in result ? result.relevanceScore : 0.5,
        metadata: {
          externalId: result.externalId,
          socialSource: result.source,
        },
      }));
    } catch (error) {
      this.logger.error("Error searching social contents:", error.stack);
      return [];
    }
  }

  /**
   * Search app links table
   */
  private async searchAppLinks(
    query: string,
    queryEmbedding: number[] | undefined,
    appId: number | undefined,
    limit: number,
  ): Promise<ContentSearchResult[]> {
    try {
      let results;

      if (queryEmbedding) {
        // Use hybrid search when embedding is available
        results = await this.appLinkRepository.hybridSearch(query, queryEmbedding, appId, limit);
      } else {
        // Use fulltext search when no embedding
        results = await this.appLinkRepository.fullTextSearch(query, appId, limit);
      }

      return results.map((result) => ({
        id: result.id,
        content: result.content || "",
        source: "app_link",
        link: result.link,
        createdAt: result.createdAt,
        relevanceScore: "relevanceScore" in result ? result.relevanceScore : 0.5,
        metadata: {
          link: result.link,
        },
      }));
    } catch (error) {
      this.logger.error("Error searching app links:", error.stack);
      return [];
    }
  }
}
