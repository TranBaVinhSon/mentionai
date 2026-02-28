resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = 14 # Keep logs 14 days to save cost
}

resource "aws_ecs_cluster" "main" {
  name = var.project_name

  setting {
    name  = "containerInsights"
    value = "disabled" # Save cost; enable if debugging needed
  }
}

# Use Fargate Spot as default capacity (up to 70% cheaper)
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
    base              = 0
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = var.project_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  # ARM64 (Graviton) — ~20% cheaper than x86
  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([{
    name  = var.project_name
    image = "${aws_ecr_repository.app.repository_url}:latest"

    portMappings = [{
      containerPort = var.container_port
      protocol      = "tcp"
      name          = var.project_name
    }]

    # Env vars injected from SSM Parameter Store
    secrets = [
      for key in [
        "NODE_ENV", "PORT",
        "GENGAR_DB_HOSTNAME", "GENGAR_DB_PORT", "GENGAR_DB_USERNAME",
        "GENGAR_DB_PASSWORD", "GENGAR_DB_NAME",
        "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY", "DEEPSEEK_API_KEY",
        "PERPLEXITY_API_KEY", "GROQ_API_KEY",
        "TAVILY_API_KEY", "EXA_API_KEY", "REPLICATE_API_TOKEN",
        "PROXYCURL_API_KEY", "APIFY_API_TOKEN",
        "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_CALLBACK_URL",
        "JWT_SECRET",
        "STRIPE_SECRET_KEY", "STRIPE_PRICE_ID",
        "FRONTEND_URL", "MEM0_API_KEY",
        "AWS_S3_BUCKET_NAME",
        "ROLLBAR_ACCESS_TOKEN",
      ] : {
        name      = key
        valueFrom = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.project_name}/${key}"
      }
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.app.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.container_port}/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])
}

data "aws_caller_identity" "current" {}

resource "aws_ecs_service" "app" {
  name            = var.project_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 1
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true # Public subnet — no NAT Gateway needed
  }

  # Register with Cloud Map for API Gateway service discovery
  service_registries {
    registry_arn   = aws_service_discovery_service.app.arn
    container_name = var.project_name
    container_port = var.container_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  # Allow external changes to task definition (CI/CD updates it)
  lifecycle {
    ignore_changes = [task_definition]
  }
}
