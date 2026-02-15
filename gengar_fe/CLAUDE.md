# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `yarn dev` - Start development server on port 4000
- `yarn dev:https` - Start development server with HTTPS on port 4001 (proxies to 4002)
- `yarn build` - Build production application
- `yarn start` - Start production server
- `yarn lint` - Run ESLint for code quality checks
- `yarn analyze` - Analyze bundle size with @next/bundle-analyzer

### Installation

- `yarn install` - Install all dependencies
- `yarn add [package]` - Add new dependency
- `yarn add -D [package]` - Add new dev dependency

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, React 18
- **UI**: Tailwind CSS with Radix UI components, custom theme system
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query) with Axios
- **Authentication**: NextAuth.js with GitHub/Google OAuth
- **Rich Text**: TipTap editor with mentions and autocomplete
- **Analytics**: PostHog, Vercel Analytics, Google Analytics
- **Payments**: Stripe integration

### Project Structure

#### Core Application (`src/app/`)

- `(main)/` - Main application routes (chat, apps, community, etc.)
- `(tools)/` - Standalone tools (LLM comparison, price prediction)
- `api/` - API routes for authentication and backend proxy

#### Key Directories

- `src/components/` - Reusable React components
  - `chat/` - Chat interface and message handling
  - `ui/` - Shadcn/ui component library
  - `shared/` - Cross-feature shared components
- `src/hooks/` - Custom React hooks
- `src/store/` - Zustand state stores (chat, app, model, subscription)
- `src/services/` - API clients and external service integrations
- `src/lib/` - Core utilities (auth, payments, utils)

## Coding Conventions

### Core Principles

#### 1. Component Usage Priority

**ALWAYS use shadcn/ui components first**:

- Check `src/components/ui/` before creating custom components
- Available components: Button, Input, Badge, Card, Dialog, Form, etc.
- Use shadcn variants and modify via className when needed
- Only create custom components when shadcn doesn't provide the functionality

#### 2. File Size and Component Structure

- **Maximum file size: 500 lines**
- When exceeding 500 lines, split into smaller components:
  ```
  feature/
  ├── index.tsx           # Exports
  ├── feature-main.tsx    # Main component
  ├── components/         # Sub-components
  │   ├── feature-header.tsx
  │   ├── feature-content.tsx
  │   └── feature-footer.tsx
  └── hooks/             # Feature-specific hooks
      └── use-feature.ts
  ```

### Color System

#### Always Use Theme Variables

```tsx
// ❌ Don't use hardcoded colors
"bg-blue-500";
"text-gray-600";

// ✅ Use theme variables
"bg-primary";
"text-muted-foreground";
"bg-background";
"border-border";
```

#### Color Token Standards

```tsx
// Primary colors
"bg-primary"; // Main actions
"hover:bg-primary/90"; // Hover states
"bg-primary/10"; // Subtle backgrounds

// Text colors
"text-foreground"; // Default text
"text-muted-foreground"; // Secondary text
"text-destructive"; // Error text

// Borders and rings
"border-border"; // Default border
"ring-ring"; // Focus ring
"border-input"; // Form input border

// Opacity modifiers
"bg-primary/10"; // Very subtle
"bg-primary/20"; // Subtle
"bg-primary/50"; // Medium
"bg-primary/80"; // High emphasis
```

### Component Patterns

#### Buttons

```tsx
// Primary Button
<Button className="w-full">Content</Button>

// Secondary Button
<Button variant="secondary" size="sm">Content</Button>

// Ghost Button
<Button variant="ghost" size="sm">Content</Button>
```

#### Cards

```tsx
<div className="relative overflow-hidden bg-background rounded-xl border shadow-sm hover:border-primary/50 transition-colors">
  {/* Content */}
</div>
```

#### Badges

```tsx
// Standard Badge
<Badge variant="outline" className="text-muted-foreground hover:bg-accent transition-colors" />

// Gradient Badge (for special cases)
<Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-full font-medium" />
```

#### Forms

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Typography Standards

```tsx
// Headings
<h1 className="text-2xl md:text-3xl font-bold">
<h2 className="text-xl md:text-2xl font-medium">
<h3 className="text-sm font-medium text-muted-foreground">

// Body Text
<p className="text-sm text-muted-foreground">
<span className="text-xs text-muted-foreground">
```

### Icon System

#### Icon Package Priority

1. `lucide-react` - Primary icon library for all UI elements
2. `hugeicons-react` - Secondary option when lucide-react doesn't have the needed icon
3. `@radix-ui/react-icons` - For shadcn/ui components (when specifically required)
4. `src/components/icons/` - For custom brand icons

#### Standard Icon Sizes

```tsx
"size-3"; // 12px - Tiny icons
"size-4"; // 16px - Default size
"size-5"; // 20px - Medium icons
"size-6"; // 24px - Large icons
```

#### Icon Coloring

```tsx
// ❌ Don't add color classes to lucide-react or hugeicons-react icons
<LucideIcon className="text-primary" />        // Don't do this
<HugeIcon className="text-muted-foreground" />  // Don't do this

// ✅ Use icons without color classes - they inherit from parent
<LucideIcon className="size-4" />              // Correct - no color
<HugeIcon className="size-4" />                // Correct - no color

// ✅ Only add colors to custom brand icons when necessary
<CustomBrandIcon className="text-primary" />   // Only for custom icons
```

#### Icon Usage

```tsx
// With proper accessibility
<Button variant="ghost" size="icon">
  <Icon className="size-4" />
  <span className="sr-only">Action name</span>
</Button>

// With text
<Button>
  <Icon className="mr-2 size-4" />
  <span>Label</span>
</Button>
```

### Layout Standards

#### Responsive Design (Mobile First)

```tsx
// Typography
"text-sm md:text-base lg:text-lg";

// Layout
"grid-cols-1 md:grid-cols-2";
"hidden md:block";

// Spacing
"space-y-2 space-y-3 space-y-4"; // Vertical
"space-x-2 space-x-3 space-x-4"; // Horizontal
"p-4 p-6 px-4 py-5"; // Padding
```

#### Container Patterns

```tsx
// Main container
<div className="flex flex-col items-center w-full flex-grow max-w-3xl">

// Grid layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
```

### Accessibility Requirements

#### ARIA Labels

```tsx
// Screen reader only content
<span className="sr-only">Description</span>

// Interactive elements
<button aria-label="Close dialog">
  <Icon />
</button>

// Form fields
<input aria-describedby="error-message" />
```

#### Focus Management

```tsx
// Focus rings
"focus:ring-2 focus:ring-ring focus:ring-offset-2";

// Focus visible
"focus-visible:ring-2 focus-visible:ring-ring";
```

### Best Practices

#### 1. Naming Conventions

- **Components**: PascalCase (`UserProfile`)
- **Functions/Variables**: camelCase (`getUserData`)
- **Files**: kebab-case (`user-profile.tsx`)
- **Constants**: UPPER_CASE (`API_BASE_URL`)

#### 2. Import Order

```tsx
// 1. React and Next.js
import React from "react";
import { useRouter } from "next/navigation";

// 2. External libraries
import { Button } from "@/components/ui/button";

// 3. Internal components
import { UserCard } from "./user-card";

// 4. Hooks and utilities
import { useAuth } from "@/hooks/use-auth";

// 5. Types
import type { User } from "@/types";
```

#### 3. Component Props Interface

```tsx
interface ComponentProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "default" | "secondary";
  size?: "sm" | "md" | "lg";
}
```

#### 4. Error Handling

```tsx
// Error states
"text-destructive";
"border-destructive";

// Loading states
"animate-spin text-muted-foreground";
"animate-pulse bg-primary/10";
```

#### 5. Transitions

```tsx
// Standard transitions
"transition-colors duration-200";
"hover:bg-accent transition-colors";
```

### State Management Patterns

#### Hooks Pattern

```tsx
export function useFeature() {
  const [state, setState] = useState();

  useEffect(() => {
    // Side effects
  }, [dependencies]);

  return { state, actions };
}
```

#### Zustand Store Pattern

```tsx
export const useStore = create<StoreState>((set) => ({
  state: initialState,
  actions: {
    updateState: (newState) => set({ state: newState }),
  },
}));
```

### Data Fetching Standards

#### Always Use React Query for External API Calls

**CRITICAL**: All external API communication must use TanStack Query (React Query), never direct fetch/axios calls in components.

```tsx
// ❌ Don't use direct API calls in components
const [data, setData] = useState();
useEffect(() => {
  fetch("/api/users").then(setData);
}, []);

// ✅ Use React Query for all external communication
const { data, isLoading, error } = useQuery({
  queryKey: ["users"],
  queryFn: () => gengarApi.getUsers(),
});
```

#### Query Key Conventions

```tsx
// Use descriptive, hierarchical query keys
["users"][("users", userId)][("users", userId, "posts")][ // All users // Specific user // User's posts
  ("conversations", { page, limit })
]; // Paginated conversations
```

#### Mutation Patterns

```tsx
const mutation = useMutation({
  mutationFn: (userData) => gengarApi.createUser(userData),
  onSuccess: () => {
    // Invalidate and refetch
    queryClient.invalidateQueries({ queryKey: ["users"] });
  },
  onError: (error) => {
    // Handle errors consistently
    toast.error(error.message);
  },
});
```

#### Loading and Error States

```tsx
if (isLoading)
  return <div className="animate-pulse bg-primary/10">Loading...</div>;
if (error)
  return <div className="text-destructive">Error: {error.message}</div>;
```

#### Query Client Setup

- Use the existing query client from `src/components/query-client/`
- Leverage automatic retries and caching
- Set appropriate stale times based on data sensitivity

### Performance Considerations

1. **Lazy Loading**: Use `React.lazy()` for large components
2. **Memoization**: Use `React.memo()` and `useMemo()` appropriately
3. **Bundle Size**: Import only needed parts from libraries
4. **Image Optimization**: Use Next.js Image component with proper sizing

### Authentication & Authorization

- NextAuth.js configuration in `src/lib/auth.ts`
- GitHub and Google OAuth providers
- JWT strategy with 90-day sessions
- Route protection with authorized callback
- Backend API token management through custom login endpoint

### API Integration

- Primary API client in `src/services/api.ts`
- Backend communication via `gengarApi` class
- Auto-generated TypeScript schemas from OpenAPI
- Token management integrated with NextAuth session

### State Management

- Chat state: anonymous mode, AI editing, web search, debate mode
- Model selection and settings
- App resources and subscription state
- Persisted to localStorage via Zustand middleware

### UI Components

- Custom theme system with light/dark mode support
- Tailwind CSS with extensive custom color tokens
- Radix UI primitives for accessibility
- Custom components in `src/components/ui/`

### OAuth Integrations

Reddit OAuth is implemented for social data collection:

- OAuth flow in `src/app/(main)/apps/connect/page.tsx`
- Reddit URL builder in `src/lib/utils.ts`
- Required scopes: identity, history, read, submit
- Environment variable: `NEXT_PUBLIC_REDDIT_CLIENT_ID`

### Content & Features

- Multi-model AI chat interface with memory sources
- Digital clone creation and management
- Social platform integrations (Reddit, LinkedIn, Medium, Goodreads)
- Subscription management with Stripe
- Analytics dashboard and conversation tracking
- Rich text editing with mentions and autocomplete
- Shared conversation functionality

### Environment Setup

Development server runs on port 4000. For HTTPS development, use `yarn dev:https` which proxies port 4001 to 4002.

Required environment variables include OAuth client secrets, Stripe keys, and backend API configuration.

### Important Files and Locations

- **API Client**: `src/services/api.ts` - Main backend API integration using Axios
- **Auth Configuration**: `src/lib/auth.ts` - NextAuth.js setup
- **Theme Configuration**: `src/theming/theme.ts` - Custom color tokens and theme system
- **Zustand Stores**: `src/store/` - Application state management
- **Type Definitions**: `src/lib/types.ts` - Core TypeScript interfaces
- **Environment Types**: `env.d.ts` - Environment variable type definitions

### Common Patterns for API Integration

When adding new API endpoints:

1. Add the endpoint method to `src/services/api.ts` in the `GengarApi` class
2. Use the method in components via React Query hooks
3. Handle loading/error states consistently
4. Invalidate related queries on mutations

Example:
```tsx
// In api.ts
async getAppDetails(appId: string) {
  const response = await this.client.get(`/apps/${appId}`);
  return response.data;
}

// In component
const { data, isLoading } = useQuery({
  queryKey: ['app', appId],
  queryFn: () => gengarApi.getAppDetails(appId),
});
```
