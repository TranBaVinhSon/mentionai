#!/usr/bin/env bash
#
# Populate SSM Parameter Store secrets for gengar.
# Edit the values below, then run: ./infra/put-secrets.sh
#
# DB params are auto-seeded by setup.sh — only needed if you skipped that step.
#
set -euo pipefail

PROJECT="gengar"
REGION="${AWS_REGION:-us-west-2}"

put() {
  if [ -n "$2" ]; then
    aws ssm put-parameter --name "/$PROJECT/$1" --value "$2" \
      --type SecureString --overwrite --region "$REGION" >/dev/null
    echo "  Set /$PROJECT/$1"
  else
    echo "  SKIP /$PROJECT/$1 (empty)"
  fi
}

echo "=== Populating SSM Parameters ==="

# AI API Keys
put "OPENAI_API_KEY"       "${OPENAI_API_KEY:-}"
put "ANTHROPIC_API_KEY"    "${ANTHROPIC_API_KEY:-}"
put "GEMINI_API_KEY"       "${GEMINI_API_KEY:-}"
put "DEEPSEEK_API_KEY"     "${DEEPSEEK_API_KEY:-}"
put "PERPLEXITY_API_KEY"   "${PERPLEXITY_API_KEY:-}"
put "GROQ_API_KEY"         "${GROQ_API_KEY:-}"

# Search / Scraping
put "TAVILY_API_KEY"       "${TAVILY_API_KEY:-}"
put "EXA_API_KEY"          "${EXA_API_KEY:-}"
put "REPLICATE_API_TOKEN"  "${REPLICATE_API_TOKEN:-}"
put "PROXYCURL_API_KEY"    "${PROXYCURL_API_KEY:-}"
put "APIFY_API_TOKEN"      "${APIFY_API_TOKEN:-}"

# Auth
put "GITHUB_CLIENT_ID"     "${GITHUB_CLIENT_ID:-}"
put "GITHUB_CLIENT_SECRET" "${GITHUB_CLIENT_SECRET:-}"
put "GITHUB_CALLBACK_URL"  "${GITHUB_CALLBACK_URL:-}"
put "JWT_SECRET"           "${JWT_SECRET:-}"

# Stripe
put "STRIPE_SECRET_KEY"    "${STRIPE_SECRET_KEY:-}"
put "STRIPE_PRICE_ID"      "${STRIPE_PRICE_ID:-}"

# App
put "FRONTEND_URL"         "${FRONTEND_URL:-}"
put "MEM0_API_KEY"         "${MEM0_API_KEY:-}"
put "AWS_S3_BUCKET_NAME"   "${AWS_S3_BUCKET_NAME:-}"
put "ROLLBAR_ACCESS_TOKEN" "${ROLLBAR_ACCESS_TOKEN:-}"

echo ""
echo "Done. Empty values were skipped — set them as env vars and re-run."
