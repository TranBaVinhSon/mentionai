import { Injectable, Logger } from "@nestjs/common";
import { ChromaUpsertDocument, ChromaQueryOptions, ChromaQueryResultItem } from "./chroma.types";
import { ChromaClient, CloudClient, type Collection } from "chromadb";
import OpenAI from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

@Injectable()
export class ChromaService {
  private readonly logger = new Logger(ChromaService.name);
  private readonly collectionName: string;
  private client: any;
  private collectionPromise: Promise<Collection> | null = null;
  private openai: OpenAI | null = null;
  private embeddingModel: string;
  private readonly textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    const apiKey = process.env.CHROMA_API_KEY || "";
    const tenant = process.env.CHROMA_TENANT || "";
    const database = process.env.CHROMA_DATABASE || "";
    this.collectionName = process.env.CHROMA_COLLECTION || "social_content";

    // Prefer CloudClient when tenant + database are provided (Chroma Cloud)
    if (tenant && database) {
      this.client = new CloudClient({
        apiKey,
        tenant,
        database,
      });
    } else {
      // If using local/self-hosted chroma, require CHROMA_URL
      const chromaUrl = process.env.CHROMA_URL || "";
      if (chromaUrl) {
        this.client = new ChromaClient({ path: chromaUrl } as any);
      }
    }

    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN || "";
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
    this.embeddingModel = process.env.CHROMA_OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

    // Initialize text splitter based on Chroma research recommendations
    // RecursiveCharacterTextSplitter with 250 tokens achieves 91.2% recall
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000, // ~250 tokens at ~4 chars/token
      chunkOverlap: 0, // Can increase to 125 chars for better recall (91.2% vs 82.5%)
      separators: ["\n\n", "\n", ". ", " ", ""], // Natural text boundaries
    });
  }

  private async getCollection(): Promise<Collection> {
    if (this.collectionPromise) return this.collectionPromise;

    if (!this.client) {
      throw new Error(
        "Chroma client is not configured. Set CHROMA_TENANT and CHROMA_DATABASE for cloud, or CHROMA_URL for self-hosted.",
      );
    }

    this.collectionPromise = this.client.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: {
        generate: async () => [],
      },
    });
    return this.collectionPromise;
  }

  async ensureCollection(): Promise<void> {
    try {
      await this.getCollection();
    } catch (error: any) {
      this.logger.error(`ensureCollection failed`, error?.stack || error?.message || String(error));
      throw error;
    }
  }

  /**
   * Chunk a document's text content into smaller pieces for better retrieval
   * Returns array of documents with chunk metadata
   */
  async chunkDocument(document: ChromaUpsertDocument): Promise<ChromaUpsertDocument[]> {
    const text = document.text || "";

    // Chunk long content using LangChain's RecursiveCharacterTextSplitter
    const chunks = await this.textSplitter.splitText(text);

    if (chunks.length === 1) {
      // Single chunk - no splitting needed
      return [document];
    }

    // Multiple chunks - create separate docs with chunk index
    return chunks.map((chunk, idx) => ({
      id: `${document.id}_chunk_${idx}`,
      text: chunk,
      metadata: {
        ...document.metadata,
        chunkIndex: idx,
        totalChunks: chunks.length,
      },
      embedding: undefined, // Will be generated during upsert
    }));
  }

  async upsertDocuments(documents: ChromaUpsertDocument[]): Promise<void> {
    if (!documents?.length) return;

    // Chroma Cloud has a quota limit per batch (default: 300 records)
    // Self-hosted Chroma allows up to 1000
    // Using 300 to be safe for both cloud and self-hosted
    const CHROMA_MAX_BATCH_SIZE = 300;

    // If documents exceed Chroma's limit, batch them
    if (documents.length > CHROMA_MAX_BATCH_SIZE) {
      this.logger.log(
        `Batching ${documents.length} documents into chunks of ${CHROMA_MAX_BATCH_SIZE} for Chroma upsert`,
      );
      for (let i = 0; i < documents.length; i += CHROMA_MAX_BATCH_SIZE) {
        const batch = documents.slice(i, i + CHROMA_MAX_BATCH_SIZE);
        await this.upsertDocumentsBatch(batch);
        this.logger.log(`Upserted batch ${Math.floor(i / CHROMA_MAX_BATCH_SIZE) + 1} (${batch.length} docs)`);
      }
      return;
    }

    await this.upsertDocumentsBatch(documents);
  }

  private async upsertDocumentsBatch(documents: ChromaUpsertDocument[]): Promise<void> {
    const collection = await this.getCollection();

    const ids = documents.map((d) => d.id);
    const metadatas = documents.map((d) => d.metadata);
    const docs = documents.map((d) => d.text || "");
    let embeddings: number[][] | undefined = undefined;
    const haveAnyProvided = documents.some((d) => Array.isArray(d.embedding));
    const needAny = documents.some((d) => !Array.isArray(d.embedding));
    if (haveAnyProvided || needAny) {
      // Build embeddings array aligned to docs; compute missing via OpenAI
      embeddings = new Array(documents.length) as any;
      const textsToEmbed: string[] = [];
      const idxToEmbed: number[] = [];
      documents.forEach((d, i) => {
        if (Array.isArray(d.embedding)) {
          (embeddings as any)[i] = d.embedding;
        } else {
          textsToEmbed.push(d.text || "");
          idxToEmbed.push(i);
        }
      });
      if (idxToEmbed.length > 0) {
        const computed = await this.embedTexts(textsToEmbed);
        idxToEmbed.forEach((idx, j) => {
          (embeddings as any)[idx] = computed[j];
        });
      }
    }

    try {
      await collection.add({ ids, documents: docs, metadatas, embeddings });
    } catch (error: any) {
      this.logger.error(`Chroma upsert failed for ${documents.length} docs`, error?.stack || error?.message);
      throw error;
    }
  }

  async deleteByIds(ids: string[]): Promise<void> {
    if (!ids?.length) return;
    const collection = await this.getCollection();
    try {
      await collection.delete({ ids });
    } catch (error: any) {
      this.logger.error(`Chroma deleteByIds failed`, error?.stack || error?.message);
    }
  }

  async deleteByApp(appId: number): Promise<void> {
    const collection = await this.getCollection();
    try {
      await collection.delete({ where: { appId } as any });
    } catch (error: any) {
      this.logger.error(`Chroma deleteByApp failed`, error?.stack || error?.message);
    }
  }

  async deleteBySource(appId: number, source: string): Promise<void> {
    const collection = await this.getCollection();
    try {
      await collection.delete({ where: { appId, source } as any });
    } catch (error: any) {
      this.logger.error(`Chroma deleteBySource failed`, error?.stack || error?.message);
    }
  }

  async deleteByLink(appId: number, link: string): Promise<void> {
    const collection = await this.getCollection();
    try {
      await collection.delete({ where: { appId, link } as any });
    } catch (error: any) {
      this.logger.error(`Chroma deleteByLink failed`, error?.stack || error?.message);
    }
  }

  /**
   * Hybrid search combining vector similarity and full-text search
   *
   * Strategy:
   * 1. Vector Search: Uses client-side OpenAI embeddings (matching indexing dimensions)
   * 2. Lexical Search: Uses collection.get() with whereDocument.$contains (no embedding needed)
   * 3. Results merged using Reciprocal Rank Fusion (RRF)
   *
   * Reference: https://docs.trychroma.com/docs/querying-collections/query-and-get?lang=typescript
   */
  async query(options: ChromaQueryOptions): Promise<ChromaQueryResultItem[]> {
    const collection = await this.getCollection();
    const { text, topK = 20, filter } = options;
    try {
      this.logger.log(`search options: ${JSON.stringify(options)}`);

      if (!text) {
        return [];
      }

      // Always generate embedding from text for consistency
      this.logger.log(`[VectorSearch] Generating embedding with model: ${this.embeddingModel}`);
      const [queryEmbedding] = await this.embedTexts([text]);
      this.logger.log(`[VectorSearch] Generated embedding with dimension: ${queryEmbedding.length}`);

      // Run vector and lexical search in parallel
      const vectorPromise = (async (): Promise<ChromaQueryResultItem[]> => {
        const result = await collection.query({
          queryEmbeddings: [queryEmbedding as any],
          nResults: topK,
          where: filter as any,
        });

        const ids: string[] = (result?.ids && result.ids[0]) || [];
        const documents: string[] = (result?.documents && result.documents[0]) || [];
        const distances: number[] = (result?.distances && (result.distances[0] as any)) || [];
        const metadatas: Record<string, any>[] = (result?.metadatas && (result.metadatas[0] as any)) || [];

        this.logger.log(`[VectorSearch] Found ${ids.length} results`);

        return ids.map((id, i) => ({
          id,
          text: documents[i],
          // Higher is better; distance is 0..2 depending on metric; use (1 - distance)
          score: distances[i] !== undefined ? 1 - distances[i] : undefined,
          metadata: metadatas[i],
          createdAt: metadatas[i]?.createdAt || metadatas[i]?.timestamp || undefined,
        }));
      })();

      const lexicalPromise = (async (): Promise<ChromaQueryResultItem[]> => {
        // Use collection.get() with whereDocument for full-text search (no embedding required)
        const result = await collection.get({
          whereDocument: { $contains: text } as any,
          where: filter as any,
          limit: topK,
        } as any);

        const ids: string[] = result?.ids || [];
        const documents: string[] = result?.documents || [];
        const metadatas: Record<string, any>[] = (result?.metadatas as any) || [];

        this.logger.log(`[LexicalSearch] Found ${ids.length} results`);

        return ids.map((id, i) => ({
          id,
          text: documents[i],
          score: undefined, // get() doesn't return similarity scores
          metadata: metadatas[i],
          createdAt: metadatas[i]?.createdAt || metadatas[i]?.timestamp || undefined,
        }));
      })();

      const [vectorResults, lexicalResults] = await Promise.all([vectorPromise, lexicalPromise]);

      // If only one side is available, return it
      if (lexicalResults.length === 0) {
        return vectorResults;
      }
      if (vectorResults.length === 0) {
        return lexicalResults;
      }

      // Hybrid merge using Reciprocal Rank Fusion (RRF)
      const k = 60; // standard RRF constant
      const byId: Record<string, ChromaQueryResultItem & { rrf?: number }> = {};

      const addWithRanks = (items: ChromaQueryResultItem[], isVector: boolean) => {
        items.forEach((item, index) => {
          const id = item.id;
          if (!byId[id]) byId[id] = { ...item } as any;
          const rank = index + 1;
          const contribution = 1 / (k + rank);
          byId[id].rrf = (byId[id].rrf || 0) + contribution;
          // Prefer highest quality text/metadata fields from vector result; fallback to existing
          if (isVector) {
            byId[id].text = item.text ?? byId[id].text;
            byId[id].metadata = item.metadata ?? byId[id].metadata;
            byId[id].createdAt = item.createdAt ?? byId[id].createdAt;
          }
        });
      };

      addWithRanks(vectorResults, true);
      addWithRanks(lexicalResults, false);

      const fused = Object.values(byId)
        .map((item) => ({ ...item, score: item.rrf }))
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, topK)
        .map((item) => {
          // Remove internal rrf field if present without binding unused var
          const rest = { ...(item as any) };
          delete (rest as any).rrf;
          return rest as ChromaQueryResultItem;
        });

      return fused;
    } catch (error: any) {
      this.logger.error(`Chroma query failed`, error?.stack || error?.message);
      return [];
    }
  }

  private async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.openai) {
      throw new Error("OPENAI_API_KEY is required for embeddings");
    }

    // Batch texts to avoid exceeding OpenAI token limits
    // text-embedding-3-small has 8192 token limit
    // Conservatively batch ~50 texts at a time to stay well under limit
    const batchSize = 50;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const res = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: batch,
      });
      allEmbeddings.push(...res.data.map((d) => d.embedding as unknown as number[]));
    }

    return allEmbeddings;
  }

  async fullTextSearch(options: {
    text: string;
    topK?: number;
    filter?: Record<string, any>;
  }): Promise<ChromaQueryResultItem[]> {
    const collection = await this.getCollection();
    const { text, topK = 20, filter } = options;
    try {
      const result = (await collection.query({
        whereDocument: { $contains: text } as any,
        where: filter as any,
        nResults: topK,
      } as any)) as any;

      const ids: string[] = (result?.ids && result.ids[0]) || [];
      const documents: string[] = (result?.documents && result.documents[0]) || [];
      const metadatas: Record<string, any>[] = (result?.metadatas && (result.metadatas[0] as any)) || [];

      return ids.map((id, i) => ({
        id,
        text: documents[i],
        score: undefined, // full-text may not return distances
        metadata: metadatas[i],
        createdAt: metadatas[i]?.createdAt || metadatas[i]?.timestamp || undefined,
      }));
    } catch (error: any) {
      this.logger.error(`Chroma full-text query failed`, error?.stack || error?.message);
      return [];
    }
  }
}
