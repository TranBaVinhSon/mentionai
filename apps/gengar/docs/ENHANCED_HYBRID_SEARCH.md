# Enhanced Hybrid Search Implementation

## Overview

This implementation combines PostgreSQL's full-text search with vector similarity search (semantic search) to provide highly accurate and relevant results for the digital clone application. Full-text search is performed only on the content column for both social_contents and app_links tables.

## Key Benefits

1. **Better Keyword Matching**: PostgreSQL's full-text search understands linguistic variations:

   - Stemming: "running", "runs", "ran" all match
   - Stop words: Common words like "the", "and" are handled intelligently
   - Phrase searching: Can find exact phrases

2. **Semantic Understanding**: Vector embeddings capture meaning beyond keywords:

   - Finds conceptually similar content even with different wording
   - Understands context and relationships

3. **Hybrid Scoring**: Combines both approaches with configurable weights:
   - Default: 30% keyword weight, 70% vector weight
   - Adjustable based on use case

## Architecture

### Database Schema

```sql
-- Full-text search columns and indexes
ALTER TABLE social_contents ADD COLUMN searchVector tsvector;
ALTER TABLE app_links ADD COLUMN searchVector tsvector;

CREATE INDEX idx_social_contents_searchVector ON social_contents USING GIN(searchVector);
CREATE INDEX idx_app_links_searchVector ON app_links USING GIN(searchVector);

-- Vector search columns and indexes (from previous implementation)
ALTER TABLE social_contents ADD COLUMN embedding vector(1536);
ALTER TABLE app_links ADD COLUMN embedding vector(1536);

CREATE INDEX idx_social_contents_embedding ON social_contents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_app_links_embedding ON app_links USING ivfflat (embedding vector_cosine_ops);
```

### Automatic Updates

PostgreSQL triggers automatically update the searchVector when content changes:

```sql
CREATE TRIGGER trg_social_contents_searchVector
BEFORE INSERT OR UPDATE OF content
ON social_contents
FOR EACH ROW
EXECUTE FUNCTION update_social_contents_searchVector();

-- The trigger function only indexes the content column:
CREATE OR REPLACE FUNCTION update_social_contents_searchVector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.searchVector := to_tsvector('english', COALESCE(NEW.content, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Usage

### Enhanced Hybrid Search

```typescript
// Use the enhanced hybrid search method
const results = await socialContentRepository.enhancedHybridSearch(
  "machine learning algorithms",
  queryEmbedding,
  appId,
  10, // limit
  0.3, // keyword weight
  0.7, // vector weight
);

// Results include debug information
results.forEach((result) => {
  console.log({
    content: result.content,
    relevanceScore: result.relevanceScore,
    keywordScore: result.debugInfo.keywordScore,
    vectorScore: result.debugInfo.vectorScore,
    headline: result.debugInfo.headline, // Shows matched keywords highlighted
  });
});
```

### Full-Text Search Only

```typescript
// When embeddings are not available
const results = await socialContentRepository.fullTextSearch("React performance optimization", appId, 10);
```

### Update Retrieval Orchestrator

To use the enhanced search, update the retrieval orchestrator:

```typescript
// In retrieval-orchestrator.service.ts
const results = await this.socialContentRepository.enhancedHybridSearch(
  request.query,
  queryEmbedding,
  request.appId,
  limit,
  0.3, // Adjust weights based on your needs
  0.7,
);
```

## Search Quality Improvements

### Before (LIKE-based search)

- ❌ Case-sensitive issues
- ❌ No linguistic understanding
- ❌ Partial word matching problems
- ❌ Poor performance on large datasets

### After (Full-text + Vector search)

- ✅ Case-insensitive by default
- ✅ Understands word variations
- ✅ Efficient GIN indexes
- ✅ Combines exact and semantic matching
- ✅ Highlights matched terms

## Performance Considerations

1. **Index Usage**: Both GIN (text) and IVFFlat (vector) indexes are used
2. **Pre-filtering**: Vector search pre-filters top 100 results for efficiency
3. **Minimum Thresholds**: Filters out low-relevance results

## Monitoring Search Quality

```sql
-- Check search vector coverage
SELECT
  COUNT(*) FILTER (WHERE searchVector IS NOT NULL) as with_searchVector,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embedding,
  COUNT(*) as total
FROM social_contents
WHERE app_id = ?;

-- Test full-text search
SELECT
  ts_headline('english', content, plainto_tsquery('english', 'your search query')) as highlighted,
  ts_rank(searchVector, plainto_tsquery('english', 'your search query')) as rank
FROM social_contents
WHERE searchVector @@ plainto_tsquery('english', 'your search query')
ORDER BY rank DESC
LIMIT 5;
```

## Configuration Options

### Search Weights

Adjust the balance between keyword and semantic search:

- **More keyword weight (0.5/0.5)**: Better for exact term matching
- **More vector weight (0.2/0.8)**: Better for conceptual similarity
- **Balanced (0.3/0.7)**: Good default for most use cases

### Language Configuration

Currently set to 'simple' for multilingual support:

```sql
-- Current configuration (works with all languages)
to_tsvector('simple', content)  -- Language-agnostic

-- Alternative language-specific options:
to_tsvector('english', content) -- English with stemming
to_tsvector('spanish', content) -- Spanish-specific
to_tsvector('french', content)  -- French-specific
```

**Note**: We use 'simple' configuration to support multiple languages including Japanese, Chinese, Korean, etc. This treats each word/character as a token without language-specific processing.

## Future Enhancements

1. **Query Expansion**: Use synonyms and related terms
2. **Personalization**: Adjust weights based on user behavior
3. **Multi-language**: Detect and use appropriate language configs
4. **Faceted Search**: Add filters for metadata fields
5. **Search Analytics**: Track query performance and relevance
