# CLAUDE.md - Backend (gengar)

This file provides guidance to Claude Code (claude.ai/code) when working with the backend.

## Essential Commands

```bash
# Development setup
docker-compose up gengar_db       # Start PostgreSQL with pgvector
yarn install                      # Install dependencies
yarn build                        # Build (required before migrations)
yarn migration:run                # Run pending migrations
yarn start:dev                    # Start with hot reload (port 3000)

# Build & lint
yarn build                        # Production build
yarn lint                         # ESLint check + fix
yarn format                       # Prettier formatting

# Tests
yarn test                         # Run unit tests
yarn test:watch                   # Watch mode
yarn test:cov                     # Coverage report
yarn test:e2e                     # End-to-end tests (uses test/jest-e2e.json)

# Database
yarn migration:create             # Create new migration
yarn migration:run                # Run pending migrations
yarn migration:revert             # Revert last migration
yarn seed:run                     # Run database seeders

# CLI commands (data operations)
yarn command:run generate-metadata
yarn command:run:gc generate-embeddings   # With garbage collection
yarn command:run reindex-linkedin-memories
yarn command:run update-suggested-questions
yarn command:run reindex-chroma
yarn command:run refetch-data-sync

# Production
yarn start:prod                   # Start with --expose-gc
yarn update                       # Pull, install, build, migrate
```

## Architecture Overview

### Tech Stack

- **NestJS 10**: Modular application framework
- **TypeORM**: ORM with PostgreSQL + pgvector
- **Express**: HTTP server with middleware
- **Passport + JWT**: Authentication
- **Swagger**: API docs at `/api/docs/v1` (non-production only)
- **Winston**: Logging with daily rotate files
- **Rollbar**: Error monitoring
- **nest-commander**: CLI command framework

### Project Structure

```
src/
├── agents/              # AI agent implementations
│   ├── enhanced-memory-search.ts
│   ├── memory-search.ts
│   ├── generate-image.ts
│   ├── retrieve-content-from-url.ts
│   └── web-search.ts
├── commands/            # CLI commands (nest-commander)
│   ├── generate-embeddings.command.ts
│   ├── generate-metadata.command.ts
│   ├── refetch-data-sync.command.ts
│   ├── reindex-chroma.command.ts
│   ├── reindex-linkedin-memories.command.ts
│   └── update-suggested-questions.command.ts
├── common/              # Logger setup
├── config/
│   ├── configuration.ts         # Environment config loader
│   ├── constants.ts             # Application constants
│   ├── rollbar-exception.filter.ts
│   └── rollbar.provider.ts
├── db/
│   ├── entities/        # 7 TypeORM entities
│   ├── migrations/      # 37 migration files
│   ├── repositories/    # 7 repository classes
│   └── seeds/           # Database seeders
├── middleware/
│   ├── blacklist.middleware.ts
│   └── logger.middleware.ts
├── modules/             # 20 feature modules (see below)
├── console.ts           # CLI entry point
├── console.module.ts    # CLI module setup
├── main.ts              # App bootstrap
├── app.module.ts        # Root module
└── route.ts             # API route registration
```

### Feature Modules (src/modules/)

| Module | Description |
|---|---|
| `auth/` | JWT authentication with GitHub OAuth2 |
| `users/` | User management + Stripe subscriptions |
| `conversations/` | Chat conversation CRUD + memory |
| `completions/` | AI chat completions, debate moderation, usage tracking |
| `messages/` | Message handling with attachments |
| `apps/` | App (digital clone) management |
| `app-analytics/` | App usage analytics |
| `models/` | AI model management |
| `memory/` | Mem0 AI memory integration |
| `embeddings/` | Vector embedding generation |
| `chroma/` | ChromaDB vector database |
| `retrieval/` | Content retrieval from URLs |
| `content-chunker/` | Content chunking for embeddings |
| `linkedin/` | LinkedIn data integration |
| `twitter/` | Twitter/X data integration |
| `stripe/` | Payment processing + webhooks |
| `s3-handler/` | AWS S3 file operations |
| `replicate/` | AI image/video generation |
| `cron/` | Scheduled tasks |
| `common/` | Shared utilities |

### Database Entities

- **User**: Core user with subscription info, settings
- **Conversation**: Chat sessions with app association
- **Message**: Individual messages with role, content, attachments
- **App**: Digital clones with config, prompts, models
- **SocialCredential**: OAuth tokens for connected platforms
- **SocialContent**: Ingested content from social platforms
- **AppLink**: URL resources linked to apps

### API Routes

All registered under `/internal/api/v1` (see `src/route.ts`):

- `ConversationsModule` - Conversation CRUD
- `CompletionsModule` - AI chat completions
- `ModelsModule` - Available AI models
- `AuthModule` - Authentication endpoints
- `StripeModule` - Payment webhooks
- `UsersModule` - User profile management
- `AppsModule` - App/clone management
- `AppAnalyticsModule` - Usage analytics

### AI Integration

- **AI SDK**: Anthropic, OpenAI, Google, DeepSeek, OpenRouter providers
- **LangChain**: Advanced agent orchestration
- **Mem0**: Conversation memory management
- **ChromaDB**: Vector search for knowledge retrieval
- **Replicate**: Image and video generation
- **Exa.js**: Web search capabilities

### External Services

- **Social Media**: Facebook, LinkedIn, Twitter/X, Threads, Gmail, GitHub, Reddit, Medium, Substack, Goodreads
- **AWS S3**: File uploads and media storage (region: ap-northeast-1)
- **Stripe**: Subscription management with webhook handling
- **Rollbar**: Error tracking with custom exception filters

### Configuration

Main config in `src/config/configuration.ts`:

```
port: PORT || 3000
node_env: NODE_ENV || 'local'
jwt_secret: JWT_SECRET
frontend_url: FRONTEND_URL
oauth2.github: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL
aws: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET_NAME
replicate: REPLICATE_API_TOKEN
```

Database config in `ormconfig.ts`:
- `GENGAR_DB_HOSTNAME`, `GENGAR_DB_PORT`, `GENGAR_DB_USERNAME`, `GENGAR_DB_PASSWORD`, `GENGAR_DB_NAME`

### Deployment

- **Platform**: Heroku with `heroku/nodejs` buildpack
- **Procfile**: `web: yarn start:prod`
- **Build**: `heroku-postbuild` script handles prebuild + nest build
- **Post-deploy**: Migrations run automatically via CI/CD

## Coding Standards

### Code Modification Rules

- **NEVER** change existing code formatting, quotes, or style unless explicitly requested
- **ONLY** modify the specific code lines directly related to the requested change
- **PRESERVE** all existing formatting, indentation, and style patterns
- **DO NOT** convert single quotes to double quotes or vice versa
- **DO NOT** refactor or "improve" code unless specifically asked

### Style Conventions

- **Quotes**: Single quotes (`'`) for strings
- **Semicolons**: Follow existing patterns in each file
- **Indentation**: Preserve existing indentation per file
- **Imports**: Keep existing formatting and order

### When Making Changes

1. Read the target file first to understand its style
2. Make only the minimal necessary changes
3. Follow existing patterns in the file
4. Run `yarn lint` after changes
5. Never mass-format files unless requested

### Database Naming Conventions

- **Table names**: snake_case (`social_credentials`, `app_links`)
- **Column names**: camelCase (`createdAt`, `userId`, `subscriptionPlan`)
- **Entity properties**: camelCase to match column names
- **Migration files**: Descriptive PascalCase with timestamp prefix

### Development Patterns

- **Modular Architecture**: Each feature is a separate NestJS module
- **DTO Pattern**: Input/output validation with class-validator + class-transformer
- **Repository Pattern**: Database access through custom repositories
- **Agent Pattern**: Specialized AI agents for different tasks (image gen, web search, content retrieval)
- **Service Layer**: Business logic separated from controllers

### Adding New Features

1. Create a new module: `nest g module modules/feature-name`
2. Add entity in `src/db/entities/` if DB table needed
3. Add repository in `src/db/repositories/`
4. Create migration: `yarn migration:create src/db/migrations/FeatureName`
5. Implement service + controller in the module
6. Register route in `src/route.ts` if it needs an API endpoint
7. Run `yarn build && yarn migration:run` to apply

### Adding New CLI Commands

1. Create command file in `src/commands/`
2. Register in `src/console.module.ts`
3. Run with `yarn command:run <command-name>`
