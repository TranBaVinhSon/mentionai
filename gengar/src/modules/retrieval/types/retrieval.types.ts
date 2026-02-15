// Simplified retrieval types focusing on memory, fulltext, and semantic search

export interface MemorySearchResult {
  id: string;
  memory: string;
  metadata?: Record<string, any>;
  createdAt: string;
  relevanceScore: number;
  source: "mem0" | "chroma";
}

export interface ContentSearchResult {
  id: number;
  content: string;
  source: string; // 'social_content' or 'app_link'
  type?: string; // For social content: post, comment, etc.
  link?: string; // For app links
  createdAt: Date;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface RetrievalRequest {
  query: string;
  userId: number;
  appId?: number;
  maxResults?: number;
  conversationId?: number;
  weights?: Record<string, number>;
}

export interface RetrievalResponse {
  query: string;
  memories: MemorySearchResult[];
  contents: ContentSearchResult[];
  totalResults: number;
  processingTime: number;
  combinedResults?: CombinedResult[];
  layers?: RetrievalLayer;
  queryAnalysis?: any; // QueryAnalysis type from query-classifier
  confidenceLevel?: "high" | "medium" | "low" | "none";
  sourcesUsed?: string[]; // List of sources that contributed results
}

export interface RetrievalConfig {
  maxResultsPerType: {
    memory: number;
    fulltext: number;
    semantic: number;
  };
  minRelevanceThreshold: number;
}

export interface RetrievalLayer {
  semantic: any[];
  keyword: any[];
  contextual: any[];
  temporal: any[];
  behavioral: any[];
}

export interface CombinedResult {
  content: string;
  score?: number;
  relevanceScore?: number;
  source: string;
  type?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  originalId?: any;
}
