# Deployment Guide

This guide covers deploying applications using the DevOps toolkit, from local development to production.

## Prerequisites

### Local Development

- **Docker Desktop** (or Docker Engine)
- **Minikube** (v1.30+)
- **kubectl** (matching cluster version)
- **Node.js** (v18+)
- **npm** (v9+)

### Cloud Deployment

- **Azure CLI** (`az`) logged in with appropriate permissions
- **Terraform** (v1.5+)
- GitHub repository access for CI/CD

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd devops

# Install dependencies
npm install
```

## Local Development (Minikube)

### Command Reference

| Command | What it does |
|---------|--------------|
| `npm run generate -p <project>` | Generate docker-compose.yaml from project.yaml |
| `npm run minikube -p <project>` | **Deploy** project (infra + K8s pods) |
| `npm run minikube -p <project> --build` | **Deploy** with image rebuild |
| `npm run minikube:stop -p <project>` | Stop project's services (keeps data) |
| `npm run minikube:reset -p <project>` | Delete project's containers, volumes, and K8s namespace |
| `npm run minikube:status -p <project>` | Show project's container and pod status |
| `npm run minikube:delete` | Delete entire minikube cluster (all projects) |

**Key point:** `npm run minikube` is the deploy command. The `--build` flag adds image rebuilding before deployment.

### Quick Start

```bash
# 1. Generate docker-compose from project.yaml
npm run generate -p srvthreds

# 2. Deploy (first time - must build images)
npm run minikube -p srvthreds --build
```

### What Happens During Deployment

When you run `npm run minikube -p srvthreds --build`:

1. **Preflight checks** - Verifies Docker, minikube, kubectl installed
2. **Starts minikube** - If not running (4 CPUs, ~8GB RAM)
3. **Runs profiles in order:**

| Step | Profile | Runtime | Action |
|------|---------|---------|--------|
| 1 | `infra` | `host` | Starts MongoDB, Redis via Docker Compose on **host Docker** |
| 2 | (hook) | - | Runs `setup-repl.sh` to init MongoDB replica set |
| 3 | `build` | `minikube` | Builds Docker images into **minikube's Docker daemon** |
| 4 | `app` | - | Runs `kubectl apply -k manifests/overlays/minikube` |

**Why runtime matters:**
- `runtime: host` - Infrastructure runs on your machine's Docker, simulating Azure managed services (CosmosDB, Azure Redis). K8s pods connect via `host.minikube.internal`.
- `runtime: minikube` (default) - Services run in minikube's Docker daemon, making images available to K8s.

### When to Use --build

| Scenario | Command |
|----------|---------|
| First deployment | `npm run minikube -p srvthreds --build` |
| After code changes | `npm run minikube -p srvthreds --build` |
| Restart without code changes | `npm run minikube -p srvthreds` |
| Just restart K8s pods | `npm run minikube -p srvthreds --profile app` |

### Deploy Specific Profiles Only

```bash
# Just infrastructure (MongoDB, Redis)
npm run minikube -p srvthreds --profile infra

# Just build images (no deploy)
npm run minikube -p srvthreds --profile build

# Just deploy K8s pods (assumes images exist)
npm run minikube -p srvthreds --profile app
```

### Checking Status

```bash
npm run minikube:status -p srvthreds
```

Shows:
- Docker Compose container status
- Kubernetes pod status
- Service endpoints

#### Viewing Logs

```bash
# Kubernetes pods
kubectl logs -n srvthreds deployment/srvthreds-engine
kubectl logs -n srvthreds deployment/srvthreds-session-agent

# Docker containers
docker logs srvthreds-mongo-repl-1
docker logs srvthreds-redis
```

#### Stopping Services

```bash
# Stop but keep data
npm run minikube:stop -p srvthreds

# Full reset (delete all data)
npm run minikube:reset -p srvthreds
```

Both commands automatically handle services across different Docker environments:
- Infrastructure (`runtime: host`) → stopped/removed on host Docker
- Build/App services → stopped/removed on minikube's Docker
- K8s namespace → deleted (reset only)

#### Deleting Minikube Cluster

```bash
# Complete cluster deletion (for corrupted state)
npm run minikube:delete
```

### Accessing Services

#### Port Forwarding

```bash
# Engine API
kubectl port-forward -n srvthreds svc/srvthreds-engine-service 8082:8082

# Session Agent
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000
```

#### Minikube Service URL

```bash
minikube service srvthreds-engine-service -n srvthreds --url
```

## Cloud Deployment (Azure AKS)

### Prerequisites

1. **Azure infrastructure deployed** via Terraform (see Infrastructure Setup below)
2. **GitHub Actions configured** with Azure OIDC federation
3. **GitHub environments** (dev, test, prod) with protection rules

### Deployment Triggers

#### Automatic (Push to main)

```bash
git push origin main
```

Triggers:
1. Build images → push to ACR (dev registry)
2. Deploy to dev environment

#### Release (Version tag)

```bash
git tag v1.0.0
git push origin v1.0.0
```

Triggers:
1. Build images → push to ACR
2. Deploy to dev → test → prod (with approvals)

#### Manual (workflow_dispatch)

In GitHub Actions UI:
1. Go to Actions → srvthreds - Build and Deploy
2. Click "Run workflow"
3. Select environment and options

### Deployment Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                                    │
│                                                                         │
│  1. prepare          Generate image tag from git context                │
│                      - Branch: sha-abc1234                              │
│                      - Tag: 1.0.0                                       │
│                                                                         │
│  2. build            Build and push to ACR (dev registry)               │
│                      - cazsrvthredsdeacr.azurecr.io/srvthreds/app:tag   │
│                                                                         │
│  3. deploy-dev       Deploy to dev AKS                                  │
│                      - Update kustomization with new tag                │
│                      - kubectl apply -k manifests/overlays/dev          │
│                                                                         │
│  4. deploy-test      Deploy to test AKS (releases only)                 │
│                      - Requires deploy-dev success                      │
│                                                                         │
│  5. deploy-prod      Deploy to prod AKS (releases only)                 │
│                      - Requires deploy-test success                     │
│                      - Requires GitHub environment approval             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Manual AKS Deployment

If needed, deploy manually:

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS

# Update image tag in kustomization
cd projects/srvthreds/manifests/overlays/dev
kustomize edit set image srvthreds/app=cazsrvthredsdeacr.azurecr.io/srvthreds/app:sha-abc123

# Deploy
kubectl apply -k .

# Verify
kubectl get pods -n srvthreds
kubectl rollout status deployment -n srvthreds
```

## Infrastructure Setup (Terraform)

### Initial Setup

#### 1. Bootstrap State Backend

```bash
npm run terraform -- bootstrap -p srvthreds dev
```

Creates:
- Resource group for Terraform state
- Storage account with versioning
- Container for state files

#### 2. Initialize Stacks

```bash
npm run terraform -- init -p srvthreds dev
```

Connects all stacks to the remote backend.

### Deploying Infrastructure

#### Preview Changes

```bash
npm run terraform -- plan -p srvthreds dev
```

Shows what will be created/modified/destroyed.

#### Deploy All Stacks

```bash
npm run terraform -- deploy -p srvthreds dev
```

Deploys in dependency order:
1. networking
2. keyvault, acr, cosmosdb, redis, monitoring (parallel)
3. aks
4. nginx-ingress

#### Deploy Specific Stacks

```bash
npm run terraform -- deploy -p srvthreds dev networking acr aks
```

Automatically includes dependencies (networking before acr/aks).

### Checking Status

```bash
npm run terraform -- status -p srvthreds dev
```

Shows deployed resources per stack.

### Destroying Infrastructure

```bash
# Preview destruction
npm run terraform -- plan -p srvthreds dev --destroy

# Destroy all
npm run terraform -- destroy -p srvthreds dev

# Destroy specific stacks
npm run terraform -- destroy -p srvthreds dev nginx-ingress aks
```

Destroys in reverse dependency order.

### State Management

```bash
# Backup state
npm run terraform -- state backup dev

# Show state
npm run terraform -- state show dev networking

# Recover corrupted state
npm run terraform -- state recover dev aks
```

## Environment Configuration

### Development (dev)

| Setting | Value |
|---------|-------|
| Resource Group | CAZ-SRVTHREDS-D-E-RG |
| AKS Cluster | CAZ-SRVTHREDS-D-E-AKS |
| ACR | cazsrvthredsdeacr.azurecr.io |
| Replicas | 1 (engine, agents) |

### Test (test)

| Setting | Value |
|---------|-------|
| Resource Group | CAZ-SRVTHREDS-T-E-RG |
| AKS Cluster | CAZ-SRVTHREDS-T-E-AKS |
| ACR | cazsrvthredsteacr.azurecr.io |
| Replicas | 1-2 |

### Production (prod)

| Setting | Value |
|---------|-------|
| Resource Group | CAZ-SRVTHREDS-P-E-RG |
| AKS Cluster | CAZ-SRVTHREDS-P-E-AKS |
| ACR | cazsrvthredspacr.azurecr.io |
| Replicas | 3 (engine), 2 (agents) |

## Adding a New Project

### 1. Create Project Structure

```bash
mkdir -p projects/myproject/{manifests/{base,overlays/{minikube,dev,prod}},terraform/stacks,docker/dockerfiles,scripts}
```

### 2. Create project.yaml

```yaml
name: myproject
description: My new project

source:
  path: ../../../myproject

images:
  app:
    dockerfile: docker/dockerfiles/Dockerfile

services:
  myapp:
    image: app
    profiles: [app]
    deploy: [minikube, dev, test, prod]
    ports:
      - '8080:8080'

profiles:
  all: [app]
  app: [myapp]

environments:
  minikube:
    registry: local
    namespace: myproject
  dev:
    registry: cazmyprojectdeacr.azurecr.io
    namespace: myproject

azure:
  prefix: CAZ
  appCode: MYPROJECT
  regionCode: E

terraform:
  stacksPath: terraform/stacks
  configPath: terraform
```

### 3. Create Kubernetes Manifests

Create base manifests in `manifests/base/`:
- `namespace.yaml`
- `configmap.yaml`
- `myapp.yaml` (Deployment + Service)
- `kustomization.yaml`

Create overlays for each environment.

### 4. Create Terraform Configuration

Create `terraform/stacks.json` and `terraform/environments.json`.

### 5. Add npm Scripts

In `package.json`:

```json
{
  "scripts": {
    "myproject:generate": "npm run generate -p myproject",
    "myproject:minikube": "npm run minikube -p myproject"
  }
}
```

### 6. Create CI/CD Workflow

Copy `.github/workflows/srvthreds-deploy.yml` to `myproject-deploy.yml` and update:
- `PROJECT: myproject`
- `IMAGES: '["app"]'`
- Path triggers

## Rollback Procedures

### Kubernetes Rollback

```bash
# View rollout history
kubectl rollout history deployment/srvthreds-engine -n srvthreds

# Rollback to previous revision
kubectl rollout undo deployment/srvthreds-engine -n srvthreds

# Rollback to specific revision
kubectl rollout undo deployment/srvthreds-engine -n srvthreds --to-revision=2
```

### Terraform Rollback

```bash
# Backup current state
npm run terraform -- state backup dev

# Deploy previous version
npm run terraform -- deploy -p srvthreds dev
```

### CI/CD Rollback

1. Find the last working commit/tag
2. Re-run the GitHub Actions workflow with that ref
3. Or manually deploy the specific image tag:

```bash
kustomize edit set image srvthreds/app=cazsrvthredsdeacr.azurecr.io/srvthreds/app:working-tag
kubectl apply -k .
```
