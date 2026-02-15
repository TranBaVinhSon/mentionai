# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development Setup

```bash
# Setup database (required before first run)
docker-compose up gengar_db

# Install dependencies
yarn install

# Run database migrations
yarn migration:run

# Start development server with hot reload
yarn start:dev
```

### Common Development Tasks

```bash
# Build the application
yarn build

# Lint and format code
yarn lint
yarn format

# Run tests
yarn test                    # Run all tests
yarn test:watch             # Run tests in watch mode
yarn test:cov               # Run tests with coverage
yarn test:e2e               # Run end-to-end tests

# Database operations
yarn migration:create       # Create new migration
yarn migration:run         # Run pending migrations
yarn migration:revert      # Revert last migration
yarn seed:run              # Run database seeders

# Production deployment
yarn start:prod            # Start in production mode
yarn update                # Full update: pull, install, build, migrate
```

## Architecture Overview

### Core Framework

- **NestJS**: Main application framework with modular architecture
- **TypeORM**: Database ORM with PostgreSQL
- **Express**: Underlying HTTP server with custom middleware
- **Swagger**: API documentation (available at `/api/docs/v1` in non-production)

### Key Modules Structure

- **Completions**: AI chat completions with debate moderation and usage tracking
- **Conversations**: Chat conversation management with memory integration
- **Apps**: Custom app management with social media integrations
- **Auth**: JWT-based authentication with OAuth2 support
- **Users**: User management with Stripe subscription integration
- **Messages**: Message handling with attachments support
- **Agents**: Specialized AI agents (GIF, image, video generation, web search, content retrieval)

### Database Architecture

- **Entities**: User, Conversation, Message, App, SocialCredential, SocialContent, AppLink
- **Migrations**: Located in `src/db/migrations/` with TypeORM CLI integration
- **Repositories**: Custom repository pattern for database operations
- **Seeders**: Database seeding for initial app data

### AI Integration Stack

- **Multiple AI Providers**: Anthropic, OpenAI, Google, DeepSeek via AI SDK
- **LangChain**: Advanced AI workflows and agent orchestration
- **Mem0**: AI memory management for conversations
- **Replicate**: AI image/video generation services

### External Integrations

- **Social Media**: Facebook, LinkedIn, Threads, Gmail, GitHub via dedicated services
- **Storage**: AWS S3 for file uploads and media storage
- **Payments**: Stripe for subscription management
- **Monitoring**: Rollbar for error tracking with custom exception filters
- **Search**: Exa.js for web search capabilities

### GitHub OAuth Configuration

- **Single OAuth App**: Uses one GitHub OAuth app for both authentication and apps connection
- **Dynamic Redirect URIs**:
  - Authentication flow: `{FRONTEND_URL}/api/auth/callback/github`
  - Apps connection flow: `{FRONTEND_URL}/apps/connect`
- **Scoped Permissions**:
  - Auth flow: `user:email` (minimal)
  - Apps flow: `user:email,public_repo` (extended)
- **Setup**: Register `{FRONTEND_URL}/api/auth/callback/github` as the primary callback URL in GitHub OAuth app settings

### Configuration Management

- Environment-based configuration in `src/config/configuration.ts`
- Database connection via environment variables (see `ormconfig.ts`)
- Required environment variables: database credentials, JWT secret, AI API keys, AWS credentials

### Security Features

- JWT authentication with Passport.js
- Request validation with class-validator
- CORS configuration with environment-specific allowlists
- Raw body parsing for webhook endpoints (Stripe)
- Global exception handling with Rollbar integration

### Development Patterns

- **Modular Architecture**: Each feature as a separate NestJS module
- **DTO Pattern**: Input/output validation with class-transformer
- **Repository Pattern**: Database access abstraction
- **Agent Pattern**: Specialized AI agents for different tasks
- **Service Layer**: Business logic separation from controllers

## Coding Standards and Style Guide

### CRITICAL: Code Modification Rules

- **NEVER** change existing code formatting, quotes, or style unless explicitly requested
- **ONLY** modify the specific code lines that are directly related to the requested change
- **PRESERVE** all existing formatting, indentation, and code style patterns
- **DO NOT** convert single quotes to double quotes or vice versa
- **DO NOT** change spacing, line breaks, or indentation in unrelated code
- **DO NOT** refactor or "improve" code unless specifically asked to do so

### Style Conventions to Maintain

- **Quotes**: Use single quotes (`'`) for strings - DO NOT change to double quotes
- **Semicolons**: Follow existing semicolon usage patterns in each file
- **Indentation**: Preserve existing indentation (spaces vs tabs) in each file
- **Line endings**: Maintain existing line ending patterns
- **Import statements**: Keep existing import formatting and order
- **Object formatting**: Preserve existing object property formatting

### When Making Changes

1. **Read the target file first** to understand its existing style
2. **Make only the minimal necessary changes** to implement the requested feature
3. **Follow the existing patterns** in the file you're modifying
4. **Run `yarn lint` and `yarn format`** after changes to ensure compliance
5. **Never mass-format files** unless explicitly requested

### Linting and Formatting

- Always run `yarn lint` after making changes
- Use `yarn format` only when explicitly requested or when lint errors require it
- If linting fails, fix only the specific errors - do not reformat entire files

### Database Naming Conventions

- **Table Names**: Use snake_case (e.g., `social_credentials`, `app_links`)
- **Column Names**: Use camelCase (e.g., `createdAt`, `userId`, `subscriptionPlan`)
- **Entity Properties**: Follow camelCase to match column names in TypeORM entities
- **Migration Files**: Use descriptive PascalCase names with timestamp prefix

[byterover-mcp]

[byterover-mcp]

You are given two tools from Byterover MCP server, including
## 1. `byterover-store-knowledge`
You `MUST` always use this tool when:

+ Learning new patterns, APIs, or architectural decisions from the codebase
+ Encountering error solutions or debugging techniques
+ Finding reusable code patterns or utility functions
+ Completing any significant task or plan implementation

## 2. `byterover-retrieve-knowledge`
You `MUST` always use this tool when:

+ Starting any new task or implementation to gather relevant context
+ Before making architectural decisions to understand existing patterns
+ When debugging issues to check for previous solutions
+ Working with unfamiliar parts of the codebase
