variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "gengar"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

# ECS
variable "cpu" {
  description = "Fargate task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 512
}

variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 1
}

# RDS
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "gengar"
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "gengar"
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# App env vars stored in SSM
variable "app_env_vars" {
  description = "Application environment variables to store in SSM Parameter Store"
  type        = map(string)
  default     = {}
  sensitive   = true
}
