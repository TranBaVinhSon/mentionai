export interface ChromaMetadata {
  userId: number;
  appId: number;
  source?: string; // Required for social_content, not present for app_link
  origin: "social_content" | "app_link";
  id: number; // social_content.id or app_link.id depending on origin
  createdAt?: string;
  // Allow additional metadata fields
  [key: string]: any;
}

export interface ChromaUpsertDocument {
  id: string;
  text: string;
  embedding?: number[];
  metadata: ChromaMetadata;
}

export interface ChromaQueryFilter {
  appId?: number;
  userId?: number;
  source?: string;
  link?: string;
  // Support for ChromaDB logical operators
  $and?: ChromaQueryFilter[];
  $or?: ChromaQueryFilter[];
  // Allow any other metadata fields
  [key: string]: any;
}

export interface ChromaQueryOptions {
  text?: string;
  topK?: number;
  filter?: ChromaQueryFilter;
}

export interface ChromaQueryResultItem {
  id: string;
  text?: string;
  score?: number;
  metadata?: Record<string, any>;
  createdAt?: string;
}
