<!-- 87fedcba-de64-44c2-8f75-697c09c2d23b a8d6c407-6268-4a4d-9c47-e4e695b142d3 -->
# Deep Think: Web‑Augmented Reasoning with Clean Output

## Objectives

- Always enrich Deep Think answers with external context via web search.
- Keep “thinking” out of the answer body; all planning/research updates stream as progress metadata only.
- Preserve current multi-step tool orchestration and SSE stream format.

## Scope

- Backend: `gengar/src/modules/completions/completions.service.ts`, `gengar/src/modules/completions/prompts/get-deep-think-system-prompt.ts`, `gengar/src/agents/web-search.ts`.
- Frontend: Already refactored to consume `deepThinkProgress` as message metadata; only minor UX polish as needed.

## Design

### 1) Prompt Guardrails (clean output)

- Strengthen system prompt to forbid meta-commentary in the answer (e.g., “let me think…”, “I’m going to search…”).
- Require the first sentence to directly address the user question.
- Keep all planning and research updates flowing only through `deepThinkProgress` tool.

### 2) Proactive Web Search Bootstrap (pre-search)

- When `isDeepThinkMode` (no flag):
- Run one initial web search using the last user message as the query (6–8 results).
- Stream immediately:
- `deep-think-progress` with stage="research", label "Web search", metadata `{ queries: [query], resultCount, topDomains[] }`.
- `tool-results` with `toolName: "webSearch"` and a trimmed, deduped result set.
- Build a compact `evidenceContext` (top titles + summaries) and pass it to `getDeepThinkSystemPrompt(..., { evidenceContext })` so the ensuing reasoning is grounded.
- Keep `tools.webSearch` registered so the model can add more searches during the loop.

Implementation note:

- Add `performWebSearch(query: string, max?: number)` exported from `gengar/src/agents/web-search.ts` (reuse current Exa logic, keep trimming/host dedupe).

### 3) Stream-time Sanitizer (belt-and-suspenders)

- Deep Think path only: sanitize the first visible text chunk to remove meta-thought prefaces if they slip through (e.g., “let me think”, “I’m going to search”, “first, let me outline…”). Once real content starts, stream normally. Keep this minimal and fast.

### 4) Progress Telemetry (already present, enrich slightly)

- For `webSearch` step in `onStepFinish`, include `metadata.topDomains`, `resultCount`, and `queries` for timeline badges.
- After `onFinish`, send a brief `reflection` recap with `{ durationSec, stepsExecuted, toolCalls }`.

### 5) Configuration & Safeguards

- Deep Think always uses web search (remove `isWebSearchEnabled` throughout FE/BE). Optionally keep an env-level kill switch if needed.
- Add a final safety: if Deep Think finishes and no web search was used (unlikely after pre-search), run a small pre-search and a short synthesis-only pass using `evidenceContext`.
- Timeouts and minimal caps on initial search (8 results) to control latency.

## API/Stream Contracts

- No new SSE event types. Continue using existing `deep-think-progress` and `tool-results`.
- Progress metadata keys expected by UI:
- planning: `keyPoints`, `plan`, `planStep`, `totalSteps`
- research (web): `queries`, `resultCount`, `topDomains`
- analysis: `openedUrls`
- reflection: `durationSec`, `stepsExecuted`, `toolCalls`

## Testing

- Unit: prompt mutations; sanitizer function; `performWebSearch` utility (dedupe/trim).
- Integration: Deep Think request — verify pre-search progress + tool-results arrive before first text chunk; evidenceContext injected.
- E2E: Run a Deep Think session; confirm answer body has no “thinking” phrases and timeline reflects plan → search → fetch → synthesize → recap.

## Rollback

- Feature flags: Optional env-level kill switch for web search if needed; sanitizer behind env toggle if desired.

## File Changes

- `gengar/src/agents/web-search.ts`: export `performWebSearch(query,max)` that returns trimmed results; reuse Exa code.
- `gengar/src/modules/completions/completions.service.ts`:
- Pre-search step + streaming (progress + tool-results) + evidenceContext.
- First-chunk sanitizer for Deep Think path.
- Keep existing tool-driven web search and progress enrichment.
- Remove `isWebSearchEnabled` checks.
- `gengar/src/modules/completions/prompts/get-deep-think-system-prompt.ts`:
- Add explicit “no meta in the answer” and “first sentence answers directly”.
- Retain metadata instructions for progress.
- Remove any guidance referencing `isWebSearchEnabled`.
- Frontend: remove `isWebSearchEnabled` from request payloads (where present).

### To-dos

- [x] Revamp DeepThinkProgress UI to compact header + timeline style
- [x] Raise Deep Think rounds to 10; update prompt to key points and ≤10 steps
- [x] Trim/dedupe web-search results and cap for utility