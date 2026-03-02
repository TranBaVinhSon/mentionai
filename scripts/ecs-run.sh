#!/usr/bin/env bash
# Run a one-off command on ECS Fargate (replaces `heroku run`)
#
# Usage:
#   ./scripts/ecs-run.sh "node dist/src/console.js generate-embeddings"
#   ./scripts/ecs-run.sh "yarn migration:run"
#
# Requires: aws CLI configured, ECS_CLUSTER / ECS_TASK_DEFINITION / ECS_SUBNET_IDS / ECS_SECURITY_GROUP_ID env vars
# Or set defaults below:

set -euo pipefail

CLUSTER="${ECS_CLUSTER:-gengar}"
TASK_DEF="${ECS_TASK_DEFINITION:-gengar}"
CONTAINER_NAME="${CONTAINER_NAME:-gengar}"
REGION="${AWS_REGION:-us-west-2}"

# These must be set — get from terraform output or AWS console
SUBNETS="${ECS_SUBNET_IDS:?Set ECS_SUBNET_IDS (comma-separated)}"
SECURITY_GROUP="${ECS_SECURITY_GROUP_ID:?Set ECS_SECURITY_GROUP_ID}"

COMMAND="${1:?Usage: $0 \"<command>\"}"

echo "Running: $COMMAND"
echo "Cluster: $CLUSTER | Task: $TASK_DEF"

TASK_ARN=$(aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEF" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"$CONTAINER_NAME\",
      \"command\": [\"sh\", \"-c\", \"$COMMAND\"]
    }]
  }" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task started: $TASK_ARN"
echo "Waiting for task to stop..."

aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER" --tasks "$TASK_ARN"

EXIT_CODE=$(aws ecs describe-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

echo "Exit code: $EXIT_CODE"

# Print recent logs
LOG_STREAM=$(aws ecs describe-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].runtimeId' \
  --output text)

if [ "$LOG_STREAM" != "None" ] && [ -n "$LOG_STREAM" ]; then
  echo "--- Logs ---"
  aws logs get-log-events \
    --region "$REGION" \
    --log-group-name "/ecs/$CLUSTER" \
    --log-stream-name "ecs/$CONTAINER_NAME/$LOG_STREAM" \
    --limit 50 \
    --query 'events[].message' \
    --output text 2>/dev/null || echo "(could not fetch logs)"
fi

exit "$EXIT_CODE"
