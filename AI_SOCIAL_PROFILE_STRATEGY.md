# MentionAI: AI Social Profile Strategy

> Internal strategy document — February 2024

---

## Executive Summary

MentionAI builds AI-powered digital clones from users' social media data. Users connect accounts, and the platform creates personalized AI agents that chat in the user's voice, drawing on their knowledge and personality. This document analyzes the current product, identifies strategic opportunities, and proposes a roadmap for growth.

---

## 1. Current Product Overview

### What MentionAI Does Today

- **Digital Clone Creation**: Users sign in (GitHub/Google), connect social accounts, add content links, and the platform builds a personalized AI agent.
- **Chat Interface**: Visitors can converse with any published clone at `/@username`. The clone responds using the creator's knowledge, tone, and personality.
- **Public Profile Page**: Each clone gets a shareable profile page showing connected sources, web links, suggested questions, and a floating chat input.
- **Multi-Model AI Backend**: Supports Anthropic, OpenAI, Google, DeepSeek, and OpenRouter models across three tiers.

### Supported Social Platforms (14)

| Platform | Connection Type |
|----------|----------------|
| Twitter/X, LinkedIn, GitHub, Google/Gmail, Facebook, Instagram | OAuth2 |
| Reddit, Medium, Goodreads, ProductHunt, Substack | Username + fetch |
| YouTube, TikTok, Threads | Direct/OAuth |

### Current Subscription Tiers

| | Free | Plus ($15/mo) | Pro ($40/mo, coming) |
|---|---|---|---|
| Social connections | 1 | Unlimited | Unlimited |
| Content links | 1 | Unlimited | Unlimited |
| AI model access | Tier 1 only | Tiers 1–3 | Tiers 1–3 |
| Analytics | No | Yes | Yes |
| Web search | No | Yes | Yes |
| Digital minds | 1 | 1 | Up to 2 |
| Custom domain | No | No | Yes |

---

## 2. Strategic Analysis

### Strengths

1. **Deep data ingestion**: 14 social platforms with structured extraction and vector embedding.
2. **Multi-model flexibility**: Users aren't locked into a single AI provider; model routing across tiers.
3. **Clean architecture**: Modular NestJS backend with well-separated concerns (20+ modules).
4. **Streaming AI responses**: Real-time chat experience with tool support (web search, image gen, content retrieval).
5. **Freemium foundation**: Functional free tier drives top-of-funnel acquisition.

### Weaknesses

1. **"Digital clone" framing**: The term can feel uncanny or niche. Broader "AI profile" positioning may resonate with more users.
2. **Free tier too restrictive**: 1 social connection + 1 link makes the free product feel like a demo, reducing viral potential.
3. **Profile page is chat-centric**: The `/@username` page focuses on chat but lacks the rich, browsable content that drives organic traffic and sharing.
4. **No multi-profile conversations**: Users can't have clones interact with each other (debate mode exists but is limited).
5. **Limited content discovery**: The `/explore` page exists but isn't optimized for search, filtering, or recommendations.

### Opportunities

1. **Rebrand as "AI Social Profile"**: Position the product as "your AI-powered online identity" rather than a "clone." This broadens appeal.
2. **Expand the free tier**: More social connections and links in the free tier → more data → better clone quality → higher conversion to Plus.
3. **Rich profile pages**: Add timeline (aggregated social feed), about section (citation-backed bio), and knowledge graph visualization.
4. **Creator economy integration**: Let Plus/Pro users monetize their clones (paid chat, gated content, tips).
5. **API/embed access**: Let users embed their AI clone on external sites (personal blogs, portfolios).

### Threats

1. **Platform API restrictions**: Social platforms may limit or revoke API access.
2. **AI commoditization**: As AI chat becomes table-stakes, differentiation must come from data quality and UX.
3. **Privacy concerns**: Users may hesitate to connect all social accounts to a third-party service.
4. **Competitor convergence**: Products like Character.AI, Delphi, and personal AI assistants are approaching the same space.

---

## 3. Proposed Strategy: Three Pillars

### Pillar 1 — Richer Profiles (Make the page worth visiting)

The `/@username` page should be valuable even without starting a chat. This drives organic traffic, SEO, and sharing.

**Phase 1: About Tab** (already planned in `PUBLIC_DIGITAL_TWIN_PLAN.md`)
- Auto-generated, citation-backed markdown profile summary
- Sources include all connected platforms
- Updates when new content is synced

**Phase 2: Timeline Tab**
- Aggregated feed of all synced social content (posts, repos, articles, books)
- Chronological or by-platform filtering
- Each item links back to the original source

**Phase 3: Knowledge Graph Tab**
- Interactive visualization of topics, connections, and expertise areas
- Derived from vector embeddings and content analysis
- Serves as a visual "map" of the person's knowledge

**Technical Impact**: Primarily frontend work in `gengar_fe/src/app/[name]/` with new API endpoints in `gengar/src/modules/apps/` for aggregated content retrieval.

### Pillar 2 — Smarter Free Tier (Drive viral growth)

The current free tier (1 social + 1 link) produces low-quality clones that don't impress users enough to share or upgrade.

**Proposed Free Tier Changes:**

| Feature | Current Free | Proposed Free |
|---------|-------------|---------------|
| Social connections | 1 | 3 |
| Content links | 1 | 5 |
| AI models | Tier 1 only | Tier 1 + limited Tier 2 (10/mo) |
| Profile page | Basic | Full (about + timeline) |
| Analytics | None | Basic (view count, chat count) |

**Rationale**: More data in → better clone → more impressive demo → more sharing → more signups. The upgrade trigger shifts from "unlock basic functionality" to "unlock power features" (unlimited models, web search, image gen, advanced analytics).

**Technical Impact**: Subscription checks in `gengar/src/modules/stripe/` and feature gating in `gengar_fe/src/constants/pricing.tsx`. Guard logic in `AppsService` and middleware.

### Pillar 3 — Creator Monetization (Give Plus/Pro users a business reason)

**Phase 1: Profile Analytics Dashboard**
- Already partially built for Plus users
- Expand with: visitor demographics, popular questions, engagement trends

**Phase 2: Gated Conversations**
- Pro users can set their clone to "paid chat" mode
- Visitors pay per conversation or subscribe
- Revenue split: 80% creator / 20% MentionAI

**Phase 3: Embeddable Clone Widget**
- JavaScript embed code for external sites
- Customizable appearance (colors, position, avatar)
- Links back to full `/@username` profile

**Technical Impact**: New Stripe Connect integration for creator payouts, embed API endpoints, widget frontend bundle.

---

## 4. Technical Roadmap

### Quarter 1: Foundation

| Priority | Task | Area | Key Files |
|----------|------|------|-----------|
| P0 | Implement About tab on profile page | Frontend + Backend | `gengar_fe/src/app/[name]/`, `gengar/src/modules/apps/` |
| P0 | Expand free tier limits (3 social, 5 links) | Backend | `gengar/src/modules/stripe/`, `gengar/src/modules/apps/apps.service.ts` |
| P1 | Add basic analytics to free tier | Backend + Frontend | `gengar/src/modules/apps/`, `gengar_fe/src/app/apps/[uniqueId]/dashboard/` |
| P1 | Improve `/explore` page with search and filters | Frontend | `gengar_fe/src/app/explore/` |
| P2 | Rebrand "digital clone" → "AI profile" across UI copy | Frontend | Multiple component files |

### Quarter 2: Growth

| Priority | Task | Area | Key Files |
|----------|------|------|-----------|
| P0 | Implement Timeline tab on profile page | Frontend + Backend | `gengar_fe/src/app/[name]/`, `gengar/src/modules/social-content/` |
| P0 | SEO optimization for profile pages | Frontend | `gengar_fe/src/app/[name]/layout.tsx` |
| P1 | Embeddable chat widget (MVP) | Frontend + Backend | New module |
| P1 | Referral system | Backend + Frontend | New module |
| P2 | Knowledge Graph tab (prototype) | Frontend | `gengar_fe/src/app/[name]/` |

### Quarter 3: Monetization

| Priority | Task | Area | Key Files |
|----------|------|------|-----------|
| P0 | Stripe Connect for creator payouts | Backend | `gengar/src/modules/stripe/` |
| P0 | Gated conversation flow | Backend + Frontend | `gengar/src/modules/completions/`, `gengar_fe/src/components/chat/` |
| P1 | Pro plan launch with multi-mind support | Backend + Frontend | `gengar/src/modules/apps/`, pricing constants |
| P1 | Advanced analytics dashboard | Frontend | `gengar_fe/src/app/apps/[uniqueId]/dashboard/` |
| P2 | Custom domain support for Pro users | Infrastructure | DNS, routing config |

---

## 5. Key Metrics to Track

| Category | Metric | Target |
|----------|--------|--------|
| Acquisition | Weekly signups | 2x current baseline |
| Activation | % who connect ≥2 social accounts | >60% |
| Engagement | Weekly active conversations (across all clones) | 3x current |
| Retention | 30-day retention of free users | >40% |
| Revenue | Free → Plus conversion rate | >8% |
| Virality | Profile page shares per user per month | >2 |

---

## 6. Competitive Positioning

**Current landscape:**

| Product | Positioning | Differentiator |
|---------|------------|----------------|
| Character.AI | Fictional character chat | Entertainment-first |
| Delphi | Clone yourself | Expert/creator focus |
| Personal.ai | Personal AI memory | Private knowledge base |
| **MentionAI** | AI social profile | Multi-platform identity + public profile |

**MentionAI's moat**: The combination of (1) deep multi-platform data ingestion, (2) public-facing profile pages that drive organic discovery, and (3) a freemium model that improves with more connected data. No competitor offers all three.

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Social platform API revocation | High | Diversify data sources; support manual content upload; cache fetched data |
| Privacy backlash | Medium | Transparent data usage policy; granular permissions; easy data deletion |
| AI model cost increases | Medium | Multi-provider strategy already in place; negotiate volume pricing |
| Low free-tier conversion | Medium | A/B test free tier limits; optimize upgrade prompts; ensure free product is genuinely useful |
| Creator monetization complexity | Low | Start simple (paid chat only); expand based on demand |

---

## 8. Immediate Next Steps

1. **Validate free tier expansion** — Run numbers on current infrastructure cost per free user to ensure 3 social + 5 links is sustainable.
2. **Ship About tab** — Already planned; prioritize as first visible improvement to profile pages.
3. **Update marketing copy** — Begin shifting from "digital clone" to "AI profile" language in user-facing text.
4. **Instrument analytics** — Ensure profile page views, chat starts, and source clicks are tracked for data-driven decisions.
5. **User interviews** — Talk to 10 active Plus users about what they'd pay for (monetization, embeds, custom domains).

---

*This document should be reviewed quarterly and updated as the product evolves.*
