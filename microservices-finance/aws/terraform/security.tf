# Security Groups for AWS Infrastructure

# ALB Security Group
resource "aws_security_group" "alb_sg" {
  name        = "finance-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.finance_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "finance-alb-sg"
  }
}

# ECS Security Group
resource "aws_security_group" "ecs_sg" {
  name        = "finance-ecs-sg"
  description = "Security group for ECS services"
  vpc_id      = aws_vpc.finance_vpc.id

  ingress {
    from_port       = 8080
    to_port         = 8090
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "finance-ecs-sg"
  }
}

# RDS Security Group
resource "aws_security_group" "rds_sg" {
  name        = "finance-rds-sg"
  description = "Security group for RDS database"
  vpc_id      = aws_vpc.finance_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  tags = {
    Name = "finance-rds-sg"
  }
}

# Redis Security Group
resource "aws_security_group" "redis_sg" {
  name        = "finance-redis-sg"
  description = "Security group for Redis cache"
  vpc_id      = aws_vpc.finance_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_sg.id]
  }

  tags = {
    Name = "finance-redis-sg"
  }
}

# DB Subnet Group
resource "aws_db_subnet_group" "finance_db_subnet_group" {
  name       = "finance-db-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]

  tags = {
    Name = "finance-db-subnet-group"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "finance_igw" {
  vpc_id = aws_vpc.finance_vpc.id

  tags = {
    Name = "finance-igw"
  }
}

# NAT Gateway
resource "aws_eip" "nat_eip" {
  vpc = true
  
  tags = {
    Name = "finance-nat-eip"
  }
}

resource "aws_nat_gateway" "finance_nat" {
  allocation_id = aws_eip.nat_eip.id
  subnet_id     = aws_subnet.public_subnet_1.id

  tags = {
    Name = "finance-nat-gateway"
  }

  depends_on = [aws_internet_gateway.finance_igw]
}

# Route Tables
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.finance_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.finance_igw.id
  }

  tags = {
    Name = "finance-public-rt"
  }
}

resource "aws_route_table" "private_rt" {
  vpc_id = aws_vpc.finance_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.finance_nat.id
  }

  tags = {
    Name = "finance-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public_subnet_1_rta" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "public_subnet_2_rta" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_rt.id
}

resource "aws_route_table_association" "private_subnet_1_rta" {
  subnet_id      = aws_route_table.private_rt.id
  route_table_id = aws_route_table.private_rt.id
}

resource "aws_route_table_association" "private_subnet_2_rta" {
  subnet_id      = aws_subnet.private_subnet_2.id
  route_table_id = aws_route_table.private_rt.id
}
