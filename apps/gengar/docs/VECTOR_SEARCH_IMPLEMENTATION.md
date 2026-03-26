# Vector Search Implementation for Digital Clone

## Overview

This implementation combines short-term memory (mem0) with vector search to reduce hallucination and improve retrieval accuracy for digital clone applications. The solution uses hybrid search that combines:

1. **Mem0**: Dynamic, conversational memory (already semantic)
2. **PostgreSQL pgvector**: Vector embeddings for social content
3. **Hybrid Search**: Combining keyword + vector search for better coverage

## Architecture

### Components

1. **EmbeddingsService** (`src/modules/embeddings/embeddings.service.ts`)
   - Generates embeddings using OpenAI's text-embedding-3-small model
   - Handles batch embedding generation
   - Prepares text with metadata for better semantic search

2. **Enhanced SocialContentRepository** (`src/db/repositories/social-content.repository.ts`)
   - `searchByVector()`: Pure vector similarity search
   - `hybridSearch()`: Combines keyword and vector search with configurable weights
   - `findContentNeedingEmbeddings()`: Identifies content without embeddings
   - `updateEmbedding()`: Updates content with generated embeddings

3. **Updated RetrievalOrchestratorService** (`src/modules/retrieval/retrieval-orchestrator.service.ts`)
   - Now uses hybrid search in `performKeywordSearch()`
   - Automatically generates query embeddings
   - Falls back to keyword search if embedding generation fails

4. **Automatic Embedding Generation**
   - Embeddings are generated during content ingestion
   - No background jobs needed - all processing happens inline
   - Graceful failure handling if embedding generation fails

## Database Changes

### Migrations

#### 1. AddPgvectorAndEmbeddingsToSocialContent

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 dimensions for OpenAI)
ALTER TABLE social_contents ADD COLUMN embedding vector(1536);

-- Create index for fast similarity search
CREATE INDEX idx_social_contents_embedding ON social_contents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Note: embedding_model_version and embedding_needs_update columns removed in later migrations
```

#### 2. AddEmbeddingsToAppLinks

```sql
-- Add embedding support to app_links table
ALTER TABLE app_links ADD COLUMN embedding vector(1536);

-- Create index for vector search on app_links
CREATE INDEX idx_app_links_embedding ON app_links 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Note: embedding_model_version and embedding_needs_update columns removed in later migrations
```

## How It Works

### 1. Content Ingestion
Embeddings are generated automatically when content is ingested:

#### Social Content
When new social content is stored:
```typescript
// In AppsService.storeSocialContent()
const textForEmbedding = this.embeddingsService.prepareTextForEmbedding(
  content, 
  metadata
);
const embeddingResult = await this.embeddingsService.generateEmbedding(textForEmbedding);
socialContent.embedding = embeddingResult.embedding;
```

#### Link Content
When app links are processed:
```typescript
// In AppsService.processLinksAsync()
const embeddingResult = await this.embeddingsService.generateEmbedding(contents[index]);
appLink.embedding = embeddingResult.embedding;
```

### 2. Hybrid Search
When searching for content:
```typescript
// In RetrievalOrchestratorService.performKeywordSearch()
const queryEmbedding = await this.embeddingsService.generateEmbedding(query);
const results = await this.socialContentRepository.hybridSearch(
  query,
  queryEmbedding,
  appId,
  limit,
  0.3, // keyword weight
  0.7  // vector weight
);
```

## Usage

### 1. Run Database Migrations
```bash
yarn build
yarn migration:run
```

This will:
- Enable pgvector extension
- Add embedding columns to `social_contents` and `app_links` tables
- Create IVFFlat indexes for fast similarity search

### 2. Content Processing
All new content will automatically have embeddings generated during ingestion:
- Social content from Facebook, Instagram, LinkedIn, etc.
- App links content
- No manual intervention required

### 3. Handling Existing Content
For content that was ingested before embeddings were enabled:
- Re-sync the social accounts to regenerate content with embeddings
- All social platforms (Facebook, Instagram, LinkedIn, GitHub, Medium, Substack, etc.) automatically generate embeddings during sync

## Configuration

### Embedding Model
- Model: `text-embedding-3-small` (1536 dimensions)
- Max tokens: 8191 per request
- Batch size: 100 items

### Hybrid Search Weights
- Default: 30% keyword, 70% vector
- Configurable per query in `hybridSearch()`

### Performance Tuning
- IVFFlat index with 100 lists for fast similarity search
- Inline embedding generation during content ingestion
- Optimized vector search with configurable probes parameter

## Benefits

1. **Reduced Hallucination**: Vector search finds semantically similar content even with different wording
2. **Better Coverage**: Hybrid approach ensures both exact matches and semantic matches
3. **Scalable**: Inline embedding generation during content ingestion
4. **Fallback Support**: Gracefully degrades to keyword search if embeddings fail
5. **Simplified Architecture**: No background jobs or tracking fields needed

## Monitoring

Check embedding coverage:
```sql
-- Count content with/without embeddings
SELECT 
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings,
  COUNT(*) as total
FROM social_contents
WHERE app_id = ?;

-- Find content without embeddings
SELECT id, source, type, created_at 
FROM social_contents 
WHERE embedding IS NULL 
  AND app_id = ?
ORDER BY created_at DESC;
```

## Future Improvements

1. **Embedding Models**: Test other models (e.g., text-embedding-ada-002, custom models)
2. **Reranking**: Add a reranking layer for better result ordering
3. **Caching**: Cache frequently used query embeddings
4. **Analytics**: Track search performance and relevance metrics
5. **Multi-language**: Add language-specific embedding models