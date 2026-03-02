# CLAUDE.md - Frontend (gengar_fe)

This file provides guidance to Claude Code (claude.ai/code) when working with the frontend.

## Essential Commands

```bash
yarn install                    # Install dependencies
yarn dev                        # Dev server on port 4000
yarn dev:https                  # Dev server with HTTPS
yarn build                      # Production build
yarn start                      # Start production server
yarn lint                       # ESLint check
yarn analyze                    # Bundle size analysis (ANALYZE=true)
```

## Architecture Overview

### Tech Stack

- **Next.js 14**: App Router, TypeScript, React 18
- **Tailwind CSS**: Custom theme with Radix UI primitives
- **Shadcn/ui**: Component library (45+ components in `src/components/ui/`)
- **Zustand**: State management with persistence (6 stores)
- **TanStack Query**: Data fetching and caching via Axios
- **NextAuth.js**: Authentication (GitHub + Google OAuth)
- **TipTap**: Rich text editor with mentions and autocomplete
- **Stripe**: Payment integration
- **PostHog + Vercel Analytics**: Analytics

### Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── (auth)/signin/           # Sign-in page
│   ├── (main)/                  # Main app routes
│   │   ├── (chat)/              # Chat interface (home page)
│   │   ├── [username]/          # Public user profiles
│   │   ├── apps/                # App management (CRUD, connect, dashboard)
│   │   ├── c/[id]/              # Individual conversations
│   │   ├── shared/c/[id]/       # Shared conversation views
│   │   ├── u/[name]/            # User profiles by name
│   │   ├── community/           # Community page
│   │   ├── explore/             # Explore apps/models
│   │   ├── features/            # Features page
│   │   ├── models/              # Available models
│   │   ├── onboarding/          # Onboarding flow
│   │   └── pricing/             # Pricing page
│   ├── (tools)/tools/           # Standalone tools
│   │   ├── llm-comparison/      # LLM comparison tool
│   │   └── llm-price-prediction/# Price prediction tool
│   ├── actions/                 # Server actions
│   │   ├── generate-text.ts
│   │   ├── enhance-prompt.ts
│   │   ├── ask-followup-question.ts
│   │   └── s3-actions.ts
│   ├── api/                     # API routes
│   │   ├── auth/[...nextauth]/  # NextAuth handler
│   │   ├── auth/callback/github/# GitHub OAuth callback
│   │   ├── autocomplete/        # Autocomplete (GPT-4.1-mini)
│   │   └── og/                  # OG image generation
│   ├── layout.tsx               # Root layout
│   └── providers.tsx            # React Query, Theme, Session providers
├── components/
│   ├── ui/                      # Shadcn/ui library (45+ components)
│   ├── chat/                    # Chat interface components
│   ├── chat-editor/             # TipTap rich text editor + mentions
│   ├── layout/                  # Header, sidebar, history, search
│   ├── app-creation/            # App creation form sections
│   ├── analytics/               # Analytics dashboard components
│   ├── shared/                  # Cross-feature components
│   ├── home/                    # Home page components
│   ├── landing/                 # Landing page components
│   ├── onboarding/              # Onboarding flow
│   ├── payment/                 # Stripe checkout
│   ├── icons/                   # Brand SVG icons
│   └── sign-in/                 # Sign-in UI
├── hooks/                       # 21 custom hooks
│   ├── use-chat.tsx             # Core chat hook (AI SDK based)
│   ├── use-user.ts              # User profile fetching
│   ├── use-official-apps.ts     # Official + personal apps
│   ├── use-user-apps.ts         # User's personal apps
│   ├── use-published-digital-clones.ts
│   ├── use-digital-clone.ts     # Single app/clone
│   ├── use-dashboard-data.ts    # Analytics data
│   ├── use-app-resources.ts     # Social content
│   ├── use-suggested-questions.ts
│   ├── use-generate-suggested-questions.ts
│   ├── use-models.ts            # AI models
│   ├── use-google-one-tap.ts    # Google sign-in
│   ├── use-at-bottom.tsx        # Scroll detection
│   ├── use-auto-scroll.ts       # Auto-scroll
│   ├── use-copy.ts              # Clipboard
│   ├── use-toast.ts             # Toast notifications
│   ├── use-mobile.tsx           # Mobile detection
│   ├── use-screen.ts            # Screen size
│   ├── use-latest.ts            # Latest ref value
│   └── useDebounce.ts           # Debounce
├── store/                       # Zustand stores
│   ├── app.tsx                  # UI state (dialogs, sidebar)
│   ├── chat.tsx                 # Chat settings (anonymous, debate, deep think)
│   ├── model.tsx                # Model cache (1-hour TTL)
│   ├── subscription-state.tsx   # Subscription plan data
│   ├── campaign.ts              # Campaign state
│   └── connected-sources.ts     # Social source management (sessionStorage)
├── services/
│   └── api.ts                   # GengarApi class - main backend client
├── lib/
│   ├── auth.ts                  # NextAuth.js configuration
│   ├── utils.ts                 # cn(), URL helpers, model lists
│   ├── posthog.ts               # PostHog analytics init
│   └── payment.ts               # Payment utilities
├── theming/                     # Theme configuration + providers
├── constants/                   # Application constants
├── utils/                       # Utility functions
└── @types/                      # TypeScript type definitions
```

### Key Files

- **API Client**: `src/services/api.ts` - All backend communication via `gengarApi` singleton
- **Auth Config**: `src/lib/auth.ts` - NextAuth.js with GitHub/Google, 90-day JWT sessions
- **Root Middleware**: `middleware.ts` - Route protection, `/@username` rewrites
- **Theme**: `src/theming/theme.ts` - Custom color tokens
- **Types**: `src/lib/types.ts` - Core TypeScript interfaces

### Authentication Flow

1. User signs in via GitHub or Google (NextAuth.js)
2. JWT token created with 90-day expiry
3. `gengarApi` attaches token via Axios interceptor
4. Backend validates JWT on each request

### Public Routes (no auth required)

`/`, `/pricing`, `/features`, `/explore`, `/community`, `/models`, `/signin`, `/shared/c/*`, `/tools/*`, `/@username`, `/commerce-disclosure`, `/terms-of-service`, `/privacy`

### Data Flow

1. `gengarApi` (Axios) calls backend `/internal/api/v1/*`
2. React Query caches responses with configurable stale times
3. Zustand stores manage client-side UI state
4. Components consume data via hooks (`use-*.ts`)

## Coding Conventions

### Component Usage Priority

**ALWAYS use shadcn/ui components first** - check `src/components/ui/` before creating custom ones.

### File Size Limit

**Maximum 500 lines per file.** When exceeded, split:

```
feature/
├── index.tsx
├── feature-main.tsx
├── components/
│   ├── feature-header.tsx
│   └── feature-content.tsx
└── hooks/
    └── use-feature.ts
```

### Color System

Always use theme variables, never hardcoded colors:

```tsx
// Use these
"bg-primary"  "text-muted-foreground"  "bg-background"  "border-border"

// Never these
"bg-blue-500"  "text-gray-600"
```

### Icons

1. `lucide-react` - Primary (never add color classes to these)
2. `hugeicons-react` - Secondary
3. `@radix-ui/react-icons` - For shadcn components
4. `src/components/icons/` - Custom brand icons

Standard sizes: `size-3` (12px), `size-4` (16px), `size-5` (20px), `size-6` (24px)

### Data Fetching

**CRITICAL**: All API calls must use TanStack Query, never direct fetch/axios in components.

```tsx
// Always this pattern
const { data, isLoading } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => gengarApi.getResource(id),
});

// Mutations
const mutation = useMutation({
  mutationFn: (body) => gengarApi.createResource(body),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resource'] }),
});
```

### Naming Conventions

- **Components**: PascalCase (`UserProfile`)
- **Functions/Variables**: camelCase (`getUserData`)
- **Files**: kebab-case (`user-profile.tsx`)
- **Constants**: UPPER_CASE (`API_BASE_URL`)

### Import Order

```tsx
// 1. React and Next.js
import React from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { Button } from '@/components/ui/button';

// 3. Internal components
import { UserCard } from './user-card';

// 4. Hooks and utilities
import { useAuth } from '@/hooks/use-auth';

// 5. Types
import type { User } from '@/types';
```

### Adding New API Endpoints

1. Add method to `src/services/api.ts` in the `GengarApi` class
2. Create a React Query hook in `src/hooks/`
3. Use the hook in components
4. Invalidate related queries on mutations

### Adding New Pages

1. Create route in `src/app/(main)/` or `src/app/(tools)/`
2. If public, add path to `middleware.ts` public routes
3. If it needs data, create hooks in `src/hooks/`
4. Use existing layout components from `src/components/layout/`

### Responsive Design

Mobile-first approach:

```tsx
"text-sm md:text-base lg:text-lg"
"grid-cols-1 md:grid-cols-2"
"hidden md:block"
```

### State Management

- **Server state**: TanStack Query (API data)
- **Client state**: Zustand stores (UI state, chat settings)
- **Form state**: react-hook-form with zod validation
- **URL state**: Next.js searchParams for shareable state
