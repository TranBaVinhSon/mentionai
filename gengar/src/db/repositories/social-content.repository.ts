import { Injectable, Logger } from "@nestjs/common";
import { DataSource, Repository } from "typeorm";
import { SocialContent, SocialContentSource, SocialContentType } from "../entities/social-content.entity";

interface PostingPattern {
  hour: number;
  count: number;
  lastPost: Date;
}

interface TopicPreference {
  topic: string;
  count: number;
  lastPost: Date;
  confidence: number;
  keywords: string[];
}

@Injectable()
export class SocialContentRepository extends Repository<SocialContent> {
  private readonly logger = new Logger(SocialContentRepository.name);

  constructor(private dataSource: DataSource) {
    super(SocialContent, dataSource.createEntityManager());
  }

  async searchByKeyword(keyword: string, appId?: number, limit = 10): Promise<SocialContent[]> {
    console.log(`[SocialContentRepository] Keyword search - keyword: "${keyword}", appId: ${appId}, limit: ${limit}`);

    const queryBuilder = this.createQueryBuilder("social_content");

    queryBuilder
      .where("LOWER(social_content.content) LIKE LOWER(:keyword)", {
        keyword: `%${keyword}%`,
      })
      .orderBy("social_content.socialContentCreatedAt", "DESC")
      .limit(limit);

    if (appId) {
      queryBuilder.andWhere("social_content.appId = :appId", { appId });
    }

    console.log(`[SocialContentRepository] Keyword search SQL: ${queryBuilder.getSql()}`);

    const results = await queryBuilder.getMany();
    console.log(`[SocialContentRepository] Keyword search found ${results.length} results`);

    return results;
  }

  /**
   * Search content using vector similarity (cosine distance)
   * Requires embeddings to be generated first
   */
  async searchByVector(
    queryEmbedding: number[],
    appId?: number,
    limit = 10,
    threshold = 0.7,
  ): Promise<Array<SocialContent & { similarity: number }>> {
    // Validate embedding dimensions
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      throw new Error("Query embedding must have exactly 1536 dimensions");
    }

    const queryBuilder = this.createQueryBuilder("sc")
      .select("sc.*")
      .addSelect("1 - (sc.embedding <=> :embedding::vector)", "similarity")
      .where("sc.embedding IS NOT NULL");

    if (appId) {
      queryBuilder.andWhere("sc.appId = :appId", { appId });
    }

    queryBuilder
      .orderBy("sc.embedding <=> :embedding::vector", "ASC")
      .limit(limit)
      .setParameter("embedding", JSON.stringify(queryEmbedding));

    try {
      const results = await queryBuilder.getRawMany();

      return results
        .filter((row: any) => parseFloat(row.similarity) > threshold)
        .map((row: any) => ({
          ...this.create({
            id: row.id,
            source: row.source,
            content: row.content,
            type: row.type,
            appId: row.appId,
            externalId: row.external_id,
            socialCredentialId: row.socialCredentialId,
            socialContentCreatedAt: row.socialContentCreatedAt,
            metadata: row.metadata,
            embedding: row.embedding,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          }),
          similarity: parseFloat(row.similarity),
        }));
    } catch (error) {
      console.error("Vector search error:", error);
      throw new Error(`Vector search failed: ${error.message}`);
    }
  }

  /**
   * Hybrid search combining keyword and vector similarity
   */
  async hybridSearch(
    keyword: string,
    queryEmbedding?: number[],
    appId?: number,
    limit = 10,
    keywordWeight = 0.3,
    vectorWeight = 0.7,
  ): Promise<Array<SocialContent & { relevanceScore: number }>> {
    console.log(
      `[SocialContentRepository] Hybrid search - keyword: "${keyword}", appId: ${appId}, hasEmbedding: ${!!queryEmbedding}, limit: ${limit}`,
    );

    // If no embedding provided, fall back to keyword search
    if (!queryEmbedding) {
      console.log(`[SocialContentRepository] No embedding provided, falling back to keyword search`);
      const keywordResults = await this.searchByKeyword(keyword, appId, limit);
      console.log(`[SocialContentRepository] Keyword search found ${keywordResults.length} results`);
      return keywordResults.map((result) => ({
        ...result,
        relevanceScore: 1.0,
      }));
    }

    // Validate embedding dimensions
    if (queryEmbedding.length !== 1536) {
      throw new Error("Query embedding must have exactly 1536 dimensions");
    }

    try {
      // Use TypeORM query builder for cleaner query construction
      const query = this.createQueryBuilder("sc")
        .select("sc.*")
        .addSelect(
          `(
            CASE 
              WHEN LOWER(sc.content) LIKE LOWER(:exact) THEN 1.0
              WHEN LOWER(sc.content) LIKE LOWER(:words) THEN 0.8
              WHEN LOWER(sc.content) LIKE LOWER(:any) THEN 0.6
              ELSE 0.0
            END
          ) * :keywordWeight + 
          COALESCE(1 - (sc.embedding <=> :embedding::vector), 0) * :vectorWeight`,
          "relevance_score",
        )
        .where(
          `(
            LOWER(sc.content) LIKE LOWER(:exact) OR
            LOWER(sc.content) LIKE LOWER(:words) OR
            LOWER(sc.content) LIKE LOWER(:any) OR
            (sc.embedding IS NOT NULL AND 1 - (sc.embedding <=> :embedding::vector) > 0.7)
          )`,
        )
        .setParameter("exact", `%${keyword}%`)
        .setParameter("words", `%${keyword.split(" ").join("%")}%`)
        .setParameter("any", `%${keyword.split(" ").join("%")}%`)
        .setParameter("embedding", JSON.stringify(queryEmbedding))
        .setParameter("keywordWeight", keywordWeight)
        .setParameter("vectorWeight", vectorWeight);

      if (appId) {
        query.andWhere("sc.appId = :appId", { appId });
      }

      query.orderBy("relevance_score", "DESC").limit(limit);

      const results = await query.getRawMany();

      return results.map((row: any) => ({
        ...this.create({
          id: row.id,
          source: row.source,
          content: row.content,
          type: row.type,
          appId: row.appId,
          externalId: row.external_id,
          socialCredentialId: row.socialCredentialId,
          socialContentCreatedAt: row.socialContentCreatedAt,
          metadata: row.metadata,
          embedding: row.embedding,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
        relevanceScore: parseFloat(row.relevance_score),
      }));
    } catch (error) {
      console.error("Hybrid search error:", error);
      // Fall back to keyword search if vector search fails
      const keywordResults = await this.searchByKeyword(keyword, appId, limit);
      return keywordResults.map((result) => ({
        ...result,
        relevanceScore: 1.0,
      }));
    }
  }

  /**
   * Full-text search using PostgreSQL's text search capabilities
   */
  async fullTextSearch(
    query: string,
    appId?: number,
    limit = 10,
  ): Promise<Array<SocialContent & { relevanceScore: number }>> {
    console.log(`[SocialContentRepository] Full-text search - query: "${query}", appId: ${appId}, limit: ${limit}`);

    const queryBuilder = this.createQueryBuilder("sc")
      .select("sc.*")
      .addSelect("ts_rank(sc.searchVector, plainto_tsquery('simple', :query))", "relevance_score")
      .addSelect(
        "ts_headline('simple', sc.content, plainto_tsquery('simple', :query), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15')",
        "headline",
      )
      .where("sc.searchVector @@ plainto_tsquery('simple', :query)", { query });

    if (appId) {
      queryBuilder.andWhere("sc.appId = :appId", { appId });
    }

    queryBuilder.orderBy("relevance_score", "DESC").limit(limit);

    console.log(`[SocialContentRepository] Full-text search SQL: ${queryBuilder.getSql()}`);

    const results = await queryBuilder.getRawMany();

    console.log(`[SocialContentRepository] Full-text search found ${results.length} results`);

    return results.map((row: any) => ({
      ...this.create({
        id: row.id,
        source: row.source,
        content: row.content,
        type: row.type,
        appId: row.appId,
        externalId: row.external_id,
        socialCredentialId: row.socialCredentialId,
        socialContentCreatedAt: row.socialContentCreatedAt,
        metadata: row.metadata,
        embedding: row.embedding,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
      relevanceScore: parseFloat(row.relevance_score),
      headline: row.headline,
    }));
  }

  /**
   * Enhanced hybrid search combining full-text search and vector similarity
   */
  async enhancedHybridSearch(
    keyword: string,
    queryEmbedding?: number[],
    appId?: number,
    limit = 10,
    keywordWeight = 0.3,
    vectorWeight = 0.7,
  ): Promise<Array<SocialContent & { relevanceScore: number; debugInfo?: any }>> {
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      // Fallback to full-text search if no embedding
      return this.fullTextSearch(keyword, appId, limit);
    }

    try {
      const queryBuilder = this.createQueryBuilder("sc")
        .select("sc.*")
        .addSelect(
          `COALESCE(ts_rank(sc.searchVector, plainto_tsquery('simple', :query)), 0) * :keywordWeight + 
           COALESCE(1 - (sc.embedding <=> :embedding::vector), 0) * :vectorWeight`,
          "relevance_score",
        )
        .addSelect("ts_rank(sc.searchVector, plainto_tsquery('simple', :query))", "keyword_score")
        .addSelect("1 - (sc.embedding <=> :embedding::vector)", "vector_score")
        .addSelect(
          "ts_headline('simple', sc.content, plainto_tsquery('simple', :query), 'StartSel=<mark>, StopSel=</mark>, MaxWords=35, MinWords=15')",
          "headline",
        )
        .where(
          `(sc.searchVector @@ plainto_tsquery('simple', :query) OR 
            (sc.embedding IS NOT NULL AND 1 - (sc.embedding <=> :embedding::vector) > 0.5))`,
        )
        .setParameter("query", keyword)
        .setParameter("embedding", JSON.stringify(queryEmbedding))
        .setParameter("keywordWeight", keywordWeight)
        .setParameter("vectorWeight", vectorWeight);

      if (appId) {
        queryBuilder.andWhere("sc.appId = :appId", { appId });
      }

      queryBuilder.orderBy("relevance_score", "DESC").limit(limit);

      const results = await queryBuilder.getRawMany();

      return results.map((row: any) => ({
        ...this.create({
          id: row.id,
          source: row.source,
          content: row.content,
          type: row.type,
          appId: row.appId,
          externalId: row.external_id,
          socialCredentialId: row.socialCredentialId,
          socialContentCreatedAt: row.socialContentCreatedAt,
          metadata: row.metadata,
          embedding: row.embedding,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }),
        relevanceScore: parseFloat(row.relevance_score),
        debugInfo: {
          keywordScore: parseFloat(row.keyword_score || 0),
          vectorScore: parseFloat(row.vector_score || 0),
          headline: row.headline,
        },
      }));
    } catch (error) {
      console.error("Enhanced hybrid search error:", error);
      return this.fullTextSearch(keyword, appId, limit);
    }
  }

  /**
   * Get nearest neighbors for a given content ID
   */
  async findSimilarContent(contentId: number, limit = 5): Promise<Array<SocialContent & { similarity: number }>> {
    const query = `
      WITH target_embedding AS (
        SELECT embedding, "appId"
        FROM social_contents
        WHERE id = $1 AND embedding IS NOT NULL
      )
      SELECT 
        sc.*,
        1 - (sc.embedding <=> te.embedding) as similarity
      FROM social_contents sc
      CROSS JOIN target_embedding te
      WHERE sc.id != $1
        AND sc."appId" = te."appId"
        AND sc.embedding IS NOT NULL
      ORDER BY sc.embedding <=> te.embedding
      LIMIT $2;
    `;

    const results = await this.query(query, [contentId, limit]);

    return results.map((row: any) => ({
      ...this.create(row),
      similarity: parseFloat(row.similarity),
    }));
  }

  /**
   * Find content without embeddings
   */
  async findContentWithoutEmbeddings(limit = 100): Promise<SocialContent[]> {
    return this.createQueryBuilder("social_content")
      .where("social_content.embedding IS NULL")
      .orderBy("social_content.createdAt", "DESC")
      .limit(limit)
      .getMany();
  }

  /**
   * Update embedding for a social content
   */
  async updateEmbedding(id: number, embedding: number[]): Promise<void> {
    // Use raw query to properly set vector type
    await this.query("UPDATE social_contents SET embedding = $1::vector WHERE id = $2", [
      JSON.stringify(embedding),
      id,
    ]);
  }

  async findRecentContent(appId: number, daysSince = 7, limit = 10): Promise<SocialContent[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysSince);

    return this.createQueryBuilder("social_content")
      .where("social_content.appId = :appId", { appId })
      .andWhere("social_content.socialContentCreatedAt >= :sinceDate", {
        sinceDate,
      })
      .orderBy("social_content.socialContentCreatedAt", "DESC")
      .limit(limit)
      .getMany();
  }

  async findSeasonalContent(appId: number, currentDate: Date, limit = 5): Promise<SocialContent[]> {
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    // Find content from the same time period in previous years
    return this.createQueryBuilder("social_content")
      .where("social_content.appId = :appId", { appId })
      .andWhere("EXTRACT(MONTH FROM social_content.socialContentCreatedAt) = :month", {
        month: currentMonth,
      })
      .andWhere("ABS(EXTRACT(DAY FROM social_content.socialContentCreatedAt) - :day) <= 7", {
        day: currentDay,
      })
      .andWhere("EXTRACT(YEAR FROM social_content.socialContentCreatedAt) < :currentYear", {
        currentYear: currentDate.getFullYear(),
      })
      .orderBy("social_content.socialContentCreatedAt", "DESC")
      .limit(limit)
      .getMany();
  }

  async analyzePostingPatterns(appId: number): Promise<PostingPattern[]> {
    const query = `
      SELECT 
        EXTRACT(HOUR FROM "socialContentCreatedAt") as hour,
        COUNT(*) as count,
        MAX("socialContentCreatedAt") as last_post
      FROM social_contents 
      WHERE "appId" = $1 
        AND "socialContentCreatedAt" IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM "socialContentCreatedAt")
      ORDER BY count DESC
      LIMIT 5
    `;

    const result = await this.query(query, [appId]);
    return result.map((row: any) => ({
      hour: parseInt(row.hour),
      count: parseInt(row.count),
      lastPost: new Date(row.last_post),
    }));
  }

  async analyzeTopicPreferences(appId: number, query?: string): Promise<TopicPreference[]> {
    // Simple topic analysis based on content patterns
    // In production, you might want to use more sophisticated NLP
    const commonTopics = [
      "technology",
      "ai",
      "programming",
      "business",
      "startup",
      "design",
      "marketing",
      "career",
      "learning",
      "innovation",
      "health",
      "fitness",
      "travel",
      "food",
      "photography",
      "music",
      "art",
      "books",
      "movies",
      "sports",
    ];

    const topicAnalysis = await Promise.all(
      commonTopics.map(async (topic) => {
        const queryBuilder = this.createQueryBuilder("social_content")
          .where("social_content.appId = :appId", { appId })
          .andWhere("LOWER(social_content.content) LIKE LOWER(:topic)", {
            topic: `%${topic}%`,
          });

        if (query) {
          queryBuilder.andWhere("LOWER(social_content.content) LIKE LOWER(:query)", {
            query: `%${query}%`,
          });
        }

        const count = await queryBuilder.getCount();

        if (count > 0) {
          const latestPost = await queryBuilder.orderBy("social_content.socialContentCreatedAt", "DESC").getOne();

          return {
            topic,
            count,
            lastPost: latestPost?.socialContentCreatedAt || new Date(),
            confidence: Math.min(count / 10, 1.0), // Simple confidence calculation
            keywords: [topic],
          };
        }
        return null;
      }),
    );

    return topicAnalysis
      .filter((analysis): analysis is TopicPreference => analysis !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  async getContentStatistics(appId: number): Promise<{
    totalPosts: number;
    totalComments: number;
    averagePostLength: number;
    mostActiveSource: string;
    dateRange: { earliest: Date; latest: Date };
  }> {
    const stats = await this.createQueryBuilder("social_content")
      .select([
        "COUNT(*) as total_count",
        "COUNT(CASE WHEN type = 'post' THEN 1 END) as post_count",
        "COUNT(CASE WHEN type = 'comment' THEN 1 END) as comment_count",
        "AVG(LENGTH(content)) as avg_length",
        'MIN("socialContentCreatedAt") as earliest_date',
        'MAX("socialContentCreatedAt") as latest_date',
      ])
      .where("appId = :appId", { appId })
      .getRawOne();

    const mostActiveSource = await this.createQueryBuilder("social_content")
      .select("source")
      .addSelect("COUNT(*)", "count")
      .where("appId = :appId", { appId })
      .groupBy("source")
      .orderBy("count", "DESC")
      .getRawOne();

    return {
      totalPosts: parseInt(stats.post_count) || 0,
      totalComments: parseInt(stats.comment_count) || 0,
      averagePostLength: parseFloat(stats.avg_length) || 0,
      mostActiveSource: mostActiveSource?.source || "unknown",
      dateRange: {
        earliest: stats.earliest_date ? new Date(stats.earliest_date) : new Date(),
        latest: stats.latest_date ? new Date(stats.latest_date) : new Date(),
      },
    };
  }

  /**
   * Get all unique user IDs that have LinkedIn content
   */
  async getUsersWithLinkedInContent(): Promise<number[]> {
    const results = await this.createQueryBuilder("sc")
      .select(["app.userId"])
      .leftJoin("sc.app", "app")
      .where("sc.source = :source", { source: SocialContentSource.LINKEDIN })
      .andWhere("sc.type = :type", { type: SocialContentType.POST })
      .groupBy("app.userId")
      .getRawMany();

    return results.map((result) => parseInt(result.app_userId, 10)).filter((userId) => !isNaN(userId));
  }

  /**
   * Find social content by external ID, app ID, and source
   * Used to fetch original content when memories contain external_id metadata
   */
  async findByExternalId(
    externalId: string,
    appId: number,
    source?: SocialContentSource,
  ): Promise<SocialContent | null> {
    const queryBuilder = this.createQueryBuilder("social_content")
      .where("social_content.externalId = :externalId", { externalId })
      .andWhere("social_content.appId = :appId", { appId });

    if (source) {
      queryBuilder.andWhere("social_content.source = :source", { source });
    }

    return queryBuilder.getOne();
  }

  /**
   * Query social content with filters for source, temporal range, and semantic search
   * This is the primary method for filtered social content retrieval
   */
  async queryWithFilters(params: {
    appId: number;
    userId?: number;
    query?: string;
    queryEmbedding?: number[];
    sources?: SocialContentSource[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Array<SocialContent & { relevanceScore: number }>> {
    const { appId, query, queryEmbedding, sources, startDate, endDate, limit = 30 } = params;

    this.logger.log(
      `[SocialContent] Direct PostgreSQL query - appId: ${appId}, sources: [${sources?.join(", ") || "all"}], ` +
        `dateRange: ${startDate?.toISOString()} to ${endDate?.toISOString()}`,
    );

    // DEBUG: Check total count and NULL dates
    const debugCountQuery = this.createQueryBuilder("sc")
      .select("COUNT(*)", "total")
      .addSelect("COUNT(CASE WHEN sc.socialContentCreatedAt IS NULL THEN 1 END)", "null_dates")
      .addSelect("COUNT(CASE WHEN sc.socialContentCreatedAt IS NOT NULL THEN 1 END)", "with_dates")
      .where("sc.appId = :appId", { appId });

    if (sources && sources.length > 0) {
      debugCountQuery.andWhere("sc.source IN (:...sources)", { sources });
    }

    const debugCounts = await debugCountQuery.getRawOne();
    this.logger.log(
      `[SocialContent DEBUG] Total posts: ${debugCounts.total}, With dates: ${debugCounts.with_dates}, NULL dates: ${debugCounts.null_dates}`,
    );

    const queryBuilder = this.createQueryBuilder("sc").select("sc.*");

    // Base filters
    queryBuilder.where("sc.appId = :appId", { appId });

    // Source filter
    if (sources && sources.length > 0) {
      queryBuilder.andWhere("sc.source IN (:...sources)", { sources });
    }

    // Temporal filter - handle NULL dates gracefully
    if (startDate && endDate) {
      // Include items where date is in range OR date is NULL (assume recent if no date)
      queryBuilder.andWhere(
        "(sc.socialContentCreatedAt IS NULL OR (sc.socialContentCreatedAt >= :startDate AND sc.socialContentCreatedAt <= :endDate))",
        { startDate, endDate },
      );
    }

    // Semantic search with hybrid scoring (optional - don't filter out results)
    if (query && queryEmbedding && queryEmbedding.length === 1536) {
      // Calculate relevance score but don't filter - let ordering do the work
      queryBuilder
        .addSelect(
          `COALESCE(ts_rank(sc.searchVector, plainto_tsquery('simple', :query)), 0) * 0.3 + 
           COALESCE(1 - (sc.embedding <=> :embedding::vector), 0) * 0.7`,
          "relevance_score",
        )
        .setParameter("query", query)
        .setParameter("embedding", JSON.stringify(queryEmbedding))
        .orderBy("relevance_score", "DESC")
        // Secondary sort by date (prioritize items with actual dates)
        .addOrderBy("COALESCE(sc.socialContentCreatedAt, sc.createdAt)", "DESC");

      this.logger.log(`[SocialContent] Using hybrid search (full-text + vector) without strict filtering`);
    } else {
      // Fallback: order by date only (use socialContentCreatedAt if available, otherwise createdAt)
      queryBuilder
        .addSelect("1.0", "relevance_score")
        .orderBy("COALESCE(sc.socialContentCreatedAt, sc.createdAt)", "DESC");

      this.logger.log(`[SocialContent] Using date-only sorting (no semantic search)`);
    }

    queryBuilder.limit(limit);

    // Log the actual SQL query for debugging
    const sql = queryBuilder.getSql();
    this.logger.log(`[SocialContent SQL] ${sql}`);

    const results = await queryBuilder.getRawMany();

    this.logger.log(`[SocialContent] Direct PostgreSQL query returned ${results.length} results`);

    return results.map((row: any) => ({
      ...this.create({
        id: row.id,
        source: row.source,
        content: row.content,
        type: row.type,
        appId: row.appId,
        externalId: row.external_id,
        socialCredentialId: row.socialCredentialId,
        socialContentCreatedAt: row.socialContentCreatedAt,
        metadata: row.metadata,
        embedding: row.embedding,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
      relevanceScore: parseFloat(row.relevance_score || "1.0"),
    }));
  }

  /**
   * Find multiple social contents by external IDs
   * Efficient batch operation using optimized IN queries
   */
  async findByExternalIds(
    externalIds: Array<{ externalId: string; appId: number; source?: SocialContentSource }>,
  ): Promise<SocialContent[]> {
    if (externalIds.length === 0) {
      return [];
    }

    // Group by appId and source for more efficient querying
    const groupedQueries = new Map<
      string,
      Array<{ externalId: string; appId: number; source?: SocialContentSource }>
    >();

    externalIds.forEach((item) => {
      const key = `${item.appId}-${item.source || "null"}`;
      if (!groupedQueries.has(key)) {
        groupedQueries.set(key, []);
      }
      groupedQueries.get(key)!.push(item);
    });

    // Execute optimized queries for each group and combine results
    const queryPromises = Array.from(groupedQueries.values()).map((group) => {
      const queryBuilder = this.createQueryBuilder("social_content")
        .where("social_content.appId = :appId", { appId: group[0].appId })
        .andWhere("social_content.externalId IN (:...externalIds)", {
          externalIds: group.map((item) => item.externalId),
        });

      // Add source filter if specified
      if (group[0].source) {
        queryBuilder.andWhere("social_content.source = :source", { source: group[0].source });
      }

      return queryBuilder.getMany();
    });

    // Execute all queries in parallel and flatten results
    const results = await Promise.all(queryPromises);
    return results.flat();
  }
}
