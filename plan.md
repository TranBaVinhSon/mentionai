# Heroku to AWS Fargate Migration Plan

## Current State Summary

| Component | Current (Heroku) |
|---|---|
| Runtime | Single web dyno, `node --expose-gc dist/src/main.js` |
| Build | `heroku-postbuild` script (needs 6GB RAM for NestJS build) |
| Database | Heroku Postgres (pgvector extension) |
| Cron | `@nestjs/schedule` in-process (monthly usage reset) |
| One-off commands | `heroku run` for migrations, embedding generation |
| Storage | AWS S3 (already on AWS) |
| CI/CD | GitHub Actions -> `akhileshns/heroku-deploy` |
| Errors | Rollbar |
| WebSockets | None |
| Redis/Queues | None |

Architecture is simple: **single stateless HTTP server + PostgreSQL**. No Redis, no queues, no WebSockets.

---

## Target AWS Architecture (Minimum Cost)

```
Internet
   |
   v
API Gateway HTTP API ($1/million req)
   |  (VPC Link)
   v
Cloud Map Service Discovery
   |
   v
ECS Fargate Spot (ARM64/Graviton)  <-->  RDS PostgreSQL (pgvector)
   |
   v
S3 (already exists)
```

### Cost-Optimized Choices

| Decision | Choice | Rationale |
|---|---|---|
| CPU arch | **ARM64 (Graviton)** | ~20% cheaper than x86 on Fargate |
| Fargate pricing | **Fargate Spot** | Up to 70% cheaper, acceptable for single non-critical task |
| Task size | **0.25 vCPU / 512 MB** | Smallest Fargate size — sufficient for NestJS API |
| Database | **RDS PostgreSQL db.t4g.micro** (single-AZ) | pgvector support, ~$12/mo |
| Load balancer | **API Gateway HTTP API** | **$1/million requests** vs ALB's $18/mo fixed cost |
| Service discovery | **Cloud Map** | Free — connects API Gateway to Fargate via VPC Link |
| Container registry | **ECR** | Free tier: 500MB/mo |
| Secrets | **SSM Parameter Store** | Free (vs Secrets Manager at $0.40/secret/mo) |
| Logs | **CloudWatch Logs (14-day retention)** | Native Fargate integration, first 5GB free |
| NAT Gateway | **None** | Public subnets with `assignPublicIp` saves ~$32/mo |

### Estimated Monthly Cost (Production)

| Resource | Spec | Est. Cost |
|---|---|---|
| Fargate Spot (1 task, ARM64) | 0.25 vCPU / 512MB | ~$4-5/mo |
| RDS PostgreSQL | db.t4g.micro, 20GB gp3, single-AZ | ~$12/mo |
| API Gateway HTTP API | ~100k-500k requests/mo | ~$0.10-0.50/mo |
| Cloud Map | Service discovery | Free |
| ECR | <1GB stored (5 image lifecycle) | ~$0.10/mo |
| CloudWatch Logs | <5GB/mo, 14-day retention | Free tier |
| NAT Gateway | Avoided — public subnets | $0 |
| **Total** | | **~$17-18/mo** |

---

## Architecture Decisions

### Why API Gateway HTTP API instead of ALB
- ALB has a **fixed minimum ~$18/mo** regardless of traffic
- API Gateway HTTP API is **pure pay-per-request** ($1/million)
- At <1M requests/mo, API Gateway costs cents vs ALB's $18
- API Gateway also provides free TLS, throttling, and custom domain support
- Connected to Fargate via VPC Link + Cloud Map (service discovery)

### Why Fargate Spot
- Up to 70% cheaper than on-demand
- Single task can be interrupted (2-minute warning), but restarts automatically
- Acceptable for an API service — brief downtime during spot reclaim is tolerable

---

## Infrastructure Scripts (AWS CLI)

No Terraform — just shell scripts calling `aws` CLI directly.

| Script | Purpose |
|---|---|
| `infra/setup.sh` | Create all AWS resources (idempotent, safe to re-run) |
| `infra/teardown.sh` | Delete everything (prompts before each step) |
| `infra/put-secrets.sh` | Populate SSM params from env vars |
| `scripts/ecs-run.sh` | Run one-off commands (replaces `heroku run`) |

## Cutover Checklist

1. `export DB_PASSWORD=... && ./infra/setup.sh` to create all AWS resources
2. Wait for RDS: `aws rds wait db-instance-available --db-instance-identifier gengar-db`
3. Populate secrets: `export OPENAI_API_KEY=... && ./infra/put-secrets.sh`
4. Build and push Docker image to ECR
5. `pg_dump` from Heroku Postgres -> `pg_restore` into RDS
6. Run `CREATE EXTENSION IF NOT EXISTS vector;` on RDS
7. Run migrations via `./scripts/ecs-run.sh`
8. Point domain to API Gateway endpoint (printed by setup.sh)
9. Update OAuth callback URLs, Stripe webhook URL, `FRONTEND_URL`
10. Set GitHub secrets: `AWS_ROLE_ARN`, `ECS_SUBNET_IDS`, `ECS_SECURITY_GROUP_ID`
11. Smoke test all endpoints
12. Keep Heroku running 1-2 weeks as rollback
13. Decommission Heroku
