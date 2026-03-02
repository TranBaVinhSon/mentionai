import { Injectable, Logger, Inject } from "@nestjs/common";
import { openai } from "@ai-sdk/openai";
import { embed, embedMany, cosineSimilarity } from "ai";
import Rollbar from "rollbar";
import { ROLLBAR_TOKEN } from "src/config/rollbar.provider";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens: number;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly defaultModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
  // Options: "text-embedding-3-small" (1536 dims), "text-embedding-3-large" (3072 dims)
  // Note: Changing this requires updating database vector dimensions
  private readonly dimensions = this.defaultModel === "text-embedding-3-large" ? 3072 : 1536;
  private readonly maxBatchSize = 100;
  private readonly maxTokensPerRequest = 8191; // OpenAI limit

  constructor(@Inject(ROLLBAR_TOKEN) private readonly rollbar: Rollbar) {
    this.logger.log(`Using embedding model: ${this.defaultModel} with ${this.dimensions} dimensions`);
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    try {
      // Validate and sanitize input
      const sanitizedText = this.validateAndSanitizeText(text);

      const { embedding, usage } = await embed({
        model: openai.embedding(this.defaultModel),
        value: this.truncateText(sanitizedText),
      });

      return {
        embedding: Array.from(embedding),
        model: this.defaultModel,
        tokens: usage?.tokens || 0,
      };
    } catch (error) {
      this.logger.error("Error generating embedding:", {
        error: error.message,
        stack: error.stack,
        textLength: text?.length || 0,
        textPreview: text?.substring(0, 100) || "null/undefined",
        hasSpecialChars: text ? /[^\x20-\x7E\s]/.test(text) : false,
      });
      this.rollbar.error("Error generating embedding", {
        error: error.message || String(error),
        stack: error.stack,
        textLength: text?.length || 0,
        textPreview: text?.substring(0, 100) || "null/undefined",
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const results: EmbeddingResult[] = [];

      // Process in batches to respect API limits
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        const batch = texts.slice(i, i + this.maxBatchSize);
        const truncatedBatch = batch.map((text) => this.truncateText(text));

        const { embeddings, usage } = await embedMany({
          model: openai.embedding(this.defaultModel),
          values: truncatedBatch,
        });

        embeddings.forEach((embedding, index) => {
          results.push({
            embedding: Array.from(embedding),
            model: this.defaultModel,
            tokens: usage?.tokens || 0,
          });
        });
      }

      return results;
    } catch (error) {
      this.logger.error("Error generating embeddings batch:", error.stack);
      this.rollbar.error("Error generating embeddings batch", {
        error: error.message || String(error),
        stack: error.stack,
        batchSize: texts.length,
      });
      throw error;
    }
  }

  /**
   * Truncate text to fit within token limits
   */
  private truncateText(text: string): string {
    // Ultra conservative estimation to handle worst case
    // Some content (code, special chars) can use 1 token per character
    // Use only 5000 tokens to ensure we never exceed limits
    const maxChars = 5000; // Extremely conservative

    if (text.length <= maxChars) {
      return text;
    }

    // Truncate and add ellipsis
    return text.substring(0, maxChars - 3) + "...";
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same dimensions");
    }
    return cosineSimilarity(embedding1, embedding2);
  }

  /**
   * Split text into chunks for embedding
   * Uses a simple approach based on character count with sentence boundaries
   */
  splitTextIntoChunks(text: string, maxChunkSize = 30000): string[] {
    // Approximate max chars for token limit (1 token ≈ 4 chars)
    // Leave some buffer for safety
    const chunks: string[] = [];

    if (text.length <= maxChunkSize) {
      return [text];
    }

    // Split by paragraphs first, then by sentences if needed
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length + 2 <= maxChunkSize) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        // If adding this paragraph exceeds limit
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = "";
        }

        // If single paragraph is too long, split by sentences
        if (paragraph.length > maxChunkSize) {
          const sentences = paragraph.split(/(?<=[.!?])\s+/);
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
              currentChunk += (currentChunk ? " " : "") + sentence;
            } else {
              if (currentChunk) {
                chunks.push(currentChunk);
              }
              // If single sentence is too long, truncate it
              currentChunk =
                sentence.length > maxChunkSize ? sentence.substring(0, maxChunkSize - 3) + "..." : sentence;
            }
          }
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Validate and sanitize text input for embedding generation
   */
  private validateAndSanitizeText(text: string): string {
    // Check for null/undefined
    if (text == null) {
      throw new Error("Cannot generate embedding for null or undefined text");
    }

    // Ensure it's a string
    if (typeof text !== "string") {
      throw new Error(`Cannot generate embedding for non-string input: ${typeof text}`);
    }

    // Sanitize the text
    const sanitized = text
      .trim()
      // Remove control characters (except newline, tab, carriage return)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
      // Remove BOM and other invisible characters
      .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ");

    // Check if content is empty after sanitization
    if (sanitized.length === 0) {
      throw new Error("Cannot generate embedding for empty text after sanitization");
    }

    // Check for minimum meaningful content (at least 1 character)
    if (sanitized.length < 1) {
      throw new Error("Text too short for embedding generation");
    }

    return sanitized;
  }

  /**
   * Prepare text for embedding by cleaning and normalizing
   */
  prepareTextForEmbedding(content: string, metadata?: any): string {
    const parts: string[] = [];

    // Add main content with validation
    if (content && typeof content === "string") {
      const cleanContent = content.trim();
      if (cleanContent.length > 0) {
        parts.push(cleanContent);
      }
    }

    // Add relevant metadata for better semantic search
    if (metadata && typeof metadata === "object") {
      const metadataParts: string[] = [];

      // GitHub repository metadata
      if (metadata.description && typeof metadata.description === "string") {
        metadataParts.push(`Description: ${metadata.description.trim()}`);
      }
      if (Array.isArray(metadata.topics) && metadata.topics.length > 0) {
        const topics = metadata.topics.filter((t) => typeof t === "string" && t.trim().length > 0);
        if (topics.length > 0) {
          metadataParts.push(`Topics: ${topics.join(", ")}`);
        }
      }
      if (metadata.language && typeof metadata.language === "string") {
        metadataParts.push(`Language: ${metadata.language.trim()}`);
      }

      // User profile metadata
      if (metadata.bio && typeof metadata.bio === "string") {
        metadataParts.push(`Bio: ${metadata.bio.trim()}`);
      }
      if (metadata.company && typeof metadata.company === "string") {
        metadataParts.push(`Company: ${metadata.company.trim()}`);
      }
      if (metadata.location && typeof metadata.location === "string") {
        metadataParts.push(`Location: ${metadata.location.trim()}`);
      }

      if (metadataParts.length > 0) {
        parts.push(metadataParts.join("\n"));
      }
    }

    const result = parts.join("\n\n");

    // Ensure we have meaningful content
    if (result.trim().length === 0) {
      throw new Error("No valid content found for embedding after processing content and metadata");
    }

    return result;
  }

  /**
   * Generate embeddings for long text by chunking it first
   * Returns the average embedding of all chunks
   */
  async generateEmbeddingForLongText(text: string): Promise<EmbeddingResult> {
    // Handle empty or null text
    if (!text || text.trim().length === 0) {
      throw new Error("Cannot generate embedding for empty text");
    }

    // Ultra conservative token estimation
    const maxCharsPerChunk = 5000; // Safe for worst case scenario

    // Always truncate first to ensure we don't exceed limits
    const truncatedText = this.truncateText(text);

    // Check if truncated text fits in single embedding
    if (truncatedText.length <= maxCharsPerChunk) {
      return this.generateEmbedding(truncatedText);
    }

    // Split into chunks
    const chunks = this.splitTextIntoChunks(truncatedText, maxCharsPerChunk);
    this.logger.log(`Splitting long text (${text.length} chars) into ${chunks.length} chunks for embedding`);

    // Generate embeddings for each chunk individually to avoid batch size issues
    const chunkEmbeddings: EmbeddingResult[] = [];

    for (let i = 0; i < chunks.length; i++) {
      try {
        this.logger.log(`Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
        const result = await this.generateEmbedding(chunks[i]);
        chunkEmbeddings.push(result);
      } catch (error) {
        this.logger.error(`Failed to embed chunk ${i + 1}: ${error.message}`);
        // If a chunk fails, try with a smaller chunk
        const smallerChunk = chunks[i].substring(0, 3000);
        const result = await this.generateEmbedding(smallerChunk);
        chunkEmbeddings.push(result);
      }
    }

    // Average the embeddings
    const avgEmbedding = new Array(this.dimensions).fill(0);
    let totalTokens = 0;

    for (const result of chunkEmbeddings) {
      totalTokens += result.tokens;
      for (let i = 0; i < this.dimensions; i++) {
        avgEmbedding[i] += result.embedding[i] / chunkEmbeddings.length;
      }
    }

    return {
      embedding: avgEmbedding,
      model: this.defaultModel,
      tokens: totalTokens,
    };
  }
}
