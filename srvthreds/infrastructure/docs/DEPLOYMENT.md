# SrvThreds Deployment Guide

Complete guide for deploying SrvThreds across development and production environments using Kubernetes, Docker, and Terraform.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Quick Start with Docker Compose](#quick-start-with-docker-compose)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Multi-Platform Docker Builds](#multi-platform-docker-builds)
- [Environment Configuration](#environment-configuration)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

SrvThreds uses a cloud-native, Kubernetes-first deployment strategy with:

- **Development**: Minikube with local services (MongoDB, Redis, RabbitMQ)
- **Production**: Cloud Kubernetes (EKS) with managed services (Atlas, Redis Cloud, CloudAMQP)
- **Infrastructure as Code**: Terraform for cloud resources
- **Multi-platform**: Docker images for AMD64 and ARM64 architectures

## Prerequisites

### Docker Compose (Simple Setup)
- [Docker](https://docs.docker.com/get-docker/) with Docker Compose
- Node.js 20+ and npm (for local development)

### Kubernetes Development
- [Docker](https://docs.docker.com/get-docker/) with BuildX support
- [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Kustomize](https://kustomize.io/) (included in kubectl 1.14+)
- Node.js 20+ and npm

### Production
- All development prerequisites
- [Terraform](https://terraform.io/downloads) >= 1.0
- [AWS CLI](https://aws.amazon.com/cli/) configured
- MongoDB Atlas account
- Container registry access (GHCR, ECR, Docker Hub)

## Architecture

### Component Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Development   │    │   Production    │    │   Multi-Platform│
│   (Minikube)    │    │   (Cloud)       │    │   (Docker)      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • Local MongoDB │    │ • MongoDB Atlas │    │ • linux/amd64   │
│ • Local Redis   │    │ • Redis Cloud   │    │ • linux/arm64   │
│ • Local RabbitMQ│    │ • CloudAMQP     │    │ • Auto-detection│
│ • Port-forward  │    │ • Load Balancer │    │ • Registry push │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Service Architecture

```
┌──────────────────┐
│   Load Balancer  │
└────────┬─────────┘
         │
    ┌────▼────┐    ┌─────────────┐    ┌──────────────┐
    │ Session │    │   Engine    │    │ Persistence  │
    │ Agent   │    │   Service   │    │   Agent      │
    └────┬────┘    └─────┬───────┘    └──────┬───────┘
         │               │                   │
    ┌────▼───────────────▼───────────────────▼────┐
    │              Message Queue                  │
    │              (RabbitMQ)                     │
    └─────────────────────────────────────────────┘
    ┌─────────────────────────────────────────────┐
    │                 Storage                     │
    │           MongoDB + Redis                   │
    └─────────────────────────────────────────────┘
```

## Quick Start with Docker Compose

### Overview

For quick testing and development without Kubernetes complexity, you can use Docker Compose to run all services locally. This approach is perfect for:

- **Initial development and testing**
- **Local debugging sessions**
- **CI/CD pipeline testing**
- **Quick demos and prototyping**

### One-Command Setup

```bash
# Clone and start everything
git clone <repository>
cd srvthreds

# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### Manual Docker Compose Setup

#### 1. Build the Application

```bash
# Build dependencies and application
npm run build

# Build Docker image
docker-compose build
```

#### 2. Start Services

```bash
# Start all services with logs
docker-compose up

# Start in background
docker-compose up -d

# Start specific services
docker-compose up mongo redis rabbitmq
docker-compose up srvthreds-bootstrap
docker-compose up srvthreds-engine srvthreds-session-agent
```

#### 3. Access Services

The Docker Compose setup exposes the following services:

- **Session Agent**: http://localhost:3000 (HTTP) and http://localhost:3001 (WebSocket)
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

#### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f srvthreds-bootstrap
docker-compose logs -f srvthreds-engine
docker-compose logs -f srvthreds-session-agent

# Infrastructure services
docker-compose logs -f mongo redis rabbitmq
```

### Docker Compose Commands

```bash
# Service management
docker-compose ps                           # View running services
docker-compose stop                         # Stop all services
docker-compose restart srvthreds-engine     # Restart specific service
docker-compose down                         # Stop and remove containers

# Development workflow
docker-compose build srvthreds-engine       # Rebuild specific service
docker-compose up --build srvthreds-engine  # Rebuild and restart service
docker-compose exec srvthreds-engine sh     # Shell into container

# Data management
docker-compose down -v                      # Remove containers and volumes
docker-compose pull                         # Update base images
```

### Debugging with Docker Compose

```bash
# Execute commands in running containers
docker-compose exec mongo mongosh
docker-compose exec redis redis-cli
docker-compose exec srvthreds-engine npm run check

# Copy files from containers
docker-compose cp srvthreds-engine:/app/logs/app.log ./app.log

# View container resource usage
docker-compose top
```

### Environment Customization

Create a `.env` file to customize your Docker Compose environment:

```bash
# .env file
COMPOSE_PROJECT_NAME=srvthreds-dev
MONGODB_PORT=27017
REDIS_PORT=6379
RABBITMQ_PORT=5672
RABBITMQ_MANAGEMENT_PORT=15672
SESSION_AGENT_HTTP_PORT=3000
SESSION_AGENT_WS_PORT=3001

# Application settings
NODE_ENV=development
LOG_LEVEL=DEBUG
```

### When to Use Docker Compose vs Kubernetes

#### Use Docker Compose When:
- **Quick local testing** and development
- **Learning the application** without infrastructure complexity
- **CI/CD pipeline testing** with simple requirements
- **Debugging specific issues** in isolation
- **Demo environments** that need to be portable

#### Use Kubernetes When:
- **Production deployments** requiring high availability
- **Team development** with shared environments
- **Scaling requirements** beyond single machine
- **Integration testing** with production-like infrastructure
- **Learning Kubernetes** deployment patterns

### Docker Compose Limitations

While Docker Compose is great for local development, be aware of these limitations:

1. **Single Host**: All containers run on one machine
2. **No Auto-scaling**: Manual scaling only
3. **Limited Health Checks**: Basic container-level health checks
4. **Networking**: Simpler networking model than Kubernetes
5. **Persistence**: Local volumes only (no distributed storage)

For production deployments, always use the Kubernetes setup described in the following sections.

## Development Deployment

### Quick Start

```bash
# Clone and build
git clone <repository>
cd srvthreds

# One-command deployment
./scripts/deploy-dev.sh
```

### Manual Development Setup

#### 1. Start Minikube

```bash
# Start with sufficient resources
minikube start --driver=docker --cpus=4 --memory=8192

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
```

#### 2. Build Application

```bash
# Build dependencies and application
npm run build

# Build Docker image
eval $(minikube docker-env)
docker build -t srvthreds:dev -f Dockerfile ..
```

#### 3. Deploy to Kubernetes

```bash
# Deploy all services
kubectl apply -k k8s/dev/

# Check status
kubectl get pods -n srvthreds
kubectl logs -f job/srvthreds-bootstrap -n srvthreds
```

#### 4. Access Services

```bash
# Session Agent (HTTP + WebSocket)
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds

# RabbitMQ Management UI
kubectl port-forward svc/rabbitmq 15672:15672 -n srvthreds

# Or use minikube service
minikube service session-agent -n srvthreds --url
```

### Development Commands

```bash
# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
kubectl logs -f deployment/srvthreds-session-agent -n srvthreds

# Scale services
kubectl scale deployment srvthreds-engine --replicas=2 -n srvthreds

# Restart services
kubectl rollout restart deployment/srvthreds-engine -n srvthreds

# Access MongoDB directly
kubectl exec -it deployment/mongo -n srvthreds -- mongosh

# Clean up
kubectl delete namespace srvthreds
```

## Production Deployment

### Infrastructure Setup

#### 1. Configure Terraform Variables

Create `terraform/environments/prod/terraform.tfvars`:

```hcl
# AWS Configuration
aws_region = "us-west-2"
availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]

# MongoDB Atlas
mongodb_atlas_public_key = "your-public-key"
mongodb_atlas_private_key = "your-private-key"
mongodb_atlas_org_id = "your-org-id"

# Optional: Cloud service API keys
redis_cloud_api_key = "your-redis-key"
rabbitmq_cloud_api_key = "your-rabbitmq-key"
```

#### 2. Deploy Infrastructure

```bash
cd terraform/environments/prod

# Initialize Terraform
terraform init

# Plan deployment
terraform plan

# Deploy infrastructure
terraform apply

# Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name srvthreds-prod
```

### Application Deployment

#### 1. Build and Push Images

```bash
# Set your registry
export REGISTRY=ghcr.io/your-org

# Build multi-platform images
./scripts/build-multiplatform.sh $(git rev-parse --short HEAD) ${REGISTRY} true
```

#### 2. Deploy Application

```bash
# Automated deployment
./scripts/deploy-prod.sh

# Or manual deployment
cd k8s/prod
terraform output -raw kubernetes_config > config.env
source config.env

# Update ConfigMap with connection strings
kubectl create configmap srvthreds-config \
  --from-literal=NODE_ENV=production \
  --from-literal=MONGO_URL="${MONGO_URL}" \
  --from-literal=LOG_LEVEL=INFO \
  --namespace=srvthreds \
  --dry-run=client -o yaml | kubectl apply -f -

# Deploy services
kubectl apply -k .
```

#### 3. Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n srvthreds

# Verify bootstrap completed
kubectl logs job/srvthreds-bootstrap -n srvthreds

# Check service endpoints
kubectl get svc -n srvthreds

# View application logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
```

## Multi-Platform Docker Builds

### Overview

SrvThreds supports multi-platform builds for:
- **linux/amd64**: Intel/AMD processors (standard cloud instances)
- **linux/arm64**: ARM processors (Apple Silicon, AWS Graviton, cost-effective)

### Building Images

#### Using Build Script

```bash
# Build for current platform
./scripts/build-multiplatform.sh

# Build with custom tag
./scripts/build-multiplatform.sh v1.2.3

# Build and push to registry
./scripts/build-multiplatform.sh latest ghcr.io/your-org true
```

#### Using Docker Bake

```bash
# Build multi-platform (local testing)
docker buildx bake --file docker-bake.hcl

# Build and push to registry
TAG=v1.2.3 REGISTRY=ghcr.io/your-org docker buildx bake --push

# Build only development image
docker buildx bake srvthreds-dev
```

#### Manual BuildX Commands

```bash
# Create builder if needed
docker buildx create --name srvthreds-builder --driver docker-container --bootstrap

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ghcr.io/your-org/srvthreds:latest \
  --push \
  -f Dockerfile \
  ..
```

### Platform-Specific Considerations

#### ARM64 Benefits
- **Cost**: 20-40% cheaper cloud instances
- **Performance**: Native speed on Apple Silicon development machines
- **Efficiency**: Better power efficiency

#### AMD64 Compatibility
- **Ecosystem**: Broader tool and library support
- **Legacy**: Compatible with older systems
- **Standard**: Default for most cloud platforms

## Environment Configuration

### Development Environment Variables

```bash
# MongoDB
MONGO_URL=mongodb://mongo:27017/?replicaSet=rs0

# Redis
REDIS_URL=redis://redis:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Application
NODE_ENV=development
LOG_LEVEL=DEBUG
```

### Production Environment Variables

```bash
# MongoDB Atlas
MONGO_URL=mongodb+srv://${username}:${password}@cluster.mongodb.net/database

# Redis Cloud
REDIS_URL=rediss://${username}:${password}@host:port

# CloudAMQP
RABBITMQ_URL=amqps://${username}:${password}@host/vhost

# Application
NODE_ENV=production
LOG_LEVEL=INFO
```

### Managing Secrets

#### Development (ConfigMap)
```bash
kubectl create configmap srvthreds-config \
  --from-literal=NODE_ENV=development \
  --from-literal=MONGO_URL=mongodb://mongo:27017 \
  --namespace=srvthreds
```

#### Production (Secrets)
```bash
kubectl create secret generic srvthreds-secrets \
  --from-literal=MONGO_URL="${MONGO_CONNECTION_STRING}" \
  --from-literal=REDIS_URL="${REDIS_CONNECTION_STRING}" \
  --namespace=srvthreds
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check all pods
kubectl get pods -n srvthreds

# Describe problematic pods
kubectl describe pod <pod-name> -n srvthreds

# View recent events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n srvthreds
kubectl top nodes
```

### Logs Management

```bash
# Application logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
kubectl logs -f deployment/srvthreds-session-agent -n srvthreds
kubectl logs -f deployment/srvthreds-persistence-agent -n srvthreds

# Bootstrap logs
kubectl logs job/srvthreds-bootstrap -n srvthreds

# Infrastructure logs (if using EKS)
aws logs describe-log-groups --log-group-name-prefix /aws/eks/srvthreds
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment srvthreds-engine --replicas=5 -n srvthreds

# Horizontal Pod Autoscaler
kubectl autoscale deployment srvthreds-engine \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n srvthreds

# Check autoscaler status
kubectl get hpa -n srvthreds
```

### Updates and Rollbacks

```bash
# Rolling update
kubectl set image deployment/srvthreds-engine \
  engine=ghcr.io/your-org/srvthreds:v1.2.3 \
  -n srvthreds

# Check rollout status
kubectl rollout status deployment/srvthreds-engine -n srvthreds

# Rollback if needed
kubectl rollout undo deployment/srvthreds-engine -n srvthreds

# View rollout history
kubectl rollout history deployment/srvthreds-engine -n srvthreds
```

## Troubleshooting

### Common Issues

#### Bootstrap Job Fails

**Symptoms**: Bootstrap job shows error status
```bash
kubectl logs job/srvthreds-bootstrap -n srvthreds
```

**Common Causes**:
1. MongoDB not ready - check MongoDB pod status
2. Connection string incorrect - verify MONGO_URL
3. Network issues - check service connectivity

**Solutions**:
```bash
# Check MongoDB status
kubectl exec -it deployment/mongo -n srvthreds -- mongosh --eval "db.adminCommand('ping')"

# Test connectivity
kubectl exec -it deployment/srvthreds-engine -n srvthreds -- nslookup mongo

# Restart bootstrap
kubectl delete job srvthreds-bootstrap -n srvthreds
kubectl apply -k k8s/dev/
```

#### Pods Stuck in Pending

**Symptoms**: Pods remain in "Pending" state
```bash
kubectl describe pod <pod-name> -n srvthreds
```

**Common Causes**:
1. Insufficient resources
2. Image pull failures
3. Node selector issues

**Solutions**:
```bash
# Check node resources
kubectl describe nodes

# Check events
kubectl get events -n srvthreds

# Scale down if needed
kubectl scale deployment srvthreds-engine --replicas=1 -n srvthreds
```

#### Connection Timeouts

**Symptoms**: Services can't connect to databases
```bash
kubectl logs -f deployment/srvthreds-engine -n srvthreds
```

**Solutions**:
```bash
# Check service endpoints
kubectl get endpoints -n srvthreds

# Verify DNS resolution
kubectl exec -it deployment/srvthreds-engine -n srvthreds -- nslookup mongo

# Test port connectivity
kubectl exec -it deployment/srvthreds-engine -n srvthreds -- nc -zv mongo 27017
```

### Development Debugging

```bash
# Port forward for direct access
kubectl port-forward deployment/srvthreds-engine 3000:3000 -n srvthreds

# Execute into container
kubectl exec -it deployment/srvthreds-engine -n srvthreds -- /bin/sh

# Copy files from container
kubectl cp srvthreds/srvthreds-engine-xxx:/app/logs/app.log ./app.log

# Enable debug logging
kubectl set env deployment/srvthreds-engine LOG_LEVEL=DEBUG -n srvthreds
```

### Production Debugging

```bash
# Check EKS cluster status
aws eks describe-cluster --name srvthreds-prod

# View CloudWatch logs
aws logs tail /aws/eks/srvthreds-prod/cluster --follow

# Check node groups
aws eks describe-nodegroup --cluster-name srvthreds-prod --nodegroup-name srvthreds-prod-nodes

# Monitor with kubectl
kubectl get pods -n srvthreds -w
```

## Best Practices

### Security

1. **Secrets Management**
   - Use Kubernetes secrets for sensitive data
   - Enable encryption at rest
   - Rotate credentials regularly

2. **Network Security**
   - Implement network policies
   - Use TLS for all communications
   - Restrict ingress access

3. **Container Security**
   - Run as non-root user
   - Use minimal base images
   - Scan images for vulnerabilities

### Performance

1. **Resource Management**
   - Set appropriate requests and limits
   - Use horizontal pod autoscaling
   - Monitor resource usage

2. **Storage**
   - Use persistent volumes for data
   - Configure proper backup strategies
   - Monitor disk usage

3. **Networking**
   - Use service mesh for observability
   - Implement caching strategies
   - Optimize DNS resolution

### Reliability

1. **High Availability**
   - Deploy across multiple AZs
   - Use replica sets for databases
   - Implement health checks

2. **Backup and Recovery**
   - Regular database backups
   - Test restore procedures
   - Document recovery runbooks

3. **Monitoring**
   - Set up alerting for critical metrics
   - Monitor application performance
   - Track business metrics

### Development Workflow

1. **Local Development**
   - Use Minikube for local testing
   - Keep development environment similar to production
   - Use feature flags for gradual rollouts

2. **CI/CD**
   - Automate testing and building
   - Use GitOps for deployments
   - Implement proper branching strategy

3. **Documentation**
   - Keep deployment docs updated
   - Document configuration changes
   - Maintain troubleshooting guides

---

## Quick Reference

### Essential Commands

```bash
# Docker Compose (Simple Setup)
docker-compose up --build                       # Start all services
docker-compose logs -f                          # View all logs
docker-compose down                             # Stop and remove containers

# Kubernetes Development
./scripts/deploy-dev.sh                          # Deploy to Minikube
kubectl get pods -n srvthreds                    # Check pod status
kubectl logs -f deployment/srvthreds-engine -n srvthreds  # View logs

# Production
./scripts/deploy-prod.sh                         # Deploy to production
terraform apply -chdir=terraform/environments/prod  # Update infrastructure
kubectl rollout restart deployment/srvthreds-engine -n srvthreds  # Restart service

# Multi-platform builds
./scripts/build-multiplatform.sh latest ghcr.io/your-org true  # Build and push

# Cleanup
docker-compose down -v                          # Remove Docker Compose setup
kubectl delete namespace srvthreds              # Remove Kubernetes development
terraform destroy -chdir=terraform/environments/prod  # Remove production
```

### Important URLs

- **Docker Compose**: `http://localhost:3000` (direct access)
- **Kubernetes Development**: `http://localhost:3000` (via port-forward)
- **Production**: Load balancer endpoint from `kubectl get svc`
- **RabbitMQ Management**: `http://localhost:15672`
- **Container Registry**: `ghcr.io/your-org/srvthreds`

For additional help, see the [Kubernetes documentation](README-kubernetes.md) or contact the development team.
