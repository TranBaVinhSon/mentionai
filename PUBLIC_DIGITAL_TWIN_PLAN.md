## Public Digital Twin UI Plan (Phased)

This doc tracks the rollout of the public digital twin page UI improvements.

### Product requirements

- Public page has **3 tabs**: **About | Timeline | Graph**.
- Connected sources (LinkedIn, GitHub, Twitter/X, etc.) are shown in the **header**.
- **Chat input is always available** and floats at the bottom.

---

## Phase 1 — About (ship first)

### Scope

- Implement the tab shell (**About | Timeline | Graph**) with **Timeline/Graph placeholders**.
- Move connected sources into the header.
- Add an **About** tab that displays a citation-backed markdown profile.
- Add backend support to **store generated About markdown** in DB and serve it to the public page.

### Backend (gengar)

#### Storage

- Add `apps.about` column as **TEXT (markdown)**.
  - This is intentionally separate from `apps.description` and does **not** change the existing description/instruction.

#### Generation

- Add a **manual CLI command** to generate About and store it to DB:

```bash
# from gengar/
yarn about:generate --app <publishedAppName|uniqueId> [--force]
```

- The generator should:
  - Use connected sources (social usernames) + appLinks + app.name/displayName/description as context.
  - Use **Exa** web search to fetch short summaries/snippets.
  - Use an LLM to write **markdown** with:
    - Summary bullets
    - Work / Projects / Writing / Education / Hobbies (only include sections with evidence)
    - A **Sources** section with citations (markdown links)
  - Be conservative (avoid over-claiming; prefer evidence-bounded language).

#### API

- Ensure public app responses include `about`.
  - Easiest path: include `about` in `GET /apps/public/:name` response (the published app endpoint already used by FE).
  - Optional later: add `GET /apps/public/:name/about` if you want a smaller payload.

### Frontend (gengar_fe)

- Update `gengar_fe/src/components/shared/personal-ai-screen.tsx` (public view):
  - Header: show avatar/name/@username + connected source icons/handles.
  - Tabs: About renders `app.about` markdown; Timeline/Graph show “Coming soon”.
  - Keep the existing resize-observer padding so tab content isn’t covered by the floating chat input.

### Files (Phase 1)

- Backend
  - `gengar/src/db/entities/app.entity.ts` (add `about`)
  - `gengar/src/db/migrations/*_add_about_to_apps.ts`
  - `gengar/src/modules/apps/apps.service.ts` (generation helper + expose about)
  - `gengar/src/modules/apps/apps.controller.ts` (if adding dedicated endpoint)
  - `gengar/src/console/*` or `gengar/src/cli/*` (CLI entry)
  - `gengar/package.json` (script `about:generate`)
- Frontend
  - `gengar_fe/src/services/api.ts` (extend `App` type with `about?: string | null`)
  - `gengar_fe/src/components/shared/personal-ai-screen.tsx` (tabs + header sources + About markdown)

---

## Phase 2 — Timeline

### Scope

- Implement Timeline tab: aggregated feed of all synced social content, filterable, sorted by time.

### Backend

- Update public social-content endpoint to safely return **full** content for published “me” apps:
  - Stop truncating content.
  - Strip internal-only fields (embeddings, internal ids).
  - Hard-block sensitive sources (e.g. Gmail) from public endpoint.

### Frontend

- Fetch per source and merge/sort.
- Extract a reusable content renderer from `SourceDetailsSheet` and reuse it for Timeline.

---

## Phase 3 — Graph

### Scope

- Build an interactive knowledge graph from About + Timeline entities.
- Click node → show related timeline items.

### Frontend

- Introduce a graph UI library (e.g. React Flow) and build node/edge mapping.


