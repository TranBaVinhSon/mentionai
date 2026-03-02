# MentionAI Frontend

This is the frontend application for MentionAI, built with Next.js 14, TypeScript, and Tailwind CSS.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## OAuth Integrations

### Reddit OAuth Setup

The Reddit OAuth integration allows users to connect their Reddit accounts to pull comments and posts for AI training. Here's what's implemented:

#### Frontend Components:

1. **OAuth URL Builder** (`src/lib/utils.ts`):

   - `buildRedditUrl()` function creates the Reddit OAuth authorization URL
   - Includes required scopes: `identity`, `history`, `read`, `submit`
   - Redirects to `/apps/connect?platform=reddit`

2. **Connection UI** (`src/app/(main)/apps/new/page.tsx`):

   - Reddit connection button with orange Reddit branding
   - State management for connection status
   - OAuth popup handling and redirect detection

3. **OAuth Callback Handler** (`src/app/(main)/apps/connect/page.tsx`):

   - Handles Reddit OAuth callbacks
   - Validates state parameter for security
   - Sends success message back to parent window

4. **Memory Sources** (`src/components/chat/memory-source.tsx`):
   - Displays Reddit content in chat memory sources
   - Shows Reddit icon and timestamp formatting

#### Environment Variables Needed:

```bash
NEXT_PUBLIC_REDDIT_CLIENT_ID=your_reddit_client_id_here
```

#### Reddit App Configuration:

- **Redirect URI**: `https://yourdomain.com/apps/connect?platform=reddit` (production)
- **Redirect URI**: `http://localhost:4000/apps/connect?platform=reddit` (development)
- **Required Scopes**:
  - `identity` - Basic user info and username
  - `history` - Access to user's post and comment history
  - `read` - Read posts and comments
  - `submit` - Submit content (for future posting features)

#### How it Works:

1. User clicks "Connect Reddit" button
2. Popup opens to Reddit OAuth authorization
3. User grants permissions on Reddit
4. Reddit redirects to `/apps/connect?platform=reddit` with auth code
5. Frontend validates the response and stores credentials
6. Backend (not implemented yet) will use the code to fetch user's Reddit data

The frontend is fully ready for Reddit OAuth integration. The backend needs to:

1. Create Reddit OAuth app credentials
2. Implement token exchange endpoint
3. Build Reddit data fetching service
4. Store Reddit content in the database
