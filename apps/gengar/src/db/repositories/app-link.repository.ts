import { Injectable } from "@nestjs/common";
import { DataSource, Repository, In } from "typeorm";
import { AppLink } from "../entities/app-link.entity";

@Injectable()
export class AppLinkRepository extends Repository<AppLink> {
  constructor(private dataSource: DataSource) {
    super(AppLink, dataSource.createEntityManager());
  }

  /**
   * Search app links by keyword
   */
  async searchByKeyword(keyword: string, appId?: number, limit = 10): Promise<AppLink[]> {
    const queryBuilder = this.createQueryBuilder("app_link");

    queryBuilder
      .where("LOWER(app_link.content) LIKE LOWER(:keyword)", {
        keyword: `%${keyword}%`,
      })
      .orderBy("app_link.createdAt", "DESC")
      .limit(limit);

    if (appId) {
      queryBuilder.andWhere("app_link.appId = :appId", { appId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Search app links using vector similarity
   */
  async searchByVector(
    queryEmbedding: number[],
    appId?: number,
    limit = 10,
    threshold = 0.7,
  ): Promise<Array<AppLink & { similarity: number }>> {
    // Validate embedding dimensions
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      throw new Error("Query embedding must have exactly 1536 dimensions");
    }

    const queryBuilder = this.createQueryBuilder("al")
      .select("al.*")
      .addSelect("1 - (al.embedding <=> :embedding::vector)", "similarity")
      .where("al.embedding IS NOT NULL");

    if (appId) {
      queryBuilder.andWhere("al.appId = :appId", { appId });
    }

    queryBuilder
      .orderBy("al.embedding <=> :embedding::vector", "ASC")
      .limit(limit)
      .setParameter("embedding", JSON.stringify(queryEmbedding));

    try {
      const results = await queryBuilder.getRawMany();

      return results
        .filter((row: any) => parseFloat(row.similarity) > threshold)
        .map((row: any) => ({
          ...this.create({
            id: row.id,
            link: row.link,
            content: row.content,
            appId: row.appId,
            embedding: row.embedding,
            searchVector: row.searchVector,
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
  ): Promise<Array<AppLink & { relevanceScore: number }>> {
    // If no embedding provided, fall back to keyword search
    if (!queryEmbedding) {
      const keywordResults = await this.searchByKeyword(keyword, appId, limit);
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
      const query = this.createQueryBuilder("al")
        .select("al.*")
        .addSelect(
          `(
            CASE 
              WHEN LOWER(al.content) LIKE LOWER(:exact) THEN 1.0
              WHEN LOWER(al.content) LIKE LOWER(:words) THEN 0.8
              ELSE 0.0
            END
          ) * :keywordWeight + 
          COALESCE(1 - (al.embedding <=> :embedding::vector), 0) * :vectorWeight`,
          "relevance_score",
        )
        .where(
          `(
            LOWER(al.content) LIKE LOWER(:exact) OR
            LOWER(al.content) LIKE LOWER(:words) OR
            (al.embedding IS NOT NULL AND 1 - (al.embedding <=> :embedding::vector) > 0.7)
          )`,
        )
        .setParameter("exact", `%${keyword}%`)
        .setParameter("words", `%${keyword.split(" ").join("%")}%`)
        .setParameter("embedding", JSON.stringify(queryEmbedding))
        .setParameter("keywordWeight", keywordWeight)
        .setParameter("vectorWeight", vectorWeight);

      if (appId) {
        query.andWhere("al.appId = :appId", { appId });
      }

      query.orderBy("relevance_score", "DESC").limit(limit);

      const results = await query.getRawMany();

      return results.map((row: any) => ({
        ...this.create({
          id: row.id,
          link: row.link,
          content: row.content,
          appId: row.appId,
          embedding: row.embedding,
          searchVector: row.searchVector,
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
  ): Promise<Array<AppLink & { relevanceScore: number }>> {
    const queryBuilder = this.createQueryBuilder("al")
      .select("al.*")
      .addSelect("ts_rank(al.searchVector, plainto_tsquery('simple', :query))", "relevance_score")
      .where("al.searchVector @@ plainto_tsquery('simple', :query)", { query });

    if (appId) {
      queryBuilder.andWhere("al.appId = :appId", { appId });
    }

    queryBuilder.orderBy("relevance_score", "DESC").limit(limit);

    const results = await queryBuilder.getRawMany();

    return results.map((row: any) => ({
      ...this.create({
        id: row.id,
        link: row.link,
        content: row.content,
        appId: row.appId,
        embedding: row.embedding,
        searchVector: row.searchVector,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
      relevanceScore: parseFloat(row.relevance_score),
    }));
  }

  /**
   * Update embedding for an app link
   */
  async updateEmbedding(id: number, embedding: number[]): Promise<void> {
    await this.createQueryBuilder()
      .update(AppLink)
      .set({
        embedding: () => ":embedding::vector",
      })
      .where("id = :id")
      .setParameters({ embedding: JSON.stringify(embedding), id })
      .execute();
  }

  /**
   * Create and save an app link with embedding and metadata
   */
  async createAppLinkWithEmbedding(appLinkData: {
    link: string;
    content: string;
    appId: number;
    embedding?: string;
    metadata?: {
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
      siteName?: string;
      [key: string]: any; // Allow additional properties for YouTube, social media, etc.
    };
  }): Promise<AppLink> {
    const appLink = this.create({
      link: appLinkData.link,
      content: appLinkData.content,
      appId: appLinkData.appId,
      embedding: appLinkData.embedding,
      metadata: appLinkData.metadata,
    });

    return await this.save(appLink);
  }

  /**
   * Update search vector for an app link
   */
  async updateSearchVector(id: number, content: string): Promise<void> {
    await this.createQueryBuilder()
      .update(AppLink)
      .set({
        searchVector: () => "to_tsvector('simple', COALESCE(:content, ''))",
      })
      .where("id = :id")
      .setParameters({ content, id })
      .execute();
  }

  /**
   * Batch fetch app links by multiple links and appId with metadata
   * Optimized for fetching document metadata enrichment
   *
   * @param links Array of link URLs to fetch
   * @param appId The app ID to filter by
   * @returns Map of link URL to AppLink entity for O(1) lookup
   */
  async findByLinksWithMetadata(links: string[], appId: number): Promise<Map<string, AppLink>> {
    if (links.length === 0) {
      return new Map();
    }

    // Batch fetch all app links using IN operator
    const appLinks = await this.find({
      where: {
        link: In(links),
        appId: appId,
      },
      select: ["id", "link", "content", "metadata", "appId", "createdAt", "updatedAt"],
    });

    // Return as a Map for O(1) lookup performance
    return new Map(appLinks.map((appLink) => [appLink.link, appLink]));
  }
}
