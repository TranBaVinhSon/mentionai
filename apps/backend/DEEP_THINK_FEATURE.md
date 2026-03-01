# Deep Think Mode Feature Documentation

## Overview

Deep Think Mode is an advanced brainstorming capability that transforms AI conversations into rigorous, research-driven interactions. It combines personal knowledge (memories, documents, social content) with real-time web research to provide expert-level responses grounded in both internal expertise and external evidence.

## Feature Summary

Deep Think Mode was introduced in commits **da77e650** through **6241f70b** on the `cursor/design-deep-think-agentic-loop-and-tool-calls-3bf2` branch, adding approximately **820+ lines** of new functionality to the completions service.

### Key Capabilities

- **Agentic Research Planning**: Automatically generates research plans with targeted queries
- **Multi-Source Evidence Gathering**: Searches both personal memories and web sources in parallel
- **Progressive Progress Updates**: Real-time UI updates showing research stages
- **Persona-Aware Synthesis**: Responses maintain the creator's voice and expertise
- **Source Attribution**: Transparent citation of memories, documents, and web sources

## Architecture

### Core Components

#### 1. Deep Think Request Flow

```typescript
// Entry point via DTO
interface CreateCompletionRequestDto {
  isDeepThinkMode?: boolean; // Enable Deep Think mode
  // ... other fields
}
```

**File**: `src/modules/completions/dto/create-completion-request.dto.ts:135-138`

#### 2. Deep Think System Prompt

**File**: `src/modules/completions/prompts/get-deep-think-system-prompt.ts`

Generates specialized system prompts with:

- **Operating Principles**: Plan → Research → Synthesize workflow
- **Voice Guidance**: Maintains creator's tone and expertise level
- **Tool Protocols**: Instructions for web search and memory search
- **Source Handling**: Requirements for citation and attribution

Key function signature:

```typescript
export function getDeepThinkSystemPrompt(
  app: App | null,
  appCreator: User | null,
  options: DeepThinkPromptOptions = {},
): string;
```

Options include:

- `personaMemoryContext`: Personal knowledge base context
- `allowWebSearch`: Enable/disable web research
- `hasMemorySearch`: Enable personal memory retrieval
- `forceWebSearch`: Require at least one web search
- `evidenceContext`: External research evidence payload

#### 3. Agentic Research Orchestrator

**File**: `src/modules/completions/completions.service.ts:2672-2817`

The `runAgenticDeepResearch` method orchestrates the entire research workflow:

**Phase 1: Planning**

```typescript
private async agenticGeneratePlanAndQueries(
  userQuery: string,
  modelName: string,
): Promise<{
  plan: string[];
  importantTerms: string[];
  webQueries: string[];
  memoryQueries: string[];
}>
```

- Uses LLM to generate structured research plan
- Extracts important terms for query expansion
- Creates targeted queries for web and memory search
- Falls back to heuristic extraction if LLM fails

**Phase 2: Evidence Gathering**

Executes in parallel:

- **Memory Search**: Queries personal knowledge base via `RetrievalOrchestratorService`
- **Web Search**: Uses Exa API for neural web search with autoprompt

**Phase 3: Context Building**

- Formats memory context for personalization
- Structures web evidence with titles, URLs, and summaries
- Streams references to UI for transparency

#### 4. Deep Think Tools

When Deep Think mode is enabled, the following tools are registered:

**Tool: `deepThinkProgress`** (`src/modules/completions/completions.service.ts:472-502`)

```typescript
{
  description: "Send human-friendly updates to the Deep Think UI",
  inputSchema: z.object({
    stage: z.enum(["planning", "research", "analysis", "synthesis", "reflection", "note"]),
    label: z.string().optional(),
    message: z.string().min(1),
    planStep: z.number().min(1).optional(),
    totalSteps: z.number().min(1).optional(),
    confidence: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })
}
```

**Tool: `webSearch`** (`src/modules/completions/completions.service.ts:504-506`)

- Enabled by default unless explicitly disabled
- Provides live web access during conversation
- Integrates with existing web search agent

**Tool: `personaMemorySearch`** (`src/modules/completions/completions.service.ts:508-584`)

```typescript
{
  description: "Query the creator's personal knowledge base",
  inputSchema: z.object({
    query: z.string().min(3),
    maxResults: z.number().min(1).max(40).optional(),
  })
}
```

- Available when user/app context exists
- Searches memories, social content, and documents
- Returns deduplicated, sanitized results with relevance scores

#### 5. Response Streaming

**New Chunk Type**: `deep-think-progress` (`src/modules/completions/completions.service.ts:58`)

```typescript
interface DeepThinkProgressPayload {
  stage: string; // planning, research, analysis, synthesis, etc.
  label?: string; // Human-friendly stage label
  message: string; // Progress message for UI
  planStep?: number; // Current step in plan
  totalSteps?: number; // Total steps in plan
  iteration?: number; // Research iteration counter
  confidence?: string; // Confidence level of findings
  metadata?: Record<string, any>; // Additional context
}
```

Streamed via `streamDeepThinkProgress()` method (`src/modules/completions/completions.service.ts:220-242`)

### Configuration

**Default Configuration** (`src/modules/completions/completions.service.ts:439-443`):

```typescript
const deepThinkConfig = {
  maxRounds: 5, // Maximum research iterations
  forceWebSearch: false, // Orchestrator handles proactive searches
  maxItemsPerSource: 10, // Items per memory/web source
};
```

**Dynamic MaxSteps**: Deep Think mode increases AI SDK's `maxSteps` to allow more tool calls:

```typescript
maxSteps: isDeepThinkMode ? Math.max(deepThinkConfig.maxRounds * 2, 6) : 5;
```

### Research Workflow

1. **Initialization** (`src/modules/completions/completions.service.ts:581-590`)

   - Conversation created early to prevent frontend 404s
   - Deep Think configuration resolved
   - Progress streaming initialized

2. **Pre-Flight Research** (`src/modules/completions/completions.service.ts:952-982`)

   - Orchestrator runs agentic deep research
   - Generates plan and queries via LLM or heuristics
   - Gathers evidence from memory and web in parallel
   - Builds persona memory context and evidence context

3. **Streaming with Tools** (`src/modules/completions/completions.service.ts:1018-1025`)

   - AI SDK streams with extended maxSteps
   - Tools can be called multiple times across iterations
   - Progress updates sent after each tool execution
   - Web search and memory search tracked separately

4. **Synthesis Fallback** (`src/modules/completions/completions.service.ts:1373-1415`)
   - If no text generated after tool calls, runs synthesis-only pass
   - Forces final narrative answer without additional tools
   - Ensures user always receives a coherent response

## Implementation Details

### Tool Execution Tracking

Deep Think mode tracks research iterations via mutable reference:

```typescript
const deepThinkIterationRef = { value: 0 };
```

Each tool call increments the counter, allowing:

- Sequential progress updates
- Metadata correlation
- Frontend state management

### Memory Context Formatting

**Method**: `formatMemoryContextForPersonalization()` (`src/modules/completions/completions.service.ts:2904-2972`)

Features:

- Separates regular memories from raw social content
- Inline display of corresponding raw content by `external_id`
- Rich metadata (source, date, URLs)
- Structured separators for readability
- Instruction block for authentic persona responses

### Evidence Context Structure

```typescript
EVIDENCE PACK FOR: "{userQuery}"

1. [{title}] ({url})
   {content_summary}

2. [{title}] ({url})
   {content_summary}
...
```

Built from Exa search results with:

- Neural search type
- Autoprompt enabled
- Text extraction and summarization
- URL deduplication

### Error Handling

**Orchestrator Errors** (`src/modules/completions/completions.service.ts:977-980`):

- Caught and logged without blocking main flow
- Evidence context remains empty on failure
- System continues with available context

**Synthesis Fallback Errors** (`src/modules/completions/completions.service.ts:1431-1449`):

- Catch-all for no-text scenarios
- Runs synthesis-only pass without tools
- Ensures graceful degradation

**Stream Consumption**: Full stream consumed to ensure multi-step processing completes (`src/modules/completions/completions.service.ts:1365-1371`)

## Integration Points

### Retrieval Orchestrator Service

Deep Think leverages existing retrieval infrastructure:

- `RetrievalOrchestratorService.retrieve()` for memory search
- Query classification and confidence scoring
- Temporal and semantic retrieval strategies
- Social content enrichment

### Exa Web Search

**Configuration**:

- API key from `process.env.EXA_API_KEY`
- Neural search with autoprompt
- Configurable result count (default: 8+)
- Text, highlights, and summary extraction

### AI SDK v5 Integration

Deep Think uses AI SDK's native tool handling:

- Multi-step tool calling with automatic retries
- `onStepFinish` callbacks for result streaming
- `onChunk` callbacks for text streaming
- Automatic tool result injection into conversation

## Frontend Contract

### Request Format

```typescript
POST /api/completions
{
  "isDeepThinkMode": true,
  "isWebSearchEnabled": true,  // Optional, defaults to true
  "messages": [...],
  // ... other fields
}
```

### Response Stream Format

**Progress Updates**:

```json
{
  "type": "deep-think-progress",
  "deepThinkProgress": {
    "stage": "planning",
    "label": "Research plan generated",
    "message": "Created 4-step research plan",
    "iteration": 1,
    "metadata": { ... }
  },
  "conversationUniqueId": "...",
  "models": ["claude-3-5-sonnet-20241022"]
}
```

**Memory Sources**:

```json
{
  "type": "memory-sources",
  "memorySources": [
    {
      "id": "...",
      "memory": "...",
      "metadata": { "link": "...", "source": "twitter" },
      "relevanceScore": 0.85,
      "toolName": "personaMemorySearch",
      "isNewReference": true
    }
  ],
  "referenceSummary": {
    "totalUnique": 15,
    "toolBreakdown": { "personaMemorySearch": 10, "webSearch": 5 }
  }
}
```

**Text Chunks**: Standard text streaming format maintained

## Performance Characteristics

### Time Complexity

- **Planning Phase**: 1 LLM call (~2-5 seconds)
- **Evidence Gathering**: Parallel execution (~3-8 seconds)
  - Up to 3 memory queries concurrently
  - Up to 3 web searches concurrently
- **Synthesis Phase**: Standard streaming response (~10-30 seconds)

**Total Overhead**: ~15-45 seconds additional latency vs. standard mode

### Resource Usage

- **Additional LLM Calls**: +1 for planning (may increase maxSteps by 2-6x)
- **External API Calls**: Up to 6 concurrent (3 memory + 3 web)
- **Memory Footprint**: ~10-20 items × 2 sources = 20-40 context items
- **Token Impact**: +2000-5000 tokens for evidence contexts

## Testing Considerations

### Test Coverage

1. **Unit Tests**: Tool schema validation, context formatting
2. **Integration Tests**: Orchestrator with mocked services
3. **E2E Tests**: Full Deep Think flow with real LLM

### Key Test Scenarios

- Deep Think mode enabled with web search
- Deep Think mode with memory search only
- Fallback to heuristic planning when LLM fails
- Synthesis-only pass when no text generated
- Empty evidence handling (no memories, no web results)
- Tool execution tracking and iteration counting

## Future Enhancements

### Potential Improvements

1. **Adaptive Planning**: Adjust research depth based on query complexity
2. **Incremental Results**: Stream memory/web findings as they arrive
3. **User Feedback Loop**: Allow users to guide research direction mid-stream
4. **Evidence Quality Scoring**: Rank and filter sources by relevance
5. **Cross-Reference Detection**: Identify corroborating evidence across sources
6. **Research Caching**: Cache web/memory results for similar queries

### Configuration Extensions

```typescript
interface DeepThinkConfig {
  maxRounds: number;
  maxItemsPerSource: number;
  forceWebSearch: boolean;
  enableCaching?: boolean; // Future
  minConfidenceThreshold?: number; // Future
  maxParallelQueries?: number; // Future
  synthesisStrategy?: "auto" | "force" | "never"; // Future
}
```

## Commit History

| Commit     | Description                                                |
| ---------- | ---------------------------------------------------------- |
| `6241f70b` | Enhance Deep Think mode with agentic research capabilities |
| `a013f449` | Fix: Use appCreator.name for identity in deep think prompt |
| `426dbdab` | Refactor: Extract deep think config resolution logic       |
| `da77e650` | feat: Implement Deep Think mode for advanced brainstorming |

## Related Files

### Core Implementation

- `src/modules/completions/completions.service.ts` (primary logic)
- `src/modules/completions/prompts/get-deep-think-system-prompt.ts` (system prompt)
- `src/modules/completions/dto/create-completion-request.dto.ts` (DTO)

### Dependencies

- `src/modules/retrieval/retrieval-orchestrator.service.ts` (memory search)
- `src/db/repositories/social-content.repository.ts` (social content)
- `exa-js` package (web search)
- `ai` package v5 (tool handling)

## Contact & Support

For questions or issues related to Deep Think mode:

- Review commit messages for detailed implementation notes
- Check `RETRIEVAL_PR_SUMMARY.md` for retrieval system details
- Consult `TESTING.md` for test execution guidance

---

**Last Updated**: 2025-11-04
**Branch**: `cursor/design-deep-think-agentic-loop-and-tool-calls-3bf2`
**Status**: Active Development
