# Chunking Libraries Comparison

Quick reference for choosing the right text chunking library.

## Summary Table

| Library          | Language | Setup   | Recall               | Speed     | Cost      | Best For            |
| ---------------- | -------- | ------- | -------------------- | --------- | --------- | ------------------- |
| **LangChain** ⭐ | JS/TS    | Easy    | 91.2%                | Fast      | Free      | **Production apps** |
| Tiktoken         | JS/TS    | Easy    | 88.7%                | Medium    | Free      | Token-precise needs |
| Semantic Chunker | JS/TS    | Medium  | 85% + 6.9% precision | Slow      | High      | Premium features    |
| LlamaIndex       | Python   | Easy    | ~90%                 | Fast      | Free      | Python projects     |
| LLM-based        | Any      | Complex | ~95%                 | Very Slow | Very High | Critical docs       |

## Detailed Comparison

### 1. LangChain RecursiveCharacterTextSplitter ⭐ (Our Choice)

**Install:**

```bash
npm install langchain
```

**Usage:**

```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 125,
  separators: ["\n\n", "\n", ". ", " ", ""],
});

const chunks = await splitter.splitText(longText);
```

**Pros:**

- ✅ Battle-tested (used by 100k+ apps)
- ✅ Excellent recall (91.2%)
- ✅ Fast performance
- ✅ Handles edge cases well
- ✅ Free and open-source
- ✅ Good documentation

**Cons:**

- ⚠️ Extra dependency (~500kb)
- ⚠️ Character-based (not token-precise)

**When to use:**

- Default choice for most applications
- Social content + articles (our use case)
- Need reliability over cutting-edge performance

---

### 2. Tiktoken (OpenAI)

**Install:**

```bash
npm install tiktoken
```

**Usage:**

```typescript
import { get_encoding } from "tiktoken";

const enc = get_encoding("cl100k_base"); // GPT-4
const tokens = enc.encode(text);

// Manual chunking at exact token boundaries
const chunks = [];
for (let i = 0; i < tokens.length; i += 250) {
  const chunk_tokens = tokens.slice(i, i + 250);
  chunks.push(enc.decode(chunk_tokens));
}
```

**Pros:**

- ✅ Exact token counting
- ✅ Model-specific tokenization
- ✅ Official OpenAI library

**Cons:**

- ❌ Doesn't respect semantic boundaries
- ❌ More complex to implement
- ❌ Slightly slower
- ❌ Lower recall than RecursiveCharacterTextSplitter

**When to use:**

- Need exact token counts for billing
- Optimizing for specific model token limits
- Building token-aware features

---

### 3. Semantic Chunking (LangChain)

**Install:**

```bash
npm install langchain
```

**Usage:**

```typescript
import { ClusterSemanticChunker } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

const splitter = new ClusterSemanticChunker({
  embeddings: new OpenAIEmbeddings(),
  maxChunkSize: 1000,
});

const chunks = await splitter.splitText(longText);
```

**Pros:**

- ✅ Highest precision (6.9% vs 3.7%)
- ✅ Semantically coherent chunks
- ✅ Best for complex documents

**Cons:**

- ❌ Very slow (requires embedding each sentence)
- ❌ Expensive (OpenAI API calls for every split)
- ❌ Complex setup
- ❌ Lower recall (85% vs 91.2%)

**When to use:**

- Premium tier features
- Complex technical documents
- Budget allows for higher API costs
- Quality > speed

---

### 4. LlamaIndex (Python Only)

**Install:**

```bash
pip install llama-index
```

**Usage:**

```python
from llama_index.text_splitter import SentenceSplitter

splitter = SentenceSplitter(
    chunk_size=250,
    chunk_overlap=25
)
chunks = splitter.split_text(text)
```

**Pros:**

- ✅ Excellent for Python-based RAG
- ✅ Well-integrated with LlamaIndex ecosystem
- ✅ Good performance

**Cons:**

- ❌ Python only (not available in Node.js)
- ❌ Requires porting to TypeScript

**When to use:**

- Building Python backend
- Already using LlamaIndex

---

### 5. Custom Implementation

**Our old implementation (now replaced):**

```typescript
private chunkText(text: string, maxSize: number): string[] {
  // Recursive splitting on natural boundaries
  // ... ~45 lines of code
}
```

**Pros:**

- ✅ No dependencies
- ✅ Full control
- ✅ Optimized for specific use case

**Cons:**

- ❌ Maintenance burden
- ❌ Edge cases to handle
- ❌ Not battle-tested
- ❌ Reinventing the wheel

**When to use:**

- Very specific requirements
- No external dependencies allowed
- Performance critical (can optimize)

---

## Recommendation for Social Content

For **Twitter, LinkedIn posts + articles** retrieval:

1. **Start with**: LangChain RecursiveCharacterTextSplitter ⭐

   - Best balance of accuracy, speed, and reliability
   - 91.2% recall is excellent
   - Proven at scale

2. **Optimize later**: Add chunk overlap

   ```typescript
   chunkOverlap: 125; // +8.7% recall improvement
   ```

3. **Future consideration**: Semantic chunking for premium tier
   - Only if budget allows
   - For users needing highest quality

## Performance Benchmarks

Based on Chroma research with State of the Union corpus:

| Strategy  | Chunk Size | Overlap | Recall    | Precision | Chunks per 1000 chars |
| --------- | ---------- | ------- | --------- | --------- | --------------------- |
| Recursive | 250 tokens | 125     | **91.2%** | 3.7%      | ~4                    |
| Recursive | 250 tokens | 0       | 82.5%     | 3.6%      | ~4                    |
| TokenText | 250 tokens | 125     | 88.7%     | 2.6%      | ~4                    |
| Semantic  | 200 tokens | 0       | 85.0%     | **6.9%**  | ~3-5 (variable)       |
| Fixed     | 250 tokens | 0       | 57.7%     | 17.9%     | ~4                    |

## Migration from Custom to LangChain

We migrated from custom implementation to LangChain:

**Benefits:**

- ✅ -45 lines of code to maintain
- ✅ Better edge case handling
- ✅ Community-tested reliability
- ✅ Easier for new developers

**Changes needed:**

```diff
- const chunks = this.chunkText(text, 1000);
+ const chunks = await this.textSplitter.splitText(text);
```

**Result:**

- Same 91.2% recall potential
- More reliable implementation
- Less maintenance burden

## References

- [Chroma: Evaluating Chunking Strategies](https://research.trychroma.com/evaluating-chunking)
- [LangChain Text Splitters](https://js.langchain.com/docs/modules/data_connection/document_transformers/)
- [OpenAI Tiktoken](https://github.com/openai/tiktoken)
