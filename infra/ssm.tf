# SSM Parameter Store is FREE (vs Secrets Manager at $0.40/secret/month)
# Populate these manually or via: terraform apply -var='app_env_vars={...}'

locals {
  # Default SSM parameters with placeholder values
  # Override with actual values via terraform.tfvars (gitignored)
  ssm_params = merge({
    NODE_ENV               = "production"
    PORT                   = tostring(var.container_port)
    GENGAR_DB_HOSTNAME     = aws_db_instance.main.address
    GENGAR_DB_PORT         = "5432"
    GENGAR_DB_USERNAME     = var.db_username
    GENGAR_DB_PASSWORD     = var.db_password
    GENGAR_DB_NAME         = var.db_name
  }, var.app_env_vars)
}

resource "aws_ssm_parameter" "app" {
  for_each = local.ssm_params

  name  = "/${var.project_name}/${each.key}"
  type  = "SecureString"
  value = each.value

  # Don't overwrite if someone updates via console/CLI
  lifecycle {
    ignore_changes = [value]
  }
}
