# AWS 3-Tier Deployment Guide: Event Booking App

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: VPC and Networking](#phase-1-vpc-and-networking)
4. [Phase 2: Security Groups](#phase-2-security-groups)
5. [Phase 3: RDS Database](#phase-3-rds-database)
6. [Phase 4: Docker & ECR](#phase-4-docker--ecr)
7. [Phase 5: IAM Roles](#phase-5-iam-roles)
8. [Phase 6: Application Load Balancer](#phase-6-application-load-balancer)
9. [Phase 7: Auto Scaling Group](#phase-7-auto-scaling-group)
10. [Phase 8: Frontend Deployment](#phase-8-frontend-deployment)
11. [Phase 9: Testing & Monitoring](#phase-9-testing--monitoring)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS VPC (10.0.0.0/16)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  TIER 1: Presentation Layer (Frontend)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ CloudFront/S3 (React Frontend) - Static files       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  TIER 2: Application Layer (Backend)                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Application Load Balancer (ALB)                      │   │
│  │ - Public Subnets (AZ1, AZ2)                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Auto Scaling Group (ASG) - Go Backend               │   │
│  │ - EC2 Instances in Private Subnets (AZ1, AZ2)      │   │
│  │ - Docker containers running Go API                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  TIER 3: Data Layer (Database)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Amazon RDS (MySQL/PostgreSQL)                       │   │
│  │ - Private Subnets (AZ1, AZ2)                        │   │
│  │ - Multi-AZ for High Availability                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Architecture Components

| Component              | Details                                |
| ---------------------- | -------------------------------------- |
| **Frontend**           | React 19 + Vite (S3 + CloudFront)      |
| **Backend**            | Go API (Docker containers)             |
| **Load Balancer**      | Application Load Balancer (ALB)        |
| **Compute**            | EC2 Auto Scaling Group (2-4 instances) |
| **Database**           | Amazon RDS (MySQL/PostgreSQL)          |
| **Subnets**            | 2 Public + 2 Private + 2 DB Private    |
| **Availability Zones** | Multi-AZ (us-east-1a, us-east-1b)      |

---

## Prerequisites

Before starting, ensure you have:

- ✅ AWS Account with appropriate IAM permissions
- ✅ AWS CLI installed and configured
- ✅ Docker installed locally
- ✅ Go 1.21+ installed
- ✅ Node.js 18+ installed
- ✅ Git configured
- ✅ An AWS Region selected (examples use `us-east-1`)

### Verify Prerequisites

```bash
# Check AWS CLI
aws --version
aws sts get-caller-identity

# Check Docker
docker --version

# Check Go
go version

# Check Node.js
node --version
npm --version
```

---

## Phase 1: VPC and Networking

### Step 1.1: Create VPC

1. Go to **AWS Console → VPC Dashboard**
2. Click **"Create VPC"**
3. Configure:
   - **Name**: `event-booking-vpc`
   - **IPv4 CIDR block**: `10.0.0.0/16`
   - **IPv6 CIDR block**: Leave empty
   - **Tenancy**: Default
   - Click **"Create VPC"**

**Expected Output**: VPC created with ID (e.g., `vpc-xxxxxx`)

### Step 1.2: Create Internet Gateway

1. In VPC Dashboard → **Internet Gateways**
2. Click **"Create Internet Gateway"**
3. Configure:
   - **Name**: `event-booking-igw`
   - Click **"Create Internet Gateway"**
4. Select the IGW → **Attach to VPC** → Select `event-booking-vpc`

**Expected Output**: IGW attached to VPC

### Step 1.3: Create Public Subnets (for ALB)

**Subnet 1 - AZ1:**

1. VPC Dashboard → **Subnets**
2. Click **"Create Subnet"**
3. Configure:
   - **VPC ID**: `event-booking-vpc`
   - **Subnet name**: `event-booking-public-1a`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 CIDR block**: `10.0.1.0/24`
   - Click **"Create Subnet"**

**Subnet 2 - AZ2:** 4. Click **"Create Subnet"** again:

- **Subnet name**: `event-booking-public-1b`
- **Availability Zone**: `us-east-1b`
- **IPv4 CIDR block**: `10.0.2.0/24`
- Click **"Create Subnet"**

**Expected Output**: 2 public subnets created

### Step 1.4: Create Private Subnets (for EC2)

**Private Subnet 1 - AZ1 (for EC2):**

1. Click **"Create Subnet"**
2. Configure:
   - **Subnet name**: `event-booking-private-1a`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 CIDR block**: `10.0.10.0/24`
   - Click **"Create Subnet"**

**Private Subnet 2 - AZ2 (for EC2):** 3. Click **"Create Subnet"**:

- **Subnet name**: `event-booking-private-1b`
- **Availability Zone**: `us-east-1b`
- **IPv4 CIDR block**: `10.0.11.0/24`
- Click **"Create Subnet"**

**Expected Output**: 2 private subnets created for EC2

### Step 1.5: Create Private Subnets (for RDS)

**Private DB Subnet 1 - AZ1:**

1. Click **"Create Subnet"**
2. Configure:
   - **Subnet name**: `event-booking-db-1a`
   - **Availability Zone**: `us-east-1a`
   - **IPv4 CIDR block**: `10.0.20.0/24`
   - Click **"Create Subnet"**

**Private DB Subnet 2 - AZ2:** 3. Click **"Create Subnet"**:

- **Subnet name**: `event-booking-db-1b`
- **Availability Zone**: `us-east-1b`
- **IPv4 CIDR block**: `10.0.21.0/24`
- Click **"Create Subnet"**

**Expected Output**: 2 DB subnets created

### Step 1.6: Create NAT Gateway

**Allocate Elastic IP:**

1. VPC Dashboard → **Elastic IPs**
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**

**Create NAT Gateway:** 4. VPC Dashboard → **NAT Gateways** 5. Click **"Create NAT Gateway"** 6. Configure:

- **Subnet**: `event-booking-public-1a` (place in public subnet)
- **Elastic IP allocation ID**: Select the one you just created
- Click **"Create NAT Gateway"**

**Expected Output**: NAT Gateway created with a public IP

### Step 1.7: Create Route Tables

**Public Route Table:**

1. VPC Dashboard → **Route Tables**
2. Click **"Create Route Table"**
3. Configure:
   - **Name**: `event-booking-public-rt`
   - **VPC**: `event-booking-vpc`
   - Click **"Create Route Table"**

4. Edit **Routes**:
   - Click **"Edit routes"**
   - Click **"Add route"**
     - **Destination**: `0.0.0.0/0`
     - **Target**: Internet Gateway → `event-booking-igw`
     - Click **"Save routes"**

5. Edit **Subnet associations**:
   - Click **"Edit subnet associations"**
   - Select: `event-booking-public-1a`, `event-booking-public-1b`
   - Click **"Save associations"**

**Private Route Table (for EC2):**

6. Click **"Create Route Table"**
7. Configure:
   - **Name**: `event-booking-private-rt`
   - **VPC**: `event-booking-vpc`

8. Edit **Routes**:
   - Click **"Edit routes"**
   - Click **"Add route"**
     - **Destination**: `0.0.0.0/0`
     - **Target**: NAT Gateway → select your NAT Gateway
     - Click **"Save routes"**

9. Edit **Subnet associations**:
   - Select: `event-booking-private-1a`, `event-booking-private-1b`
   - Click **"Save associations"**

**Private Route Table (for RDS):**

10. Click **"Create Route Table"**
11. Configure:
    - **Name**: `event-booking-db-rt`
    - **VPC**: `event-booking-vpc`
    - (No routes needed for RDS - it's internal only)

12. Edit **Subnet associations**:
    - Select: `event-booking-db-1a`, `event-booking-db-1b`
    - Click **"Save associations"**

**Expected Output**: 3 route tables created and associated

---

## Phase 2: Security Groups

### Step 2.1: Create ALB Security Group

1. EC2 Dashboard → **Security Groups**
2. Click **"Create Security Group"**
3. Configure:
   - **Name**: `event-booking-alb-sg`
   - **Description**: `Allow HTTP/HTTPS to ALB`
   - **VPC**: `event-booking-vpc`

4. Add **Inbound Rules**:
   - **Type**: HTTP | **Protocol**: TCP | **Port**: 80 | **Source**: `0.0.0.0/0` (IPv4)
   - **Type**: HTTPS | **Protocol**: TCP | **Port**: 443 | **Source**: `0.0.0.0/0` (IPv4)
   - Click **"Create Security Group"**

**Expected Output**: ALB Security Group created

### Step 2.2: Create EC2 Security Group (for backend)

1. Click **"Create Security Group"**
2. Configure:
   - **Name**: `event-booking-ec2-sg`
   - **Description**: `Allow traffic from ALB`
   - **VPC**: `event-booking-vpc`

3. Add **Inbound Rules**:
   - Rule 1:
     - **Type**: Custom TCP
     - **Protocol**: TCP
     - **Port**: 8080
     - **Source**: Security Group → `event-booking-alb-sg`
   - Rule 2:
     - **Type**: SSH
     - **Protocol**: TCP
     - **Port**: 22
     - **Source**: Your IP (e.g., `203.0.113.0/32`) or `0.0.0.0/0` for testing
   - Click **"Create Security Group"**

**Expected Output**: EC2 Security Group created

### Step 2.3: Create RDS Security Group

1. Click **"Create Security Group"**
2. Configure:
   - **Name**: `event-booking-rds-sg`
   - **Description**: `Allow traffic from EC2`
   - **VPC**: `event-booking-vpc`

3. Add **Inbound Rules**:
   - **Type**: MySQL/Aurora (or PostgreSQL based on your choice)
   - **Protocol**: TCP
   - **Port**: 3306 (MySQL) or 5432 (PostgreSQL)
   - **Source**: Security Group → `event-booking-ec2-sg`
   - Click **"Create Security Group"**

**Expected Output**: RDS Security Group created

---

## Phase 3: RDS Database

### Step 3.1: Create DB Subnet Group

1. RDS Dashboard → **Subnet Groups**
2. Click **"Create DB Subnet Group"**
3. Configure:
   - **Name**: `event-booking-db-subnet-group`
   - **Description**: `DB Subnet Group for Event Booking`
   - **VPC ID**: `event-booking-vpc`
   - **Availability Zones**: Select `us-east-1a`, `us-east-1b`
   - **Subnets**: Select `event-booking-db-1a`, `event-booking-db-1b`
   - Click **"Create"**

**Expected Output**: DB Subnet Group created

### Step 3.2: Create RDS Instance

1. RDS Dashboard → **Databases**
2. Click **"Create Database"**
3. Configure:
   - **Database creation method**: Standard create
   - **Engine options**: MySQL 8.0 (or PostgreSQL 15)
   - **Templates**: Production
   - **DB instance identifier**: `event-booking-db`
   - **Master username**: `admin`
   - **Master password**: Create a strong password and save it securely
   - **DB instance class**: `db.t3.micro` (free tier eligible)
   - **Storage type**: gp2
   - **Allocated storage**: 20 GB
   - **Storage autoscaling**: Enable with max 100 GB

4. **Connectivity**:
   - **VPC**: `event-booking-vpc`
   - **DB Subnet Group**: `event-booking-db-subnet-group`
   - **Public accessibility**: No
   - **VPC Security Group**: `event-booking-rds-sg`
   - **Availability zone**: `us-east-1a`

5. **Backup**:
   - **Backup retention period**: 7 days
   - **Backup window**: Default (UTC)
   - **Copy backups to another region**: No (optional)

6. Click **"Create Database"**

⏳ **Wait 5-10 minutes for RDS to be created**

### Step 3.3: Get RDS Endpoint & Create Database

1. Once created, go to your DB instance
2. Copy the **Endpoint** (e.g., `event-booking-db.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com`)
3. Connect to your RDS instance using MySQL client:

```bash
mysql -h event-booking-db.xxxxxxxxxxxxx.us-east-1.rds.amazonaws.com \
      -u admin \
      -p

# At the prompt, enter your password
```

4. Create the database and import your schema:

```sql
CREATE DATABASE eventbooking;
USE eventbooking;

-- Create users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create events table
CREATE TABLE events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  dateTime DATETIME NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create registrations table
CREATE TABLE registrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_registration (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create migration table
CREATE TABLE _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMP NULL,
  migration_name VARCHAR(255) NOT NULL,
  logs LONGTEXT,
  rolled_back_at TIMESTAMP NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_steps_count INT DEFAULT 0
);
```

**Expected Output**: Database and tables created

---

## Phase 4: Docker & ECR

### Step 4.1: Update Go Backend for RDS

Update your `db/db.go` file to read database credentials from environment variables:

```go
package db

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() error {
	dbHost := os.Getenv("DB_HOST")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbPort := os.Getenv("DB_PORT")

	if dbPort == "" {
		dbPort = "3306"
	}

	// Connection string for MySQL
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return err
	}

	// Test the connection
	err = db.Ping()
	if err != nil {
		return err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	DB = db
	return nil
}
```

### Step 4.2: Create Dockerfile

Create a `Dockerfile` in your project root:

```dockerfile
# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime stage
FROM alpine:latest

# Install ca-certificates for HTTPS
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]
```

### Step 4.3: Create .dockerignore

```
.git
.gitignore
.env
.env.example
node_modules
frontend/node_modules
frontend/dist
api-test
README.md
*.db
.DS_Store
```

### Step 4.4: Create ECR Repository

1. ECR Dashboard → **Repositories**
2. Click **"Create Repository"**
3. Configure:
   - **Repository name**: `event-booking-backend`
   - **Scan on push**: Enabled
   - **Encryption**: AES256
   - Click **"Create Repository"**

**Expected Output**: ECR repository URL (note it down)

### Step 4.5: Build and Push Docker Image

```bash
# Get your AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=us-east-1
ECR_REPO_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/event-booking-backend

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build the Docker image
docker build -t event-booking-backend:latest .

# Tag the image for ECR
docker tag event-booking-backend:latest $ECR_REPO_URI:latest
docker tag event-booking-backend:latest $ECR_REPO_URI:v1.0.0

# Push to ECR
docker push $ECR_REPO_URI:latest
docker push $ECR_REPO_URI:v1.0.0

# Verify
aws ecr describe-images --repository-name event-booking-backend --region $AWS_REGION
```

**Expected Output**: Docker image pushed to ECR

---

## Phase 5: IAM Roles

### Step 5.1: Create EC2 IAM Role

1. IAM Dashboard → **Roles**
2. Click **"Create Role"**
3. Configure:
   - **Trusted entity type**: AWS service
   - **Service**: EC2
   - Click **"Next"**

4. Add permissions:
   - Search for: `AmazonEC2ContainerRegistryReadOnly` → Check
   - Search for: `CloudWatchAgentServerPolicy` → Check
   - Search for: `AmazonSSMManagedInstanceCore` → Check (for Systems Manager access)
   - Click **"Next"**

5. Configure:
   - **Role name**: `event-booking-ec2-role`
   - **Description**: EC2 role for Event Booking application
   - Click **"Create Role"**

6. Note the **Role ARN**: `arn:aws:iam::ACCOUNT-ID:role/event-booking-ec2-role`

**Expected Output**: IAM role created

### Step 5.2: Create Instance Profile

The instance profile is automatically created with the role. You can verify it in the role details.

---

## Phase 6: Application Load Balancer

### Step 6.1: Create ALB

1. EC2 Dashboard → **Load Balancers**
2. Click **"Create Load Balancer"** → **Application Load Balancer**
3. Configure:
   - **Name**: `event-booking-alb`
   - **Scheme**: Internet-facing
   - **IP address type**: IPv4

4. **Network mapping**:
   - **VPC**: `event-booking-vpc`
   - **Subnets**:
     - Select `event-booking-public-1a`
     - Select `event-booking-public-1b`
   - Click **"Next"**

5. **Security groups**:
   - Remove default security group
   - Select: `event-booking-alb-sg`
   - Click **"Next"**

### Step 6.2: Create Target Group

1. Click **"Create Target Group"**:
   - **Name**: `event-booking-backend-tg`
   - **Protocol**: HTTP
   - **Port**: 8080
   - **VPC**: `event-booking-vpc`
   - Click **"Next"**

2. **Health checks**:
   - **Health check protocol**: HTTP
   - **Health check path**: `/events`
   - **Health check interval**: 30 seconds
   - **Healthy threshold**: 2
   - **Unhealthy threshold**: 3
   - **Timeout**: 5 seconds
   - Click **"Create Target Group"**

**Expected Output**: Target group created

### Step 6.3: Configure ALB Listener

1. Back in ALB creation:
   - **Default target group**: Select `event-booking-backend-tg`
   - Click **"Create Load Balancer"**

⏳ **Wait 2-3 minutes for ALB to be created**

### Step 6.4: Get ALB DNS Name

1. Once created, go to **Load Balancers**
2. Select `event-booking-alb`
3. Copy the **DNS name** (e.g., `event-booking-alb-1234567890.us-east-1.elb.amazonaws.com`)

**Expected Output**: ALB created with public DNS name

---

## Phase 7: Auto Scaling Group

### Step 7.1: Create Launch Template

1. EC2 Dashboard → **Launch Templates**
2. Click **"Create Launch Template"**
3. Configure:
   - **Launch template name**: `event-booking-template`
   - **Description**: Template for Event Booking EC2 instances
   - **Auto Scaling guidance**: Check

4. **Application and OS Images**:
   - **Quick Start**: Amazon Linux
   - **AMI**: Amazon Linux 2 (or Ubuntu 22.04)
   - **Instance type**: `t3.small` (1 vCPU, 2GB RAM)

5. **Key pair**:
   - Click **"Create new key pair"**
   - **Name**: `event-booking-key`
   - **Key pair type**: RSA
   - **Private key format**: .pem
   - Download and save the `.pem` file securely

6. **Network settings**:
   - **Security groups**: `event-booking-ec2-sg`
   - **Subnet**: Don't specify (ASG will handle this)

7. **IAM instance profile**:
   - Select: `event-booking-ec2-role`

8. **User data** (copy the entire script):

```bash
#!/bin/bash
set -e

# Enable logging
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting user data script..."

# Update system
yum update -y

# Install Docker
amazon-linux-extras install docker -y

# Start Docker service
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws

# Install CloudWatch agent (optional)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
rpm -U ./amazon-cloudwatch-agent.rpm

# Create environment file
cat > /home/ec2-user/.env << 'ENVFILE'
DB_HOST=event-booking-db.xxxxx.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=YOUR_RDS_PASSWORD
DB_NAME=eventbooking
DB_PORT=3306
SECRET_KEY=YOUR_JWT_SECRET_KEY
ENVFILE

# Fix permissions
chown ec2-user:ec2-user /home/ec2-user/.env
chmod 600 /home/ec2-user/.env

# Login to ECR
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Pull and run Docker container
docker run -d \
  --name event-booking \
  --restart always \
  -p 8080:8080 \
  --env-file /home/ec2-user/.env \
  -e "DB_HOST=event-booking-db.xxxxx.us-east-1.rds.amazonaws.com" \
  -e "DB_USER=admin" \
  -e "DB_PASSWORD=YOUR_RDS_PASSWORD" \
  -e "DB_NAME=eventbooking" \
  -e "DB_PORT=3306" \
  -e "SECRET_KEY=YOUR_JWT_SECRET_KEY" \
  $AWS_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/event-booking-backend:latest

echo "User data script completed successfully"
```

**⚠️ Replace the following placeholders:**

- `event-booking-db.xxxxx.us-east-1.rds.amazonaws.com` → Your actual RDS endpoint
- `YOUR_RDS_PASSWORD` → Your RDS master password
- `YOUR_JWT_SECRET_KEY` → A strong random key for JWT

9. Click **"Create Launch Template"**

**Expected Output**: Launch template created

### Step 7.2: Create Auto Scaling Group

1. EC2 Dashboard → **Auto Scaling Groups**
2. Click **"Create Auto Scaling Group"**
3. Configure:
   - **Name**: `event-booking-asg`
   - **Launch template**: `event-booking-template`
   - Click **"Next"**

4. **Network**:
   - **VPC**: `event-booking-vpc`
   - **Subnets**:
     - Select `event-booking-private-1a`
     - Select `event-booking-private-1b`
   - Click **"Next"**

5. **Load balancing**:
   - **Attach to an existing load balancer**: Yes
   - **Choose from your existing load balancer target groups**: `event-booking-backend-tg`
   - **Health check type**: ELB
   - **Health check grace period**: 300 seconds
   - Click **"Next"**

6. **Group size and scaling**:
   - **Desired capacity**: 2
   - **Minimum capacity**: 2
   - **Maximum capacity**: 4
   - Click **"Next"**

7. **Add notifications** (optional):
   - Skip for now
   - Click **"Create Auto Scaling Group"**

⏳ **Wait 5-10 minutes for EC2 instances to launch and become healthy**

### Step 7.3: Verify ASG Status

```bash
# Check ASG instances
aws autoscaling describe-auto-scaling-instances \
  --auto-scaling-group-names event-booking-asg \
  --region us-east-1

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT-ID:targetgroup/event-booking-backend-tg/xxxxx \
  --region us-east-1
```

**Expected Output**: 2 healthy instances running

---

## Phase 8: Frontend Deployment

### Step 8.1: Build React Frontend

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# This creates a 'dist' folder with optimized files
ls -la dist/
```

### Step 8.2: Create S3 Bucket for Frontend

1. S3 Dashboard → **Create Bucket**
2. Configure:
   - **Bucket name**: `event-booking-frontend-$(date +%s)` (must be globally unique)
   - **AWS Region**: `us-east-1`
   - **Unblock all public access**: Uncheck "Block public access"
   - Click **"Create Bucket"**

**Expected Output**: S3 bucket created

### Step 8.3: Upload Frontend Files

```bash
# Set bucket name
BUCKET_NAME="event-booking-frontend-123456"
AWS_REGION="us-east-1"

# Upload files from dist directory
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ \
  --region $AWS_REGION \
  --delete

# Set public read permission on all objects
aws s3api put-bucket-policy --bucket $BUCKET_NAME \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::'$BUCKET_NAME'/*"
      }
    ]
  }' \
  --region $AWS_REGION
```

### Step 8.4: Enable S3 Static Website Hosting

1. S3 Bucket → **Properties**
2. Scroll to **Static website hosting**
3. Click **"Edit"**
4. Configure:
   - **Static website hosting**: Enable
   - **Hosting type**: Host a static website
   - **Index document**: `index.html`
   - **Error document**: `index.html`
   - Click **"Save changes"**

5. Note the **Website endpoint** (e.g., `http://event-booking-frontend-123456.s3-website-us-east-1.amazonaws.com`)

### Step 8.5: Create CloudFront Distribution (Recommended)

1. CloudFront Dashboard → **Create Distribution**
2. Configure:
   - **Origin domain**: Your S3 bucket website endpoint
   - **Origin access**: Create origin access policy
   - **Viewer protocol policy**: Redirect HTTP to HTTPS

3. **Default cache behavior**:
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Caching policy**: CachingOptimized

4. **Distribution settings**:
   - **Default root object**: `index.html`
   - Click **"Create distribution"**

⏳ **Wait 5-10 minutes for CloudFront to be deployed**

**Expected Output**: CloudFront distribution URL (e.g., `d123456.cloudfront.net`)

---

## Phase 9: Testing & Monitoring

### Step 9.1: Update Frontend API URL

Update your React frontend `.env` file (or in the code):

```javascript
// In frontend/src/App.jsx, update apiBase:
const apiBase = "http://YOUR-ALB-DNS.us-east-1.elb.amazonaws.com";
// Or use environment variable:
// const apiBase = import.meta.env.VITE_API_URL || "http://YOUR-ALB-DNS.us-east-1.elb.amazonaws.com";
```

### Step 9.2: Test the Deployment

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names event-booking-alb \
  --region us-east-1 \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "ALB DNS: $ALB_DNS"

# Test backend health
curl http://$ALB_DNS/events

# Test signup
curl -X POST http://$ALB_DNS/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'

# Test login
curl -X POST http://$ALB_DNS/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Step 9.3: Set Up CloudWatch Monitoring

1. CloudWatch Dashboard → **Create Dashboard**
2. Click **"Create Dashboard"**
3. Name: `event-booking-monitoring`

4. Add widgets for:
   - **ALB Request Count**: Load Balancer → Request Count
   - **ALB Target Health**: Load Balancer → Healthy Host Count
   - **ASG Group Desired**: Auto Scaling → Group Desired Capacity
   - **RDS CPU**: RDS → CPUUtilization
   - **RDS Database Connections**: RDS → DatabaseConnections
   - **EC2 CPU**: EC2 → CPUUtilization

5. Click **"Create dashboard"**

### Step 9.4: Create CloudWatch Alarms

**High RDS CPU:**

1. CloudWatch → **Alarms** → **Create Alarm**
2. Configure:
   - **Metric**: RDS → CPUUtilization
   - **DB Instance**: event-booking-db
   - **Statistic**: Average
   - **Period**: 5 minutes
   - **Threshold**: Greater than 80%
   - **Actions**: Send SNS notification (create SNS topic first)

**ALB Unhealthy Targets:** 3. Create another alarm:

- **Metric**: ELB → UnHealthyHostCount
- **Threshold**: Greater than 0
- **Actions**: Send SNS notification

### Step 9.5: Enable RDS Enhanced Monitoring

1. RDS → Databases → `event-booking-db`
2. Click **"Modify"**
3. Under **Monitoring**:
   - **Enable Enhanced monitoring**: Yes
   - **Monitoring role**: Create new role
   - **Granularity**: 60 seconds
   - Click **"Apply immediately"**

---

## Troubleshooting Guide

### EC2 Instances Not Healthy

**Check instance logs:**

```bash
# SSH into instance
ssh -i event-booking-key.pem ec2-user@INSTANCE_IP

# Check Docker container status
docker ps
docker logs event-booking

# Check user data logs
cat /var/log/user-data.log

# Check if port 8080 is listening
netstat -tlnp | grep 8080
```

### ALB Health Check Failing

1. Ensure Go backend is responding on port 8080
2. Check security group rules allow traffic from ALB
3. Verify `/events` endpoint is accessible
4. Check RDS connectivity from EC2

### RDS Connection Issues

```bash
# From EC2 instance, test RDS connection
mysql -h event-booking-db.xxxxx.us-east-1.rds.amazonaws.com \
      -u admin \
      -p \
      -D eventbooking

# Check security group rules
aws ec2 describe-security-groups --group-ids sg-xxxxx
```

### Frontend Not Loading

1. Verify S3 bucket has public read permissions
2. Check CloudFront cache settings
3. Ensure CORS is properly configured on ALB

---

## Cost Optimization Tips

- Use **t3.micro** instances for testing (free tier eligible)
- Enable **RDS autoscaling** for storage
- Use **S3 Intelligent-Tiering** for frontend storage
- Set **CloudFront cache TTL** appropriately
- Monitor and delete unused resources
- Use **AWS Cost Explorer** to track spending

---

## Cleanup (Destroy Resources)

When you're done testing, clean up in this order:

```bash
# 1. Delete ASG (this deletes EC2 instances)
aws autoscaling delete-auto-scaling-group \
  --auto-scaling-group-name event-booking-asg \
  --force-delete \
  --region us-east-1

# 2. Delete ALB
aws elbv2 delete-load-balancer \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT-ID:loadbalancer/app/event-booking-alb/xxxxx \
  --region us-east-1

# 3. Delete target group
aws elbv2 delete-target-group \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT-ID:targetgroup/event-booking-backend-tg/xxxxx \
  --region us-east-1

# 4. Delete RDS instance
aws rds delete-db-instance \
  --db-instance-identifier event-booking-db \
  --skip-final-snapshot \
  --region us-east-1

# 5. Delete NAT Gateway
aws ec2 delete-nat-gateway \
  --nat-gateway-id nat-xxxxx \
  --region us-east-1

# 6. Release Elastic IP
aws ec2 release-address \
  --allocation-id eipalloc-xxxxx \
  --region us-east-1

# 7. Delete VPC (this deletes all subnets and route tables)
aws ec2 delete-vpc \
  --vpc-id vpc-xxxxx \
  --region us-east-1

# 8. Delete ECR repository
aws ecr delete-repository \
  --repository-name event-booking-backend \
  --force \
  --region us-east-1

# 9. Delete S3 bucket
aws s3 rb s3://event-booking-frontend-123456 --force \
  --region us-east-1

# 10. Delete CloudFront distribution (requires disabling first)
aws cloudfront delete-distribution \
  --id xxxxx \
  --region us-east-1
```

---

## Additional Resources

- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/)
- [AWS Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/)
- [AWS ECR Documentation](https://docs.aws.amazon.com/ecr/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

---

## Summary

| Phase           | Components                          | Time            |
| --------------- | ----------------------------------- | --------------- |
| VPC Setup       | VPC, Subnets, IGW, NAT, Routes      | 15 min          |
| Security Groups | 3 Security Groups                   | 5 min           |
| RDS Setup       | DB Subnet Group, RDS Instance       | 15 min          |
| Docker & ECR    | Dockerfile, ECR Repo, Push Image    | 20 min          |
| IAM             | EC2 Role, Instance Profile          | 5 min           |
| ALB             | Load Balancer, Target Group         | 10 min          |
| ASG             | Launch Template, Auto Scaling Group | 15 min          |
| Frontend        | S3, CloudFront                      | 10 min          |
| **Total**       | **Complete 3-Tier Stack**           | **~95 minutes** |

---

**Last Updated**: February 4, 2026

**Contact**: For issues or questions, refer to AWS documentation or contact your cloud administrator.
