# SrvThreds Infrastructure Roadmap

**Status**: Phase 1 Complete ✅ | Phase 2 Ready 🚀 | Phase 3 Planned 📋

---

## Current State (Phase 1: Complete ✅)

### What's Been Built

You've successfully implemented a **Docker-based local development environment** with a sophisticated deployment CLI:

#### 1. **Deployment CLI** (`infrastructure/deploymentCli.ts`)
- Interactive menu-driven deployment system
- Supports multiple environments: `local`, `dev`, `test`, `staging`
- Configuration-driven via `containerDeploymentConfig.json`
- Handles pre/post build commands and environment-specific overrides

#### 2. **Container Architecture**
- **Builder Pattern**: Shared `srvthreds-builder` image for faster builds
- **Service Containers**: Engine, Session Agent, Persistence Agent
- **Database Containers**: MongoDB (replica set), Redis, RabbitMQ
- **Bootstrap Container**: Initializes databases with patterns and config

#### 3. **Docker Compose Files**
- `docker-compose-db.yml`: Database services (MongoDB, Redis, RabbitMQ)
- `docker-compose-services.yml`: Application services (Engine, Agents)
- Separate files allow independent database and service management

#### 4. **Key Features**
- Multi-stage Docker builds with builder pattern
- Automatic MongoDB replica set initialization
- Environment configuration via `.env` files
- Resource limits and restart policies
- Network isolation via `srvthreds-net`

### Current Deployment Flow

```bash
# Start everything locally
npm run deploymentCli local s_a_dbs_s

# Or individually
npm run deploymentCli local s_a_dbs      # Start databases
npm run deploymentCli local s_a_s        # Start services
npm run deploymentCli local bootstrap    # Run bootstrap
```

---

## Phase 2: Minikube Development Environment (Next 🚀)

### Objectives

Create a **production-like Kubernetes environment** on your local machine using Minikube that:
- Mirrors production architecture
- Maintains separation between compute and data layers
- Allows testing of Kubernetes manifests before cloud deployment
- Provides realistic scaling and networking scenarios

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Minikube Cluster                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────┐  │
│  │  SrvThreds     │  │  Session       │  │Persistence│  │
│  │  Engine        │  │  Agent         │  │  Agent    │  │
│  │  (Deployment)  │  │  (Deployment)  │  │(Deployment│  │
│  └────────┬───────┘  └───────┬────────┘  └─────┬────┘  │
│           │                  │                  │        │
│           └──────────────────┼──────────────────┘        │
│                              │                           │
│                    ┌─────────▼────────┐                  │
│                    │   RabbitMQ       │                  │
│                    │   (StatefulSet)  │                  │
│                    └──────────────────┘                  │
└─────────────────────────────────────────────────────────┘
                              │
                ┌─────────────▼────────────┐
                │  External Databases      │
                ├──────────────────────────┤
                │  • MongoDB (Host/Cloud)  │
                │  • Redis (Host/Cloud)    │
                └──────────────────────────┘
```

### Key Design Decisions

#### 1. **Database Strategy**

**IMPORTANT**: Databases will **NOT** run in Minikube or production Kubernetes clusters for performance reasons.

**Options for Development**:

**Option A: Local Docker Databases** (Recommended for dev)
```bash
# Use existing deployment CLI to start databases
npm run deploymentCli local s_a_dbs

# Minikube services connect to host databases
# Access via: host.minikube.internal:27017
```

**Option B: Cloud Databases** (Production-like)
```bash
# Point to cloud instances
# MongoDB Atlas, Redis Cloud, CloudAMQP
# Same configuration as production
```

#### 2. **What Runs in Minikube**

**Compute Layer Only**:
- ✅ SrvThreds Engine (Deployment)
- ✅ Session Agent (Deployment)
- ✅ Persistence Agent (Deployment)
- ✅ RabbitMQ (StatefulSet) - messaging layer
- ✅ Bootstrap (Job) - initialization

**NOT in Minikube**:
- ❌ MongoDB - Use host Docker or cloud
- ❌ Redis - Use host Docker or cloud

### Implementation Plan

#### Step 1: Create Kubernetes Manifests

**Directory Structure**:
```
infrastructure/k8s/
├── base/                           # Base manifests (DRY)
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── srvthreds-engine.yaml
│   ├── srvthreds-session-agent.yaml
│   ├── srvthreds-persistence-agent.yaml
│   ├── srvthreds-bootstrap-job.yaml
│   └── rabbitmq.yaml
├── overlays/
│   ├── minikube/                   # Minikube-specific
│   │   ├── kustomization.yaml
│   │   ├── configmap-minikube.yaml
│   │   └── ingress.yaml
│   ├── dev/                        # Cloud dev environment
│   │   ├── kustomization.yaml
│   │   └── configmap-dev.yaml
│   ├── staging/                    # Cloud staging
│   │   ├── kustomization.yaml
│   │   └── configmap-staging.yaml
│   └── prod/                       # Cloud production
│       ├── kustomization.yaml
│       └── configmap-prod.yaml
└── scripts/
    ├── deploy-minikube.sh
    ├── deploy-cloud.sh
    └── setup-databases.sh
```

#### Step 2: Minikube Setup Script

Create `infrastructure/k8s/scripts/setup-minikube.sh`:

```bash
#!/bin/bash
# Setup Minikube for SrvThreds development

# 1. Start Minikube with appropriate resources
minikube start --driver=docker \
  --cpus=4 \
  --memory=8192 \
  --disk-size=20g

# 2. Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
minikube addons enable dashboard

# 3. Build and load Docker images into Minikube
eval $(minikube docker-env)

# Build builder image
docker compose -f infrastructure/local/compose/docker-compose-services.yml build srvthreds-builder

# 4. Start host databases (if using Docker)
npm run deploymentCli local s_a_dbs

# 5. Deploy to Minikube
kubectl apply -k infrastructure/k8s/overlays/minikube/

# 6. Wait for deployment
kubectl wait --for=condition=available --timeout=300s \
  deployment/srvthreds-engine \
  deployment/srvthreds-session-agent \
  deployment/srvthreds-persistence-agent \
  -n srvthreds

# 7. Port forward for access
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds &

echo "✅ Minikube setup complete!"
echo "🌐 Access session agent at: http://localhost:3000"
echo "📊 Dashboard: minikube dashboard"
```

#### Step 3: Connection to Host Databases

**ConfigMap for Minikube** (`configmap-minikube.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds
data:
  NODE_ENV: "development"
  # Connect to databases on host machine
  MONGO_HOST: "host.minikube.internal:27017"
  REDIS_HOST: "host.minikube.internal:6379"
  RABBITMQ_HOST: "rabbitmq:5672"  # RabbitMQ runs in cluster
  LOG_LEVEL: "DEBUG"
```

#### Step 4: Integration with Deployment CLI

**Add to `containerDeploymentConfig.json`**:

```json
{
  "name": "Deploy to Minikube",
  "shortName": "k8s_minikube",
  "description": "Deploy services to Minikube Kubernetes cluster",
  "environments": ["local"],
  "target": {
    "composing": "kubernetes",
    "deployCommand": "apply",
    "preBuildCommands": [
      {
        "description": "Setup Minikube environment...",
        "command": "infrastructure/k8s/scripts/setup-minikube.sh"
      }
    ]
  }
}
```

### Testing the Minikube Environment

```bash
# Deploy to Minikube
npm run deploymentCli local k8s_minikube

# Check status
kubectl get pods -n srvthreds
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Access services
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds

# Scale services
kubectl scale deployment srvthreds-engine --replicas=3 -n srvthreds

# Cleanup
kubectl delete namespace srvthreds
```

---

## Phase 3: Cloud Production Deployment (Planned 📋)

### Objectives

Deploy to **cloud Kubernetes (EKS/GKE/AKS)** with:
- Managed database services (MongoDB Atlas, Redis Cloud)
- Infrastructure as Code via Terraform
- CI/CD pipeline integration
- Multi-environment support (dev, staging, prod)

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Cloud Provider (AWS)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         EKS Cluster (Compute Layer)               │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │  Engine  │  │ Session  │  │Persistenc│       │  │
│  │  │(3 replicas) │ Agent(2) │  │Agent (2) │       │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘       │  │
│  │       │             │              │             │  │
│  │       └─────────────┼──────────────┘             │  │
│  │                     │                            │  │
│  │           ┌─────────▼────────┐                   │  │
│  │           │   CloudAMQP      │                   │  │
│  │           │   (External)     │                   │  │
│  │           └──────────────────┘                   │  │
│  └──────────────────────────────────────────────────┘  │
│                         │                               │
│  ┌──────────────────────▼───────────────────────────┐  │
│  │         Managed Database Services                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  • MongoDB Atlas (Replica Set)                    │  │
│  │  • Redis Cloud (HA)                               │  │
│  │  • CloudAMQP (RabbitMQ)                          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Terraform Structure

```
infrastructure/terraform/
├── modules/
│   ├── eks/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── networking/
│   │   ├── main.tf (VPC, Subnets, NAT)
│   │   ├── variables.tf
│   │   └── outputs.tf
│   ├── mongodb-atlas/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── outputs.tf
│   └── redis-cloud/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
└── environments/
    ├── dev/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── terraform.tfvars
    │   └── outputs.tf
    ├── staging/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── terraform.tfvars
    │   └── outputs.tf
    └── prod/
        ├── main.tf
        ├── variables.tf
        ├── terraform.tfvars
        └── outputs.tf
```

### Deployment Flow

```bash
# 1. Provision infrastructure
cd infrastructure/terraform/environments/prod
terraform init
terraform plan
terraform apply

# 2. Configure kubectl
aws eks update-kubeconfig --region us-west-2 --name srvthreds-prod

# 3. Deploy applications
kubectl apply -k infrastructure/k8s/overlays/prod/

# 4. Verify deployment
kubectl get pods -n srvthreds
kubectl get svc -n srvthreds
```

### CI/CD Integration

**GitHub Actions Pipeline**:
1. Build Docker images (multi-platform)
2. Push to container registry (ECR/GHCR)
3. Update Kubernetes manifests with new image tags
4. Deploy via kubectl or ArgoCD
5. Run smoke tests
6. Rollback on failure

---

## Key Differences from Original Plan

### What Changed

1. **✅ Deployment CLI**: You built a sophisticated CLI system that wasn't in the original plan
2. **✅ Builder Pattern**: Multi-stage builds with shared builder image
3. **✅ Docker Compose Split**: Separate database and service compose files
4. **✅ Environment Overrides**: Per-environment build and deployment customization
5. **❌ No NGINX**: Removed from containerization (not needed)
6. **❌ Databases Not in K8s**: Explicit decision for performance

### What Stays from Original Plan

1. **✅ Kubernetes Manifests**: Still needed for Minikube/Cloud
2. **✅ Kustomize Overlays**: Still the best approach for multi-environment
3. **✅ Terraform**: Still needed for cloud infrastructure
4. **✅ Managed Databases**: Still the production strategy
5. **✅ Multi-environment**: local → dev → staging → prod

### What's Obsolete

From `infrastructure/clusters/`:
- ❌ Local MongoDB/Redis Kubernetes manifests (use Docker instead)
- ❌ nginx configurations (removed from architecture)
- ❌ Some service configurations (replaced by your Docker Compose)

From `k8s/` (old location):
- ❌ Move to `infrastructure/k8s/` for consistency
- ❌ docker-bake.hcl (your builder pattern is better)
- ❌ Multi-platform build scripts (integrated into deployment CLI)

---

## Recommended Next Steps

### Immediate (Week 1-2)

1. **Create Minikube Kubernetes Manifests**
   - Convert Docker Compose services to Kubernetes Deployments
   - Create Kustomize overlays for minikube
   - Add ConfigMaps for environment configuration

2. **Setup Minikube Scripts**
   - `setup-minikube.sh` - Initialize Minikube
   - `deploy-minikube.sh` - Deploy applications
   - `connect-databases.sh` - Configure host database access

3. **Integrate with Deployment CLI**
   - Add Kubernetes deployment options
   - Handle image building and loading into Minikube
   - Test full deployment flow

### Short Term (Month 1)

4. **Test Minikube Environment**
   - Deploy all services
   - Verify connectivity to host databases
   - Test scaling and networking
   - Document any issues

5. **Create Terraform Modules**
   - Start with networking module (VPC, subnets)
   - Add EKS module
   - Add MongoDB Atlas module

6. **Setup Cloud Development Environment**
   - Deploy to AWS dev account
   - Configure managed databases
   - Test application deployment

### Medium Term (Month 2-3)

7. **Production Readiness**
   - Add monitoring (Prometheus/Grafana)
   - Add logging (ELK/Loki)
   - Setup secrets management (AWS Secrets Manager)
   - Configure autoscaling

8. **CI/CD Pipeline**
   - GitHub Actions workflows
   - Automated testing
   - Automated deployments
   - Rollback procedures

9. **Documentation**
   - Deployment runbooks
   - Troubleshooting guides
   - Architecture diagrams

---

## Summary

**Phase 1 (Complete)**: Docker-based local development with sophisticated deployment CLI
**Phase 2 (Next)**: Minikube for production-like local Kubernetes testing
**Phase 3 (Future)**: Cloud deployment with Terraform and managed services

Your deployment CLI foundation is excellent and will serve as the basis for orchestrating both Minikube and cloud deployments. The key is to maintain this separation:

- **Databases**: Docker (local) → Managed Services (cloud)
- **Compute**: Docker (local) → Minikube (dev) → Cloud K8s (prod)
- **Orchestration**: Deployment CLI (all environments)

This roadmap respects the work you've already done while providing a clear path forward to production-grade Kubernetes deployment.