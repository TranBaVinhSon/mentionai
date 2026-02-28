#!/usr/bin/env bash
#
# Create all AWS infrastructure for gengar backend.
# Run once. Idempotent — skips resources that already exist.
#
# Prerequisites: aws CLI v2 configured with admin-level credentials.
#
# Usage:
#   export DB_PASSWORD="your-secure-password"
#   ./infra/setup.sh
#
set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────
PROJECT="gengar"
REGION="${AWS_REGION:-us-west-2}"
DB_INSTANCE_CLASS="db.t4g.micro"
DB_STORAGE=20
DB_NAME="gengar"
DB_USERNAME="gengar"
DB_PASSWORD="${DB_PASSWORD:?Set DB_PASSWORD env var}"
CONTAINER_PORT=3000
TASK_CPU=256        # 0.25 vCPU
TASK_MEMORY=512     # 512 MB
GITHUB_REPO="TranBaVinhSon/mentionai"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Account: $ACCOUNT_ID | Region: $REGION"

# ─── Helper ──────────────────────────────────────────────────────
tag() { echo "[{\"Key\":\"Project\",\"Value\":\"$PROJECT\"},{\"Key\":\"Name\",\"Value\":\"$1\"}]"; }

# ─── 1. VPC ──────────────────────────────────────────────────────
echo "=== VPC ==="

VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$PROJECT-vpc" \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
  VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 \
    --tag-specifications "ResourceType=vpc,Tags=$(tag "$PROJECT-vpc")" \
    --query 'Vpc.VpcId' --output text --region "$REGION")
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-hostnames --region "$REGION"
  aws ec2 modify-vpc-attribute --vpc-id "$VPC_ID" --enable-dns-support --region "$REGION"
  echo "  Created VPC: $VPC_ID"
else
  echo "  Exists: $VPC_ID"
fi

# Internet Gateway
IGW_ID=$(aws ec2 describe-internet-gateways \
  --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
  --query 'InternetGateways[0].InternetGatewayId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$IGW_ID" = "None" ] || [ -z "$IGW_ID" ]; then
  IGW_ID=$(aws ec2 create-internet-gateway \
    --tag-specifications "ResourceType=internet-gateway,Tags=$(tag "$PROJECT-igw")" \
    --query 'InternetGateway.InternetGatewayId' --output text --region "$REGION")
  aws ec2 attach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION"
  echo "  Created IGW: $IGW_ID"
else
  echo "  Exists IGW: $IGW_ID"
fi

# Get 2 AZs
AZS=($(aws ec2 describe-availability-zones --region "$REGION" \
  --query 'AvailabilityZones[:2].ZoneName' --output text))
echo "  AZs: ${AZS[*]}"

# Public subnets (Fargate + API Gateway VPC Link)
PUBLIC_SUBNET_IDS=()
for i in 0 1; do
  CIDR="10.0.$i.0/24"
  SUB_ID=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=cidr-block,Values=$CIDR" \
    --query 'Subnets[0].SubnetId' --output text --region "$REGION" 2>/dev/null || echo "None")

  if [ "$SUB_ID" = "None" ] || [ -z "$SUB_ID" ]; then
    SUB_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR" \
      --availability-zone "${AZS[$i]}" \
      --tag-specifications "ResourceType=subnet,Tags=$(tag "$PROJECT-public-${AZS[$i]}")" \
      --query 'Subnet.SubnetId' --output text --region "$REGION")
    aws ec2 modify-subnet-attribute --subnet-id "$SUB_ID" --map-public-ip-on-launch --region "$REGION"
    echo "  Created public subnet: $SUB_ID (${AZS[$i]})"
  else
    echo "  Exists public subnet: $SUB_ID (${AZS[$i]})"
  fi
  PUBLIC_SUBNET_IDS+=("$SUB_ID")
done

# Private subnets (RDS)
PRIVATE_SUBNET_IDS=()
for i in 0 1; do
  CIDR="10.0.$((i + 10)).0/24"
  SUB_ID=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=cidr-block,Values=$CIDR" \
    --query 'Subnets[0].SubnetId' --output text --region "$REGION" 2>/dev/null || echo "None")

  if [ "$SUB_ID" = "None" ] || [ -z "$SUB_ID" ]; then
    SUB_ID=$(aws ec2 create-subnet --vpc-id "$VPC_ID" --cidr-block "$CIDR" \
      --availability-zone "${AZS[$i]}" \
      --tag-specifications "ResourceType=subnet,Tags=$(tag "$PROJECT-private-${AZS[$i]}")" \
      --query 'Subnet.SubnetId' --output text --region "$REGION")
    echo "  Created private subnet: $SUB_ID (${AZS[$i]})"
  else
    echo "  Exists private subnet: $SUB_ID (${AZS[$i]})"
  fi
  PRIVATE_SUBNET_IDS+=("$SUB_ID")
done

# Route table for public subnets
RTB_ID=$(aws ec2 describe-route-tables \
  --filters "Name=tag:Name,Values=$PROJECT-public-rt" "Name=vpc-id,Values=$VPC_ID" \
  --query 'RouteTables[0].RouteTableId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$RTB_ID" = "None" ] || [ -z "$RTB_ID" ]; then
  RTB_ID=$(aws ec2 create-route-table --vpc-id "$VPC_ID" \
    --tag-specifications "ResourceType=route-table,Tags=$(tag "$PROJECT-public-rt")" \
    --query 'RouteTable.RouteTableId' --output text --region "$REGION")
  aws ec2 create-route --route-table-id "$RTB_ID" --destination-cidr-block 0.0.0.0/0 \
    --gateway-id "$IGW_ID" --region "$REGION" >/dev/null
  echo "  Created route table: $RTB_ID"
else
  echo "  Exists route table: $RTB_ID"
fi

for SUB_ID in "${PUBLIC_SUBNET_IDS[@]}"; do
  aws ec2 associate-route-table --route-table-id "$RTB_ID" --subnet-id "$SUB_ID" \
    --region "$REGION" >/dev/null 2>&1 || true
done

# ─── 2. Security Groups ─────────────────────────────────────────
echo "=== Security Groups ==="

get_sg() {
  aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$1" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || echo "None"
}

# ECS SG — allow container port from VPC CIDR (API Gateway VPC Link)
ECS_SG_ID=$(get_sg "$PROJECT-ecs")
if [ "$ECS_SG_ID" = "None" ] || [ -z "$ECS_SG_ID" ]; then
  ECS_SG_ID=$(aws ec2 create-security-group --group-name "$PROJECT-ecs" \
    --description "Fargate tasks" --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text --region "$REGION")
  aws ec2 authorize-security-group-ingress --group-id "$ECS_SG_ID" \
    --protocol tcp --port "$CONTAINER_PORT" --cidr 10.0.0.0/16 --region "$REGION" >/dev/null
  aws ec2 create-tags --resources "$ECS_SG_ID" \
    --tags Key=Name,Value="$PROJECT-ecs" --region "$REGION"
  echo "  Created ECS SG: $ECS_SG_ID"
else
  echo "  Exists ECS SG: $ECS_SG_ID"
fi

# RDS SG — allow 5432 from ECS SG only
RDS_SG_ID=$(get_sg "$PROJECT-rds")
if [ "$RDS_SG_ID" = "None" ] || [ -z "$RDS_SG_ID" ]; then
  RDS_SG_ID=$(aws ec2 create-security-group --group-name "$PROJECT-rds" \
    --description "RDS PostgreSQL" --vpc-id "$VPC_ID" \
    --query 'GroupId' --output text --region "$REGION")
  aws ec2 authorize-security-group-ingress --group-id "$RDS_SG_ID" \
    --protocol tcp --port 5432 --source-group "$ECS_SG_ID" --region "$REGION" >/dev/null
  aws ec2 create-tags --resources "$RDS_SG_ID" \
    --tags Key=Name,Value="$PROJECT-rds" --region "$REGION"
  echo "  Created RDS SG: $RDS_SG_ID"
else
  echo "  Exists RDS SG: $RDS_SG_ID"
fi

# ─── 3. ECR ─────────────────────────────────────────────────────
echo "=== ECR ==="

ECR_URI=$(aws ecr describe-repositories --repository-names "$PROJECT" \
  --query 'repositories[0].repositoryUri' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$ECR_URI" = "None" ] || [ -z "$ECR_URI" ]; then
  ECR_URI=$(aws ecr create-repository --repository-name "$PROJECT" \
    --image-tag-mutability MUTABLE \
    --query 'repository.repositoryUri' --output text --region "$REGION")
  echo "  Created ECR: $ECR_URI"
else
  echo "  Exists ECR: $ECR_URI"
fi

# Lifecycle — keep last 5 images
aws ecr put-lifecycle-policy --repository-name "$PROJECT" --region "$REGION" \
  --lifecycle-policy-text '{
    "rules": [{
      "rulePriority": 1,
      "description": "Keep last 5 images",
      "selection": { "tagStatus": "any", "countType": "imageCountMoreThan", "countNumber": 5 },
      "action": { "type": "expire" }
    }]
  }' >/dev/null 2>&1
echo "  ECR lifecycle: keep 5 images"

# ─── 4. IAM Roles ───────────────────────────────────────────────
echo "=== IAM Roles ==="

create_role() {
  local ROLE_NAME=$1
  local TRUST_POLICY=$2

  EXISTING=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || echo "None")
  if [ "$EXISTING" = "None" ]; then
    ARN=$(aws iam create-role --role-name "$ROLE_NAME" \
      --assume-role-policy-document "$TRUST_POLICY" \
      --query 'Role.Arn' --output text)
    echo "  Created role: $ROLE_NAME"
    echo "$ARN"
  else
    echo "  Exists role: $ROLE_NAME" >&2
    echo "$EXISTING"
  fi
}

ECS_TRUST='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

# ECS Execution Role (pull ECR, read SSM, write logs)
EXEC_ROLE_ARN=$(create_role "$PROJECT-ecs-execution" "$ECS_TRUST")

aws iam attach-role-policy --role-name "$PROJECT-ecs-execution" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" 2>/dev/null || true

# Inline policy: read SSM params
aws iam put-role-policy --role-name "$PROJECT-ecs-execution" --policy-name ssm-read \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[{
      \"Effect\":\"Allow\",
      \"Action\":[\"ssm:GetParameters\",\"ssm:GetParameter\"],
      \"Resource\":\"arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/$PROJECT/*\"
    }]
  }"

# ECS Task Role (S3 access for the app)
TASK_ROLE_ARN=$(create_role "$PROJECT-ecs-task" "$ECS_TRUST")

aws iam put-role-policy --role-name "$PROJECT-ecs-task" --policy-name s3-access \
  --policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"],
      "Resource":["arn:aws:s3:::*"]
    }]
  }'

# GitHub Actions OIDC
OIDC_ARN=$(aws iam list-open-id-connect-providers \
  --query "OpenIDConnectProviderList[?ends_with(Arn,'token.actions.githubusercontent.com')].Arn | [0]" \
  --output text 2>/dev/null || echo "None")

if [ "$OIDC_ARN" = "None" ] || [ -z "$OIDC_ARN" ]; then
  OIDC_ARN=$(aws iam create-open-id-connect-provider \
    --url "https://token.actions.githubusercontent.com" \
    --client-id-list "sts.amazonaws.com" \
    --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
    --query 'OpenIDConnectProviderArn' --output text)
  echo "  Created OIDC provider"
else
  echo "  Exists OIDC provider"
fi

GH_TRUST="{
  \"Version\":\"2012-10-17\",
  \"Statement\":[{
    \"Effect\":\"Allow\",
    \"Principal\":{\"Federated\":\"$OIDC_ARN\"},
    \"Action\":\"sts:AssumeRoleWithWebIdentity\",
    \"Condition\":{
      \"StringLike\":{\"token.actions.githubusercontent.com:sub\":\"repo:$GITHUB_REPO:*\"},
      \"StringEquals\":{\"token.actions.githubusercontent.com:aud\":\"sts.amazonaws.com\"}
    }
  }]
}"

GH_ROLE_ARN=$(create_role "$PROJECT-github-actions" "$GH_TRUST")

aws iam put-role-policy --role-name "$PROJECT-github-actions" --policy-name deploy \
  --policy-document "{
    \"Version\":\"2012-10-17\",
    \"Statement\":[
      {
        \"Effect\":\"Allow\",
        \"Action\":[
          \"ecr:GetAuthorizationToken\",\"ecr:BatchCheckLayerAvailability\",
          \"ecr:GetDownloadUrlForLayer\",\"ecr:BatchGetImage\",\"ecr:PutImage\",
          \"ecr:InitiateLayerUpload\",\"ecr:UploadLayerPart\",\"ecr:CompleteLayerUpload\"
        ],
        \"Resource\":\"*\"
      },
      {
        \"Effect\":\"Allow\",
        \"Action\":[
          \"ecs:UpdateService\",\"ecs:DescribeServices\",\"ecs:DescribeTaskDefinition\",
          \"ecs:RegisterTaskDefinition\",\"ecs:RunTask\",\"ecs:DescribeTasks\"
        ],
        \"Resource\":\"*\"
      },
      {
        \"Effect\":\"Allow\",
        \"Action\":\"iam:PassRole\",
        \"Resource\":[\"$EXEC_ROLE_ARN\",\"$TASK_ROLE_ARN\"]
      }
    ]
  }"

# ─── 5. RDS ─────────────────────────────────────────────────────
echo "=== RDS ==="

DB_EXISTS=$(aws rds describe-db-instances --db-instance-identifier "$PROJECT-db" \
  --query 'DBInstances[0].DBInstanceIdentifier' --output text --region "$REGION" 2>/dev/null || echo "None")

# DB subnet group
aws rds create-db-subnet-group --db-subnet-group-name "$PROJECT-db" \
  --db-subnet-group-description "Private subnets for $PROJECT" \
  --subnet-ids "${PRIVATE_SUBNET_IDS[@]}" \
  --region "$REGION" >/dev/null 2>&1 || true

if [ "$DB_EXISTS" = "None" ]; then
  aws rds create-db-instance \
    --db-instance-identifier "$PROJECT-db" \
    --engine postgres --engine-version "16" \
    --db-instance-class "$DB_INSTANCE_CLASS" \
    --allocated-storage "$DB_STORAGE" \
    --max-allocated-storage 40 \
    --storage-type gp3 \
    --storage-encrypted \
    --db-name "$DB_NAME" \
    --master-username "$DB_USERNAME" \
    --master-user-password "$DB_PASSWORD" \
    --db-subnet-group-name "$PROJECT-db" \
    --vpc-security-group-ids "$RDS_SG_ID" \
    --no-multi-az \
    --no-publicly-accessible \
    --backup-retention-period 7 \
    --enable-performance-insights \
    --performance-insights-retention-period 7 \
    --region "$REGION" >/dev/null
  echo "  Creating RDS instance (takes 5-10 min)..."
  echo "  Run: aws rds wait db-instance-available --db-instance-identifier $PROJECT-db --region $REGION"
else
  echo "  Exists RDS: $PROJECT-db"
fi

# ─── 6. CloudWatch Log Group ────────────────────────────────────
echo "=== CloudWatch Logs ==="

aws logs create-log-group --log-group-name "/ecs/$PROJECT" --region "$REGION" 2>/dev/null || true
aws logs put-retention-policy --log-group-name "/ecs/$PROJECT" --retention-in-days 14 --region "$REGION"
echo "  Log group: /ecs/$PROJECT (14-day retention)"

# ─── 7. Cloud Map (Service Discovery) ───────────────────────────
echo "=== Cloud Map ==="

NS_ID=$(aws servicediscovery list-namespaces \
  --filters "Name=NAME,Values=$PROJECT.local" \
  --query 'Namespaces[0].Id' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$NS_ID" = "None" ] || [ -z "$NS_ID" ]; then
  NS_ID=$(aws servicediscovery create-private-dns-namespace \
    --name "$PROJECT.local" --vpc "$VPC_ID" \
    --query 'OperationId' --output text --region "$REGION")
  # Wait for namespace creation
  echo "  Creating namespace $PROJECT.local..."
  sleep 10
  NS_ID=$(aws servicediscovery list-namespaces \
    --filters "Name=NAME,Values=$PROJECT.local" \
    --query 'Namespaces[0].Id' --output text --region "$REGION")
  echo "  Created namespace: $NS_ID"
else
  echo "  Exists namespace: $NS_ID"
fi

SVC_DISC_ID=$(aws servicediscovery list-services \
  --filters "Name=NAMESPACE_ID,Values=$NS_ID" \
  --query "Services[?Name=='$PROJECT'].Id | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$SVC_DISC_ID" = "None" ] || [ -z "$SVC_DISC_ID" ]; then
  SVC_DISC_ARN=$(aws servicediscovery create-service \
    --name "$PROJECT" --namespace-id "$NS_ID" \
    --dns-config "NamespaceId=$NS_ID,DnsRecords=[{Type=SRV,TTL=10}]" \
    --health-check-custom-config FailureThreshold=1 \
    --query 'Service.Arn' --output text --region "$REGION")
  SVC_DISC_ID=$(echo "$SVC_DISC_ARN" | grep -o '[^/]*$')
  echo "  Created service discovery: $SVC_DISC_ARN"
else
  SVC_DISC_ARN=$(aws servicediscovery get-service --id "$SVC_DISC_ID" \
    --query 'Service.Arn' --output text --region "$REGION")
  echo "  Exists service discovery: $SVC_DISC_ARN"
fi

# ─── 8. ECS ─────────────────────────────────────────────────────
echo "=== ECS ==="

# Cluster
aws ecs create-cluster --cluster-name "$PROJECT" \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy "capacityProvider=FARGATE_SPOT,weight=1,base=0" \
  --settings "name=containerInsights,value=disabled" \
  --region "$REGION" >/dev/null 2>&1 || true
echo "  Cluster: $PROJECT (Fargate Spot default)"

# SSM param keys expected by the task definition
SSM_KEYS=(
  NODE_ENV PORT
  GENGAR_DB_HOSTNAME GENGAR_DB_PORT GENGAR_DB_USERNAME GENGAR_DB_PASSWORD GENGAR_DB_NAME
  OPENAI_API_KEY ANTHROPIC_API_KEY GEMINI_API_KEY DEEPSEEK_API_KEY
  PERPLEXITY_API_KEY GROQ_API_KEY
  TAVILY_API_KEY EXA_API_KEY REPLICATE_API_TOKEN
  PROXYCURL_API_KEY APIFY_API_TOKEN
  GITHUB_CLIENT_ID GITHUB_CLIENT_SECRET GITHUB_CALLBACK_URL
  JWT_SECRET
  STRIPE_SECRET_KEY STRIPE_PRICE_ID
  FRONTEND_URL MEM0_API_KEY
  AWS_S3_BUCKET_NAME ROLLBAR_ACCESS_TOKEN
)

# Build secrets JSON for container definition
SECRETS_JSON="["
for KEY in "${SSM_KEYS[@]}"; do
  SECRETS_JSON+="{\"name\":\"$KEY\",\"valueFrom\":\"arn:aws:ssm:$REGION:$ACCOUNT_ID:parameter/$PROJECT/$KEY\"},"
done
SECRETS_JSON="${SECRETS_JSON%,}]"

# Task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
  --family "$PROJECT" \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu "$TASK_CPU" --memory "$TASK_MEMORY" \
  --execution-role-arn "$EXEC_ROLE_ARN" \
  --task-role-arn "$TASK_ROLE_ARN" \
  --runtime-platform "cpuArchitecture=ARM64,operatingSystemFamily=LINUX" \
  --container-definitions "[{
    \"name\":\"$PROJECT\",
    \"image\":\"$ECR_URI:latest\",
    \"portMappings\":[{\"containerPort\":$CONTAINER_PORT,\"protocol\":\"tcp\",\"name\":\"$PROJECT\"}],
    \"secrets\":$SECRETS_JSON,
    \"logConfiguration\":{
      \"logDriver\":\"awslogs\",
      \"options\":{
        \"awslogs-group\":\"/ecs/$PROJECT\",
        \"awslogs-region\":\"$REGION\",
        \"awslogs-stream-prefix\":\"ecs\"
      }
    },
    \"healthCheck\":{
      \"command\":[\"CMD-SHELL\",\"curl -f http://localhost:$CONTAINER_PORT/health || exit 1\"],
      \"interval\":30,\"timeout\":5,\"retries\":3,\"startPeriod\":60
    }
  }]" \
  --query 'taskDefinition.taskDefinitionArn' --output text --region "$REGION")

echo "  Task definition: $TASK_DEF_ARN"

# Service
SVC_EXISTS=$(aws ecs describe-services --cluster "$PROJECT" --services "$PROJECT" \
  --query 'services[?status==`ACTIVE`].serviceName | [0]' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$SVC_EXISTS" = "None" ] || [ -z "$SVC_EXISTS" ]; then
  aws ecs create-service \
    --cluster "$PROJECT" \
    --service-name "$PROJECT" \
    --task-definition "$PROJECT" \
    --desired-count 1 \
    --capacity-provider-strategy "capacityProvider=FARGATE_SPOT,weight=1" \
    --network-configuration "awsvpcConfiguration={subnets=[${PUBLIC_SUBNET_IDS[0]},${PUBLIC_SUBNET_IDS[1]}],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
    --service-registries "registryArn=$SVC_DISC_ARN,containerName=$PROJECT,containerPort=$CONTAINER_PORT" \
    --deployment-configuration "deploymentCircuitBreaker={enable=true,rollback=true}" \
    --region "$REGION" >/dev/null
  echo "  Created ECS service"
else
  echo "  Exists ECS service"
fi

# ─── 9. API Gateway HTTP API ────────────────────────────────────
echo "=== API Gateway ==="

APIGW_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='$PROJECT'].ApiId | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$APIGW_ID" = "None" ] || [ -z "$APIGW_ID" ]; then
  APIGW_ID=$(aws apigatewayv2 create-api --name "$PROJECT" \
    --protocol-type HTTP \
    --query 'ApiId' --output text --region "$REGION")
  echo "  Created API Gateway: $APIGW_ID"
else
  echo "  Exists API Gateway: $APIGW_ID"
fi

# VPC Link
VPCLINK_ID=$(aws apigatewayv2 get-vpc-links \
  --query "Items[?Name=='$PROJECT'].VpcLinkId | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$VPCLINK_ID" = "None" ] || [ -z "$VPCLINK_ID" ]; then
  VPCLINK_ID=$(aws apigatewayv2 create-vpc-link --name "$PROJECT" \
    --subnet-ids "${PUBLIC_SUBNET_IDS[@]}" \
    --security-group-ids "$ECS_SG_ID" \
    --query 'VpcLinkId' --output text --region "$REGION")
  echo "  Created VPC Link: $VPCLINK_ID (takes 1-2 min to become available)"
else
  echo "  Exists VPC Link: $VPCLINK_ID"
fi

# Integration
INTEGRATION_ID=$(aws apigatewayv2 get-integrations --api-id "$APIGW_ID" \
  --query 'Items[0].IntegrationId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$INTEGRATION_ID" = "None" ] || [ -z "$INTEGRATION_ID" ]; then
  INTEGRATION_ID=$(aws apigatewayv2 create-integration --api-id "$APIGW_ID" \
    --integration-type HTTP_PROXY \
    --integration-method ANY \
    --integration-uri "$SVC_DISC_ARN" \
    --connection-type VPC_LINK \
    --connection-id "$VPCLINK_ID" \
    --query 'IntegrationId' --output text --region "$REGION")
  echo "  Created integration: $INTEGRATION_ID"
else
  echo "  Exists integration: $INTEGRATION_ID"
fi

# Routes
for ROUTE_KEY in 'ANY /{proxy+}' 'ANY /'; do
  EXISTING_ROUTE=$(aws apigatewayv2 get-routes --api-id "$APIGW_ID" \
    --query "Items[?RouteKey=='$ROUTE_KEY'].RouteId | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")
  if [ "$EXISTING_ROUTE" = "None" ] || [ -z "$EXISTING_ROUTE" ]; then
    aws apigatewayv2 create-route --api-id "$APIGW_ID" \
      --route-key "$ROUTE_KEY" \
      --target "integrations/$INTEGRATION_ID" \
      --region "$REGION" >/dev/null
    echo "  Created route: $ROUTE_KEY"
  fi
done

# Default stage with auto-deploy
STAGE_EXISTS=$(aws apigatewayv2 get-stages --api-id "$APIGW_ID" \
  --query "Items[?StageName=='\$default'].StageName | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$STAGE_EXISTS" = "None" ] || [ -z "$STAGE_EXISTS" ]; then
  aws apigatewayv2 create-stage --api-id "$APIGW_ID" \
    --stage-name '$default' --auto-deploy \
    --region "$REGION" >/dev/null
  echo "  Created \$default stage"
fi

API_ENDPOINT=$(aws apigatewayv2 get-api --api-id "$APIGW_ID" \
  --query 'ApiEndpoint' --output text --region "$REGION")

# ─── 10. SSM Parameters (seed defaults) ─────────────────────────
echo "=== SSM Parameters ==="

# Wait for RDS to get endpoint (if it was just created)
RDS_ENDPOINT=$(aws rds describe-db-instances --db-instance-identifier "$PROJECT-db" \
  --query 'DBInstances[0].Endpoint.Address' --output text --region "$REGION" 2>/dev/null || echo "pending")

put_ssm() {
  aws ssm put-parameter --name "/$PROJECT/$1" --value "$2" \
    --type SecureString --overwrite --region "$REGION" >/dev/null 2>&1
}

# Seed DB connection params (only if RDS endpoint is ready)
if [ "$RDS_ENDPOINT" != "None" ] && [ "$RDS_ENDPOINT" != "pending" ] && [ -n "$RDS_ENDPOINT" ]; then
  put_ssm "GENGAR_DB_HOSTNAME" "$RDS_ENDPOINT"
  put_ssm "GENGAR_DB_PORT" "5432"
  put_ssm "GENGAR_DB_USERNAME" "$DB_USERNAME"
  put_ssm "GENGAR_DB_PASSWORD" "$DB_PASSWORD"
  put_ssm "GENGAR_DB_NAME" "$DB_NAME"
  echo "  Seeded DB connection params"
else
  echo "  RDS not ready yet — seed DB params after: aws rds wait db-instance-available --db-instance-identifier $PROJECT-db"
fi

put_ssm "NODE_ENV" "production"
put_ssm "PORT" "$CONTAINER_PORT"
echo "  Seeded NODE_ENV, PORT"
echo "  Populate remaining secrets: ./infra/put-secrets.sh"

# ─── Summary ─────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "  API Endpoint:    $API_ENDPOINT"
echo "  ECR:             $ECR_URI"
echo "  ECS Cluster:     $PROJECT"
echo "  ECS Service:     $PROJECT"
echo "  RDS:             $PROJECT-db"
echo "  GitHub Role ARN: $GH_ROLE_ARN"
echo ""
echo "  Public Subnets:  ${PUBLIC_SUBNET_IDS[*]}"
echo "  ECS Security Group: $ECS_SG_ID"
echo ""
echo "  Next steps:"
echo "  1. Wait for RDS: aws rds wait db-instance-available --db-instance-identifier $PROJECT-db --region $REGION"
echo "  2. Populate secrets: ./infra/put-secrets.sh"
echo "  3. Push Docker image: docker build -t $ECR_URI:latest gengar/ && docker push $ECR_URI:latest"
echo "  4. Set GitHub secrets: AWS_ROLE_ARN=$GH_ROLE_ARN"
echo "  5. Set GitHub secrets: ECS_SUBNET_IDS=${PUBLIC_SUBNET_IDS[0]},${PUBLIC_SUBNET_IDS[1]}"
echo "  6. Set GitHub secrets: ECS_SECURITY_GROUP_ID=$ECS_SG_ID"
