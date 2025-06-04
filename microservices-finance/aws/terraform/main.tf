# AWS Migration Configuration
# Configuration for migrating microservices to AWS

# API Gateway Configuration for AWS
resource "aws_api_gateway_rest_api" "finance_microservices" {
  name        = "finance-microservices"
  description = "API Gateway for Finance Microservices"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Environment = "production"
    Project     = "finance-microservices"
  }
}

# VPC Configuration
resource "aws_vpc" "finance_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "finance-microservices-vpc"
  }
}

# Subnets
resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.finance_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-west-2a"

  tags = {
    Name = "finance-private-subnet-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.finance_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-west-2b"

  tags = {
    Name = "finance-private-subnet-2"
  }
}

resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.finance_vpc.id
  cidr_block              = "10.0.10.0/24"
  availability_zone       = "us-west-2a"
  map_public_ip_on_launch = true

  tags = {
    Name = "finance-public-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.finance_vpc.id
  cidr_block              = "10.0.11.0/24"
  availability_zone       = "us-west-2b"
  map_public_ip_on_launch = true

  tags = {
    Name = "finance-public-subnet-2"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "finance_cluster" {
  name = "finance-microservices"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "finance-microservices-cluster"
  }
}

# Application Load Balancer
resource "aws_lb" "finance_alb" {
  name               = "finance-microservices-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = false

  tags = {
    Name = "finance-microservices-alb"
  }
}

# RDS Instance for MongoDB Alternative
resource "aws_db_instance" "finance_db" {
  identifier     = "finance-microservices-db"
  engine         = "postgres"
  engine_version = "13.7"
  instance_class = "db.t3.micro"
  allocated_storage = 20

  db_name  = "finance"
  username = "financeuser"
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.finance_db_subnet_group.name

  backup_retention_period = 7
  multi_az               = false
  storage_encrypted      = true

  skip_final_snapshot = true

  tags = {
    Name = "finance-microservices-db"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_subnet_group" "finance_cache_subnet_group" {
  name       = "finance-cache-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
}

resource "aws_elasticache_cluster" "finance_redis" {
  cluster_id           = "finance-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis6.x"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.finance_cache_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]

  tags = {
    Name = "finance-microservices-redis"
  }
}

# ECS Task Definitions and Services would be defined here
# This is a basic structure for AWS migration
