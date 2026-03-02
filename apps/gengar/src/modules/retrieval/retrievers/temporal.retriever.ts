import { Injectable, Logger } from "@nestjs/common";
import { Retriever, RetrievalResult } from "./retriever.interface";
import { RetrievalRequest } from "../types/retrieval.types";
import { QueryAnalysis } from "../query-classifier.service";
import { ChromaService } from "../../chroma/chroma.service";
import { SocialContentRepository } from "../../../db/repositories/social-content.repository";

/**
 * TemporalRetriever: Handles queries with time constraints
 * Examples: "What did you post last week?", "Recent posts about AI"
 */
@Injectable()
export class TemporalRetriever implements Retriever {
  private readonly logger = new Logger(TemporalRetriever.name);

  constructor(
    private readonly chromaService: ChromaService,
    private readonly socialContentRepository: SocialContentRepository,
  ) {}

  getName(): string {
    return "TemporalRetriever";
  }

  async retrieve(request: RetrievalRequest, analysis: QueryAnalysis): Promise<RetrievalResult[]> {
    // Only execute if temporal constraint exists
    if (!analysis.temporalConstraint) {
      return [];
    }

    const { startDate, endDate, recency } = analysis.temporalConstraint;

    try {
      // Parallel search in Chroma and social_content
      const [chromaResults, dbResults] = await Promise.all([
        this.searchChromaWithTemporal(request, analysis, startDate, endDate),
        this.searchDatabaseWithTemporal(request, analysis, startDate, endDate),
      ]);

      const allResults = [...chromaResults, ...dbResults];

      // Apply recency boosting for "recent" queries
      if (recency === "recent") {
        return this.applyRecencyBoost(allResults);
      }

      this.logger.log(
        `[${this.getName()}] Found ${
          allResults.length
        } results for temporal query (${startDate?.toISOString()} - ${endDate?.toISOString()})`,
      );

      return allResults;
    } catch (error) {
      this.logger.error(`[${this.getName()}] Error:`, error.stack);
      return [];
    }
  }

  /**
   * Search Chroma with temporal metadata filter
   */
  private async searchChromaWithTemporal(
    request: RetrievalRequest,
    analysis: QueryAnalysis,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RetrievalResult[]> {
    if (!startDate || !endDate) {
      return [];
    }

    const filter: any = {
      $and: [{ appId: request.appId }, { userId: request.userId }],
    };

    // Add temporal filter
    filter.$and.push({
      createdAt: {
        $gte: startDate.toISOString(),
        $lte: endDate.toISOString(),
      },
    });

    // Add source filter if specified
    if (analysis.sourceFilter && analysis.sourceFilter.length > 0) {
      this.logger.log(`[${this.getName()}] Applying source filter to Chroma: ${analysis.sourceFilter.join(", ")}`);
      filter.$and.push({
        $or: analysis.sourceFilter.map((source: string) => ({ source })),
      });
    }

    const results = await this.chromaService.query({
      text: request.query,
      topK: request.maxResults || 15,
      filter,
    });

    return results.map((item) => ({
      id: item.id,
      content: item.text || "",
      relevanceScore: item.score !== undefined ? item.score : 0.0,
      source: "chroma",
      type: "memory",
      createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
      metadata: item.metadata || {},
    }));
  }

  /**
   * Search social_content table with temporal filter
   */
  private async searchDatabaseWithTemporal(
    request: RetrievalRequest,
    analysis: QueryAnalysis,
    startDate?: Date,
    endDate?: Date,
  ): Promise<RetrievalResult[]> {
    if (!startDate || !endDate) {
      return [];
    }

    try {
      // Build query with optional source filter
      let queryText = `
        SELECT
          id,
          content,
          source,
          type,
          "socialContentCreatedAt" as created_at,
          ts_rank(search_vector, plainto_tsquery('english', $1)) as relevance_score,
          metadata
        FROM social_contents
        WHERE
          "appId" = $2
          AND search_vector @@ plainto_tsquery('english', $1)
          AND "socialContentCreatedAt" >= $3
          AND "socialContentCreatedAt" <= $4
      `;

      const queryParams: any[] = [request.query, request.appId, startDate, endDate];

      // Add source filter if specified
      if (analysis.sourceFilter && analysis.sourceFilter.length > 0) {
        this.logger.log(`[${this.getName()}] Applying source filter to database: ${analysis.sourceFilter.join(", ")}`);
        queryText += ` AND source = ANY($${queryParams.length + 1})`;
        queryParams.push(analysis.sourceFilter);
      }

      queryText += `
        ORDER BY relevance_score DESC, "socialContentCreatedAt" DESC
        LIMIT $${queryParams.length + 1}
      `;
      queryParams.push(request.maxResults || 15);

      const results = await this.socialContentRepository.query(queryText, queryParams);

      return results.map((row: any) => ({
        id: row.id.toString(),
        content: row.content || "",
        relevanceScore: parseFloat(row.relevance_score) || 0.5,
        source: "social_content",
        type: row.type,
        createdAt: row.created_at ? new Date(row.created_at) : undefined,
        metadata: row.metadata || {},
      }));
    } catch (error) {
      this.logger.error("[TemporalRetriever] Database search error:", error.stack);
      return [];
    }
  }

  /**
   * Apply recency boosting: newer content gets higher score
   */
  private applyRecencyBoost(results: RetrievalResult[]): RetrievalResult[] {
    const now = Date.now();

    return results.map((result) => {
      if (!result.createdAt) {
        return result;
      }

      const multiplier = this.calculateRecencyMultiplier(result.createdAt, now);

      return {
        ...result,
        relevanceScore: result.relevanceScore * multiplier,
        metadata: {
          ...result.metadata,
          recencyBoost: multiplier,
        },
      };
    });
  }

  /**
   * Calculate recency multiplier based on age
   * Last 7 days: 1.5x-2.0x boost
   * Last 30 days: 1.2x-1.5x boost
   * Older: 1.0x (no boost)
   */
  private calculateRecencyMultiplier(createdAt: Date, now: number): number {
    const age = now - createdAt.getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);

    if (daysOld < 0) return 1.0; // Future dates (edge case)
    if (daysOld < 7) return 2.0 - (daysOld / 7) * 0.5; // 2.0 → 1.5
    if (daysOld < 30) return 1.5 - ((daysOld - 7) / 23) * 0.3; // 1.5 → 1.2
    return 1.0;
  }
}
