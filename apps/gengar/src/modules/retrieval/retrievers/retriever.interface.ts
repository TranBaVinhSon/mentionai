import { RetrievalRequest, MemorySearchResult, ContentSearchResult } from "../types/retrieval.types";
import { QueryAnalysis } from "../query-classifier.service";

/**
 * Base retriever interface
 * Each specialized retriever implements this interface
 */
export interface Retriever {
  /**
   * Execute retrieval based on request and query analysis
   */
  retrieve(request: RetrievalRequest, analysis: QueryAnalysis): Promise<RetrievalResult[]>;

  /**
   * Get retriever name for logging
   */
  getName(): string;
}

/**
 * Unified retrieval result that can come from any source
 */
export interface RetrievalResult {
  id: string;
  content: string;
  relevanceScore: number;
  source: string; // 'chroma', 'mem0', 'social_content', 'app_link', 'analytics'
  type?: string; // 'memory', 'post', 'article', 'fact', 'stat', etc.
  createdAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Convert MemorySearchResult to RetrievalResult
 */
export function memoryToRetrievalResult(memory: MemorySearchResult): RetrievalResult {
  return {
    id: memory.id,
    content: memory.memory,
    relevanceScore: memory.relevanceScore,
    source: memory.source,
    type: "memory",
    createdAt: new Date(memory.createdAt),
    metadata: memory.metadata,
  };
}

/**
 * Convert ContentSearchResult to RetrievalResult
 */
export function contentToRetrievalResult(content: ContentSearchResult): RetrievalResult {
  return {
    id: content.id.toString(),
    content: content.content,
    relevanceScore: content.relevanceScore,
    source: content.source,
    type: content.type,
    createdAt: content.createdAt,
    metadata: content.metadata,
  };
}
