# srvthreds Project

Event-driven workflow automation backend deployed to Minikube (local) and Azure AKS (cloud).

## Overview

srvthreds is a multi-service application consisting of:

| Service | Purpose | Ports |
|---------|---------|-------|
| `srvthreds-engine` | Main event processing engine | 8082 |
| `srvthreds-session-agent` | Session management | 3000, 3001 |
| `srvthreds-persistence-agent` | Data persistence handler | - |
| `srvthreds-bootstrap` | One-time initialization | - |

## Quick Start

```bash
# From repository root

# 1. Generate configuration
npm run generate -p srvthreds

# 2. Deploy to minikube
npm run minikube -p srvthreds --build

# 3. Check status
npm run minikube:status -p srvthreds
```

## Project Structure

```
projects/srvthreds/
├── project.yaml                  # Configuration source of truth
├── docker-compose.generated.yaml # Generated from project.yaml
├── docker/
│   ├── dockerfiles/
│   │   ├── Dockerfile            # Production app image
│   │   ├── Dockerfile.builder    # Build stage image
│   │   └── Dockerfile.cmdRunner  # Bootstrap utility
│   └── assets/                   # Build assets
├── manifests/
│   ├── base/                     # Base K8s resources
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── srvthreds-engine.yaml
│   │   ├── srvthreds-session-agent.yaml
│   │   ├── srvthreds-persistence-agent.yaml
│   │   └── kustomization.yaml
│   └── overlays/
│       ├── minikube/             # Local development
│       ├── dev/                  # Azure dev
│       └── prod/                 # Azure production
├── scripts/
│   └── setup-repl.sh             # MongoDB replica set init
└── terraform/
    ├── stacks.json               # Stack definitions
    ├── environments.json         # Environment configs
    └── stacks/                   # Terraform modules
```

## Configuration

### project.yaml

The `project.yaml` file defines:

- **Images**: Docker images to build (builder, app, cmd-runner)
- **Services**: Application services and their deployment targets
- **Profiles**: Service groupings for selective deployment
- **Environments**: Registry and ingress configuration per environment

### Profiles

| Profile | Services | Purpose |
|---------|----------|---------|
| `infra` | mongo-repl-1, redis | Database infrastructure |
| `build` | srvthreds-builder | Compile application |
| `app` | bootstrap, engine, agents | Application services |
| `all` | infra → build → app | Complete deployment |

### Deployment Targets

| Target | Description |
|--------|-------------|
| `minikube` | Local Kubernetes via Docker Compose + K8s |
| `dev` | Azure AKS development cluster |
| `test` | Azure AKS test cluster |
| `prod` | Azure AKS production cluster |

## Development Workflow

### Initial Setup

```bash
npm run generate -p srvthreds
npm run minikube -p srvthreds --build
```

### Code Changes

```bash
# Rebuild and redeploy
npm run minikube -p srvthreds --build
```

### Infrastructure Only

```bash
npm run minikube -p srvthreds --profile infra
```

### Application Only (skip infra/build)

```bash
npm run minikube -p srvthreds --profile app
```

### Reset Everything

```bash
npm run minikube:reset -p srvthreds
```

## Accessing Services

### Port Forwarding

```bash
# Engine API
kubectl port-forward -n srvthreds svc/srvthreds-engine-service 8082:8082

# Session Agent
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000
```

### View Logs

```bash
# Engine logs
kubectl logs -n srvthreds deployment/srvthreds-engine -f

# All pods
kubectl logs -n srvthreds -l app.kubernetes.io/part-of=srvthreds -f
```

## Azure Deployment

### Prerequisites

1. Terraform infrastructure deployed
2. GitHub Actions configured with Azure OIDC

### Manual Deployment

```bash
# Get AKS credentials
az aks get-credentials --resource-group CAZ-SRVTHREDS-D-E-RG --name CAZ-SRVTHREDS-D-E-AKS

# Deploy
kubectl apply -k manifests/overlays/dev
```

### CI/CD Triggers

- **Push to main**: Deploys to dev
- **Version tag (v*)**: Deploys to dev → test → prod

## Terraform Infrastructure

### Stacks

| Stack | Resources |
|-------|-----------|
| networking | VNet, subnets, NSGs |
| keyvault | Key Vault + secrets |
| acr | Container Registry |
| cosmosdb | MongoDB (Cosmos DB) |
| redis | Azure Cache for Redis |
| monitoring | Log Analytics, App Insights |
| aks | Kubernetes cluster |
| nginx-ingress | Ingress controller |

### Deploy Infrastructure

```bash
# Initialize
npm run terraform -- init -p srvthreds dev

# Preview
npm run terraform -- plan -p srvthreds dev

# Deploy
npm run terraform -- deploy -p srvthreds dev
```

## Environment Variables

Services receive configuration via ConfigMap:

| Variable | Description |
|----------|-------------|
| `MONGO_HOST` | MongoDB connection |
| `REDIS_HOST` | Redis connection |
| `RABBITMQ_HOST` | RabbitMQ connection |
| `NODE_ENV` | Environment mode |

See `manifests/base/configmap.yaml` and overlay patches for environment-specific values.

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod -n srvthreds <pod-name>
kubectl logs -n srvthreds <pod-name> --previous
```

### Database Connection Issues

```bash
# Check Docker containers (minikube)
docker ps | grep -E 'mongo|redis'
docker logs srvthreds-mongo-repl-1

# Check ConfigMap
kubectl get configmap srvthreds-config -n srvthreds -o yaml
```

### Full Reset

```bash
npm run minikube:reset -p srvthreds
npm run minikube -p srvthreds --build
```

See [Troubleshooting Guide](../../docs/troubleshooting.md) for more details.
