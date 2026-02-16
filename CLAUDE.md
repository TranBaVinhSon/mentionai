# CLAUDE.md - MentionAI Monorepo

This file provides guidance to Claude Code (claude.ai/code) when working with this monorepo.

## Project Overview

MentionAI is an AI-powered platform for creating digital clones from social media data. Users connect social accounts, and the platform builds personalized AI agents that can chat using the user's voice, knowledge, and personality.

## Monorepo Structure

```
mentionai/
├── gengar/              # Backend - NestJS API server
├── gengar_fe/           # Frontend - Next.js web application
├── .github/workflows/   # CI/CD for both projects
└── CLAUDE.md            # This file (monorepo-level)
```

- **Backend (`gengar/`)**: NestJS 10 + TypeORM + PostgreSQL (pgvector). Deployed to Heroku.
- **Frontend (`gengar_fe/`)**: Next.js 14 (App Router) + TypeScript + Tailwind CSS. Deployed to Vercel.

Each subdirectory has its own `CLAUDE.md` with project-specific guidance. Refer to those for detailed architecture and conventions.

## Quick Start

### Backend

```bash
cd gengar
docker-compose up gengar_db    # Start PostgreSQL with pgvector
yarn install
yarn build
yarn migration:run
yarn start:dev                 # Runs on port 3000
```

### Frontend

```bash
cd gengar_fe
yarn install
yarn dev                       # Runs on port 4000
```

## CI/CD

GitHub Actions workflows are in `.github/workflows/`:

| Workflow | Trigger | What it does |
|---|---|---|
| `backend-ci.yml` | PR/push to `main` touching `gengar/**` | Lint, build, test |
| `frontend-ci.yml` | PR/push to `main` touching `gengar_fe/**` | Lint, build |
| `deploy-backend.yml` | Push to `main` touching `gengar/**` | Deploy to Heroku + run migrations |
| `claude-code-review.yml` | PR opened/updated | Automated Claude code review |
| `claude.yml` | `@claude` mentioned in issues/PRs | Interactive Claude assistance |

### Required GitHub Secrets

- `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `HEROKU_EMAIL` - Backend deployment
- `CLAUDE_CODE_OAUTH_TOKEN` - Claude Code GitHub Actions

## Cross-Project Context

### API Communication

- Backend serves all APIs under `/internal/api/v1`
- Frontend communicates via `gengarApi` client (`gengar_fe/src/services/api.ts`) using Axios
- Authentication: Backend issues JWT tokens, frontend manages sessions via NextAuth.js

### Shared Integrations

- **Stripe**: Backend handles webhooks and subscription logic; frontend manages checkout UI
- **OAuth**: GitHub and Google OAuth flows span both projects (NextAuth on frontend, JWT validation on backend)
- **Social Media**: Backend fetches and processes social data; frontend provides connection UIs
- **AWS S3**: Both projects interact with S3 (backend for server-side uploads, frontend for presigned URLs)

### Key Environment Variables

Backend (`.env` in `gengar/`):
- Database: `GENGAR_DB_HOSTNAME`, `GENGAR_DB_PORT`, `GENGAR_DB_USERNAME`, `GENGAR_DB_PASSWORD`, `GENGAR_DB_NAME`
- AI: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`
- Auth: `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Infra: `STRIPE_SECRET_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `FRONTEND_URL`

Frontend (`.env` in `gengar_fe/`):
- Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_AUTH_SECRET`, `NEXTAUTH_SECRET`
- Payment: `STRIPE_SECRET_KEY`

## Working Across Projects

When making changes that span both frontend and backend:

1. Start with the backend API changes (new endpoints, modified DTOs)
2. Build the backend to verify (`cd gengar && yarn build`)
3. Update the frontend API client (`gengar_fe/src/services/api.ts`)
4. Add React Query hooks if needed (`gengar_fe/src/hooks/`)
5. Implement UI changes in components

## General Rules

- **NEVER** commit `.env` files - use `.env.example` for reference
- **ALWAYS** run lint before committing: `yarn lint` in the respective directory
- **PRESERVE** existing code style in each project - they have different conventions
- Backend uses single quotes; follow existing patterns in each file
- Frontend maximum file size: 500 lines - split into smaller components if exceeded
