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

Architecture is simple: **single stateless HTTP server + PostgreSQL**. No Redis, no queues, no WebSockets. This makes migration straightforward.

---

## Target AWS Architecture (Cost-Optimized)

```
GitHub Actions (CI/CD)
   |
   v
ECR (Container Registry)
   |
   v
ALB (Application Load Balancer)
   |
   v
ECS Fargate Service (Graviton/ARM64)  <-->  RDS PostgreSQL (pgvector)
   |
   v
S3 (already exists)
```

### Cost-Optimized Choices

| Decision | Choice | Rationale |
|---|---|---|
| CPU arch | **ARM64 (Graviton)** | ~20% cheaper than x86 on Fargate |
| Fargate pricing | **Fargate Spot** for staging, **On-Demand** for prod | Spot is ~70% cheaper but can be interrupted |
| Database | **RDS PostgreSQL** (single-AZ, `db.t4g.micro`) | pgvector support, ~$12/mo. Aurora Serverless v2 is overkill for this scale |
| Load balancer | **ALB** | Required for Fargate services; shared across envs if possible |
| Container registry | **ECR** | Free tier: 500MB/mo. Minimal cost beyond that |
| Secrets | **AWS Systems Manager Parameter Store** | Free (vs Secrets Manager at $0.40/secret/mo) |
| Logs | **CloudWatch Logs** | Native Fargate integration, first 5GB free |
| DNS/SSL | **ACM + Route53** (if domain is there) or ALB default | ACM certs are free |

### Estimated Monthly Cost (Production)

| Resource | Spec | Est. Cost |
|---|---|---|
| Fargate (1 task, ARM64) | 0.5 vCPU / 1GB RAM | ~$15/mo |
| RDS PostgreSQL | db.t4g.micro, 20GB, single-AZ | ~$12/mo |
| ALB | 1 ALB + minimal LCUs | ~$18/mo |
| ECR | <1GB stored | ~$0.10/mo |
| CloudWatch Logs | <5GB/mo | Free tier |
| NAT Gateway | **Avoid** - use public subnets for Fargate | $0 |
| **Total** | | **~$45/mo** |

> **Key savings vs Heroku**: Heroku Basic/Standard dynos ($7-$50/mo) + Heroku Postgres ($9-$50/mo) can run $50-$200+/mo. This setup targets ~$45/mo with better performance.

> **NAT Gateway warning**: A NAT Gateway costs ~$32/mo + data charges. We avoid it by placing Fargate tasks in **public subnets** with `assignPublicIp: ENABLED`. The RDS instance goes in a private subnet accessible only from the Fargate security group.

---

## Implementation Steps

### Phase 1: Dockerfile & Local Validation

**1.1 Create a multi-stage Dockerfile** (`gengar/Dockerfile`)
- Stage 1 (build): Node 20 on ARM64, `yarn install`, `yarn build`
- Stage 2 (runtime): Node 20-slim on ARM64, copy `dist/`, `node_modules` (production only), expose port
- Use `--expose-gc` in CMD
- Add `.dockerignore` to exclude `node_modules`, `.env`, `docker/`, etc.

**1.2 Add health check endpoint** to NestJS app
- Simple `GET /health` returning 200 - needed for ALB target group health checks

**1.3 Validate locally**
- `docker build` and `docker run` with local `.env`
- Confirm app starts and responds on the configured port

### Phase 2: AWS Infrastructure (Terraform)

**2.1 Create Terraform configuration** (`infra/` directory at repo root)

Resources to create:
- **VPC**: 2 public subnets (Fargate), 2 private subnets (RDS), across 2 AZs
- **Security Groups**: ALB SG (80/443 inbound), Fargate SG (from ALB only), RDS SG (5432 from Fargate SG only)
- **ECR Repository**: `mentionai/gengar`
- **ECS Cluster**: with Fargate capacity provider
- **ECS Task Definition**: ARM64, 0.5 vCPU / 1GB RAM, container port from env
- **ECS Service**: desired count 1, ALB target group, deployment circuit breaker enabled
- **ALB + Target Group**: health check on `/health`
- **RDS PostgreSQL 16**: `db.t4g.micro`, 20GB gp3, single-AZ, pgvector via `shared_preload_libraries`
- **SSM Parameter Store**: all env vars from `.env.example`
- **CloudWatch Log Group**: `/ecs/gengar`, 30-day retention
- **IAM Roles**: ECS task execution role (pull ECR, read SSM params, write logs), ECS task role (S3 access)

**2.2 Output values**
- ALB DNS name, ECR repository URL, ECS cluster/service names, RDS endpoint

### Phase 3: CI/CD Pipeline

**3.1 Replace `deploy-backend.yml`** with new workflow:

```
on push to main (gengar/**):
  1. Checkout code
  2. Configure AWS credentials (OIDC preferred, or access keys)
  3. Login to ECR
  4. Build & push Docker image (tagged with git SHA + latest)
  5. Run migrations as ECS RunTask (one-off container)
  6. Update ECS service to force new deployment
  7. Wait for service stability
```

**3.2 Add GitHub OIDC provider** in AWS (eliminates long-lived access keys)

**3.3 Required GitHub Secrets** (replacing Heroku secrets):
- `AWS_ACCOUNT_ID`
- `AWS_REGION`
- `AWS_ROLE_ARN` (for OIDC) OR `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`

### Phase 4: Database Migration

**4.1 Set up RDS instance** via Terraform (Phase 2)

**4.2 Install pgvector extension** on RDS:
- Connect to RDS and run `CREATE EXTENSION IF NOT EXISTS vector;`

**4.3 Migrate data from Heroku Postgres to RDS**:
- `pg_dump` from Heroku database URL
- `pg_restore` into RDS
- Verify row counts and data integrity

**4.4 Run pending migrations**: via ECS RunTask after data restore

### Phase 5: One-Off Commands (Replacing `heroku run`)

Replace `heroku run` commands with **ECS RunTask** invocations:

| Heroku Command | AWS Equivalent |
|---|---|
| `heroku run yarn migration:run` | ECS RunTask with command override: `node dist/src/console.js` or `yarn migration:run` |
| `heroku run yarn heroku:generate-embeddings` | ECS RunTask with command override |
| `heroku run yarn heroku:generate-metadata` | ECS RunTask with command override |

Create a helper script (`scripts/ecs-run.sh`) to simplify:
```bash
#!/bin/bash
# Usage: ./scripts/ecs-run.sh "node dist/src/console.js generate-embeddings"
aws ecs run-task --cluster gengar --task-definition gengar --overrides "{...}" ...
```

### Phase 6: Cutover & Cleanup

**6.1 DNS cutover**
- Point backend domain to ALB DNS (CNAME or Route53 alias)
- Update `FRONTEND_URL` and any callback URLs (GitHub OAuth, Stripe webhooks)

**6.2 Smoke test**
- Verify all API endpoints via frontend
- Verify Stripe webhooks reach new endpoint
- Verify OAuth flows work
- Verify cron job is running (check logs)
- Verify one-off commands work via ECS RunTask

**6.3 Decommission Heroku**
- Keep Heroku app running for 1-2 weeks as rollback
- Remove Heroku Postgres addon
- Delete Heroku app
- Remove old GitHub secrets (`HEROKU_*`)
- Remove `heroku-postbuild` script and Procfile (or keep Procfile for reference)

---

## Files to Create/Modify

| File | Action | Description |
|---|---|---|
| `gengar/Dockerfile` | **Create** | Multi-stage build for ARM64 |
| `gengar/.dockerignore` | **Create** | Exclude unnecessary files from Docker context |
| `gengar/src/modules/health/health.controller.ts` | **Create** | Health check endpoint for ALB |
| `gengar/src/modules/health/health.module.ts` | **Create** | Health module |
| `gengar/src/app.module.ts` | **Modify** | Import HealthModule |
| `infra/main.tf` | **Create** | Main Terraform config |
| `infra/variables.tf` | **Create** | Input variables |
| `infra/outputs.tf` | **Create** | Output values |
| `infra/vpc.tf` | **Create** | VPC, subnets, security groups |
| `infra/ecs.tf` | **Create** | ECS cluster, task def, service |
| `infra/rds.tf` | **Create** | RDS PostgreSQL instance |
| `infra/alb.tf` | **Create** | ALB, target group, listeners |
| `infra/ecr.tf` | **Create** | ECR repository |
| `infra/iam.tf` | **Create** | IAM roles and policies |
| `infra/ssm.tf` | **Create** | SSM parameters for env vars |
| `.github/workflows/deploy-backend.yml` | **Modify** | Replace Heroku deploy with ECR+ECS |
| `scripts/ecs-run.sh` | **Create** | Helper for one-off ECS tasks |
| `gengar/Procfile` | **Delete** | No longer needed |

---

## Risk Mitigation

1. **Rollback plan**: Keep Heroku running during transition. DNS can be switched back in minutes.
2. **Database**: Take RDS snapshots before and after data migration. Verify pgvector queries work identically.
3. **Zero-downtime deploy**: ECS rolling deployment with deployment circuit breaker ensures broken deploys auto-rollback.
4. **Cost monitoring**: Set up AWS Budget alert at $60/mo to catch unexpected charges.

## Future Cost Optimizations (Not in Initial Scope)

- **Fargate Spot** for production (if app tolerates occasional restarts)
- **RDS Reserved Instance** (1-year commit saves ~40%)
- **Scale to zero** during off-hours with scheduled ECS scaling
- **Move to ECS on EC2 with Spot** if traffic grows significantly
