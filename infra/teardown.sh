#!/usr/bin/env bash
#
# Tear down all AWS infrastructure created by setup.sh.
# Prompts for confirmation before each destructive step.
#
# Usage: ./infra/teardown.sh
#
set -euo pipefail

PROJECT="gengar"
REGION="${AWS_REGION:-us-west-2}"

confirm() {
  read -rp "  Delete $1? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

echo "=== Teardown $PROJECT in $REGION ==="
echo ""

# 1. ECS Service
echo "--- ECS Service ---"
if confirm "ECS service $PROJECT"; then
  aws ecs update-service --cluster "$PROJECT" --service "$PROJECT" --desired-count 0 --region "$REGION" >/dev/null 2>&1 || true
  aws ecs delete-service --cluster "$PROJECT" --service "$PROJECT" --force --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 2. ECS Cluster
echo "--- ECS Cluster ---"
if confirm "ECS cluster $PROJECT"; then
  aws ecs delete-cluster --cluster "$PROJECT" --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 3. API Gateway
echo "--- API Gateway ---"
APIGW_ID=$(aws apigatewayv2 get-apis \
  --query "Items[?Name=='$PROJECT'].ApiId | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")
if [ "$APIGW_ID" != "None" ] && [ -n "$APIGW_ID" ] && confirm "API Gateway $APIGW_ID"; then
  aws apigatewayv2 delete-api --api-id "$APIGW_ID" --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 4. VPC Link
echo "--- VPC Link ---"
VPCLINK_ID=$(aws apigatewayv2 get-vpc-links \
  --query "Items[?Name=='$PROJECT'].VpcLinkId | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")
if [ "$VPCLINK_ID" != "None" ] && [ -n "$VPCLINK_ID" ] && confirm "VPC Link $VPCLINK_ID"; then
  aws apigatewayv2 delete-vpc-link --vpc-link-id "$VPCLINK_ID" --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 5. Cloud Map
echo "--- Cloud Map ---"
NS_ID=$(aws servicediscovery list-namespaces \
  --filters "Name=NAME,Values=$PROJECT.local" \
  --query 'Namespaces[0].Id' --output text --region "$REGION" 2>/dev/null || echo "None")
if [ "$NS_ID" != "None" ] && [ -n "$NS_ID" ] && confirm "Cloud Map namespace $PROJECT.local"; then
  SVC_ID=$(aws servicediscovery list-services \
    --filters "Name=NAMESPACE_ID,Values=$NS_ID" \
    --query "Services[?Name=='$PROJECT'].Id | [0]" --output text --region "$REGION" 2>/dev/null || echo "None")
  if [ "$SVC_ID" != "None" ] && [ -n "$SVC_ID" ]; then
    aws servicediscovery delete-service --id "$SVC_ID" --region "$REGION" >/dev/null 2>&1 || true
  fi
  aws servicediscovery delete-namespace --id "$NS_ID" --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 6. RDS
echo "--- RDS ---"
if confirm "RDS instance $PROJECT-db (will create final snapshot)"; then
  aws rds delete-db-instance --db-instance-identifier "$PROJECT-db" \
    --final-db-snapshot-identifier "$PROJECT-db-final-$(date +%s)" \
    --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleting (takes a few minutes)..."
fi

# 7. ECR
echo "--- ECR ---"
if confirm "ECR repository $PROJECT (all images)"; then
  aws ecr delete-repository --repository-name "$PROJECT" --force --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 8. CloudWatch Logs
echo "--- CloudWatch Logs ---"
if confirm "Log group /ecs/$PROJECT"; then
  aws logs delete-log-group --log-group-name "/ecs/$PROJECT" --region "$REGION" >/dev/null 2>&1 || true
  echo "  Deleted"
fi

# 9. SSM Parameters
echo "--- SSM Parameters ---"
if confirm "All SSM parameters under /$PROJECT/"; then
  PARAMS=$(aws ssm get-parameters-by-path --path "/$PROJECT/" --recursive \
    --query 'Parameters[].Name' --output text --region "$REGION" 2>/dev/null || echo "")
  for P in $PARAMS; do
    aws ssm delete-parameter --name "$P" --region "$REGION" >/dev/null 2>&1 || true
  done
  echo "  Deleted"
fi

# 10. IAM Roles
echo "--- IAM Roles ---"
for ROLE in "$PROJECT-ecs-execution" "$PROJECT-ecs-task" "$PROJECT-github-actions"; do
  if confirm "IAM role $ROLE"; then
    # Detach managed policies
    for POLICY_ARN in $(aws iam list-attached-role-policies --role-name "$ROLE" \
      --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null || echo ""); do
      aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$POLICY_ARN" 2>/dev/null || true
    done
    # Delete inline policies
    for POLICY_NAME in $(aws iam list-role-policies --role-name "$ROLE" \
      --query 'PolicyNames[]' --output text 2>/dev/null || echo ""); do
      aws iam delete-role-policy --role-name "$ROLE" --policy-name "$POLICY_NAME" 2>/dev/null || true
    done
    aws iam delete-role --role-name "$ROLE" 2>/dev/null || true
    echo "  Deleted $ROLE"
  fi
done

# 11. Security Groups
echo "--- Security Groups ---"
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$PROJECT-vpc" \
  --query 'Vpcs[0].VpcId' --output text --region "$REGION" 2>/dev/null || echo "None")

if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
  for SG_NAME in "$PROJECT-rds" "$PROJECT-ecs"; do
    SG_ID=$(aws ec2 describe-security-groups \
      --filters "Name=group-name,Values=$SG_NAME" "Name=vpc-id,Values=$VPC_ID" \
      --query 'SecurityGroups[0].GroupId' --output text --region "$REGION" 2>/dev/null || echo "None")
    if [ "$SG_ID" != "None" ] && [ -n "$SG_ID" ] && confirm "Security group $SG_NAME ($SG_ID)"; then
      aws ec2 delete-security-group --group-id "$SG_ID" --region "$REGION" 2>/dev/null || true
      echo "  Deleted $SG_NAME"
    fi
  done
fi

# 12. VPC (subnets, route tables, IGW)
echo "--- VPC ---"
if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ] && confirm "VPC $VPC_ID and all subnets"; then
  # Delete subnets
  for SUB_ID in $(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" \
    --query 'Subnets[].SubnetId' --output text --region "$REGION" 2>/dev/null || echo ""); do
    aws ec2 delete-subnet --subnet-id "$SUB_ID" --region "$REGION" 2>/dev/null || true
  done
  # Delete route table associations and tables (non-main)
  for RTB_ID in $(aws ec2 describe-route-tables \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=tag:Name,Values=$PROJECT-*" \
    --query 'RouteTables[].RouteTableId' --output text --region "$REGION" 2>/dev/null || echo ""); do
    for ASSOC_ID in $(aws ec2 describe-route-tables --route-table-ids "$RTB_ID" \
      --query 'RouteTables[0].Associations[?!Main].RouteTableAssociationId' --output text --region "$REGION" 2>/dev/null || echo ""); do
      aws ec2 disassociate-route-table --association-id "$ASSOC_ID" --region "$REGION" 2>/dev/null || true
    done
    aws ec2 delete-route-table --route-table-id "$RTB_ID" --region "$REGION" 2>/dev/null || true
  done
  # Detach and delete IGW
  IGW_ID=$(aws ec2 describe-internet-gateways \
    --filters "Name=attachment.vpc-id,Values=$VPC_ID" \
    --query 'InternetGateways[0].InternetGatewayId' --output text --region "$REGION" 2>/dev/null || echo "None")
  if [ "$IGW_ID" != "None" ] && [ -n "$IGW_ID" ]; then
    aws ec2 detach-internet-gateway --internet-gateway-id "$IGW_ID" --vpc-id "$VPC_ID" --region "$REGION" 2>/dev/null || true
    aws ec2 delete-internet-gateway --internet-gateway-id "$IGW_ID" --region "$REGION" 2>/dev/null || true
  fi
  # Delete DB subnet group
  aws rds delete-db-subnet-group --db-subnet-group-name "$PROJECT-db" --region "$REGION" 2>/dev/null || true
  # Delete VPC
  aws ec2 delete-vpc --vpc-id "$VPC_ID" --region "$REGION" 2>/dev/null || true
  echo "  Deleted VPC and all networking"
fi

echo ""
echo "Teardown complete."
