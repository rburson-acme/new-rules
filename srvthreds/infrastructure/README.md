# SrvThreds Infrastructure

This directory contains all infrastructure-related code, configurations, and scripts for deploying SrvThreds across different environments.

## 📁 Directory Structure

```
infrastructure/
├── local/              # Local development deployments
│   ├── docker/         # Docker Compose development
│   │   ├── compose/    # docker-compose files
│   │   ├── dockerfiles/# Container definitions
│   │   └── scripts/    # Docker scripts (setup-repl.sh, etc.)
│   ├── minikube/       # Local Kubernetes testing
│   │   ├── manifests/  # K8s manifests (base + overlays)
│   │   └── scripts/    # Minikube scripts
│   └── configs/        # Local configs
│       └── agents/     # Agent service configs
│
├── cloud/              # Cloud (Azure) deployment
│   └── terraform/      # Infrastructure as code
│       ├── modules/    # Reusable Terraform modules
│       ├── environments/# Per-environment configs
│       └── bootstrap/  # Bootstrap configs
│
├── shared/             # Shared across all deployments
│   └── configs/        # Common configuration
│       ├── deployments/# Deployment definitions (for CLI)
│       └── environments/# Environment templates
│
├── tools/              # Deployment tooling
│   └── deployment-cli/ # CLI orchestrator
│
└── docs/               # Infrastructure documentation
```

## 🚀 Quick Start

### Local Development (Docker)

Start all services locally with Docker Compose:

```bash
# Start databases and services
npm run deploy-local-up-all

# Or use individual commands
npm run deploy-local-databases    # Start databases only
npm run deploy-local-services     # Start services only

# Or use the interactive menu
npm run deploymentCli
```

**Where to find local development resources:**
- Docker Compose files: [local/docker/compose/](local/docker/compose/)
- Dockerfiles: [local/docker/dockerfiles/](local/docker/dockerfiles/)
- Docker scripts: [local/docker/scripts/](local/docker/scripts/)
- Agent configs: [local/configs/agents/](local/configs/agents/)

### Kubernetes Deployment (Minikube)

Deploy to Minikube for local Kubernetes testing:

```bash
# Deploy to Minikube (full setup)
npm run minikube-create

# Or just apply manifests (if Minikube already running)
npm run minikube-apply

# Cleanup Minikube environment
npm run minikube-cleanup
```

**Where to find Kubernetes resources:**
- Base manifests: [local/minikube/manifests/base/](local/minikube/manifests/base/)
- Environment overlays: [local/minikube/manifests/minikube/](local/minikube/manifests/minikube/)
- Deployment scripts: [local/minikube/scripts/](local/minikube/scripts/)

### Cloud Infrastructure (Terraform)

Provision cloud resources with Terraform:

```bash
cd cloud/terraform/environments/prod
terraform init
terraform plan
terraform apply
```

**Where to find Terraform resources:**
- Reusable modules: [cloud/terraform/modules/](cloud/terraform/modules/)
- Environment configs: [cloud/terraform/environments/](cloud/terraform/environments/)
- Bootstrap setup: [cloud/terraform/bootstrap/](cloud/terraform/bootstrap/)

## 📚 Developer Guide

### I want to...

#### 🐳 Work on local Docker development

**Find:** [local/docker/](local/docker/)

- **Modify database setup** → [local/docker/compose/docker-compose-db.yml](local/docker/compose/docker-compose-db.yml)
- **Modify service containers** → [local/docker/compose/docker-compose-services.yml](local/docker/compose/docker-compose-services.yml)
- **Update Dockerfiles** → [local/docker/dockerfiles/](local/docker/dockerfiles/)
- **Add docker scripts** → [local/docker/scripts/](local/docker/scripts/)
- **Configure agents** → [local/configs/agents/](local/configs/agents/)

**Common tasks:**
```bash
# Start just databases
npm run deploy-local-databases

# Start just services
npm run deploy-local-services

# Stop and remove all containers
npm run deploy-local-down-all

# Bootstrap test data
npm run deploymentCli local bootstrap
```

#### ☸️ Deploy to Kubernetes (Minikube)

**Find:** [local/minikube/](local/minikube/)

- **Modify base deployments** → [local/minikube/manifests/base/](local/minikube/manifests/base/)
- **Configure Minikube** → [local/minikube/manifests/minikube/](local/minikube/manifests/minikube/)
- **Configure prod overlay** → [local/minikube/manifests/prod/](local/minikube/manifests/prod/)
- **Deployment scripts** → [local/minikube/scripts/](local/minikube/scripts/)

**Key concepts:**
- **Base manifests**: Common K8s resources shared across all environments
- **Overlays**: Environment-specific configurations using Kustomize
- **Minikube overlay**: Includes RabbitMQ, connects to host databases
- **Prod overlay**: Production-ready configuration with replica scaling

**Common tasks:**
```bash
# Deploy to Minikube (local K8s testing)
npm run minikube-create

# Apply manifest changes
npm run minikube-apply

# Reset deployment
npm run minikube-reset

# Full cleanup
npm run minikube-cleanup

# Debug MongoDB connection
./local/minikube/scripts/debug-mongodb.sh
```

#### ☁️ Provision cloud infrastructure

**Find:** [cloud/terraform/](cloud/terraform/)

- **Create reusable modules** → [cloud/terraform/modules/](cloud/terraform/modules/)
- **Configure prod environment** → [cloud/terraform/environments/prod/](cloud/terraform/environments/prod/)
- **Bootstrap Azure** → [cloud/terraform/bootstrap/](cloud/terraform/bootstrap/)

**Available modules:**
- `eks/` - EKS Kubernetes cluster
- `mongodb-atlas/` - MongoDB Atlas managed database
- `networking/` - VPC, subnets, security groups

**Common tasks:**
```bash
# Bootstrap Azure subscription
cd cloud/terraform/bootstrap
terraform init
terraform apply

# Initialize Terraform for prod
cd cloud/terraform/environments/prod
terraform init

# Plan infrastructure changes
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure
terraform destroy
```

#### 🔧 Modify deployment automation

**Find:** [tools/deployment-cli/](tools/deployment-cli/)

- **CLI entry point** → [tools/deployment-cli/cli.ts](tools/deployment-cli/cli.ts)
- **Deployment logic** → [tools/deployment-cli/deployment.ts](tools/deployment-cli/deployment.ts)
- **Deployment configs** → [shared/configs/deployments/](shared/configs/deployments/)
  - [databases.json](shared/configs/deployments/databases.json)
  - [services.json](shared/configs/deployments/services.json)
  - [kubernetes.json](shared/configs/deployments/kubernetes.json)
  - [build.json](shared/configs/deployments/build.json)

**How it works:**
1. CLI reads configs from `shared/configs/deployments/`
2. User selects environment + deployment
3. Executes pre-build commands (e.g., build base images)
4. Runs docker compose or kubectl with specified files
5. Executes post-up commands (e.g., setup replica set)

**Adding new deployment:**
1. Create or edit JSON file in [shared/configs/deployments/](shared/configs/deployments/)
2. Add new deployment entry with name, shortName, environments
3. Specify composeFile(s), defaultArgs, and commands
4. Test with `npm run deploymentCli`

#### 📖 Find documentation

**Find:** [docs/](docs/)

- **Deployment guide** → [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Configuration guide** → [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
- **Configuration strategy** → [docs/CONFIGURATION-STRATEGY.md](docs/CONFIGURATION-STRATEGY.md)
- **Troubleshooting** → [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
- **Infrastructure roadmap** → [INFRASTRUCTURE-ROADMAP.md](INFRASTRUCTURE-ROADMAP.md)

## 🗺️ Infrastructure Roadmap

SrvThreds follows a **3-phase infrastructure evolution**:

### Phase 1: Local Development (Complete ✅)
- Docker Compose for databases and services
- Interactive deployment CLI
- Multi-stage Docker builds with shared builder
- Local development workflow

**Status:** Fully implemented and operational

### Phase 2: Minikube for Production-like Testing (Complete ✅)
- Kubernetes manifests for Minikube
- RabbitMQ runs in cluster
- MongoDB and Redis on host Docker (via `host.minikube.internal`)
- Kustomize overlays for configuration
- Local K8s development workflow

**Status:** Fully implemented and operational

### Phase 3: Cloud Deployment (In Progress 🚀)
- Terraform modules for cloud resources
- Azure AKS for Kubernetes
- Managed services for databases:
  - MongoDB Atlas
  - Azure Cache for Redis
  - Azure Service Bus / CloudAMQP
- Multi-environment (dev, staging, prod)

**Status:** Terraform bootstrap complete, modules in progress

**See:** [INFRASTRUCTURE-ROADMAP.md](INFRASTRUCTURE-ROADMAP.md) for details

## 🔑 Key Design Decisions

### Database Strategy

**Local Docker:** ✅ Databases run in containers on host Docker
- MongoDB (replica set)
- Redis
- RabbitMQ

**Minikube:** ✅ Services run in K8s, databases on host Docker
- Compute layer in Minikube
- Data layer on host (via `host.minikube.internal`)
- RabbitMQ runs in cluster as messaging layer

**Cloud:** 🚀 Use managed services
- MongoDB Atlas
- Azure Cache for Redis / Redis Cloud
- Azure Service Bus / CloudAMQP

**Why?**
- Managed services provide better reliability, backups, and scaling
- Reduces operational burden
- Focus development time on application, not database operations
- Minikube uses host databases to avoid resource overhead

### Kustomize Overlays

We use Kustomize for environment-specific configurations:

- **base/**: Common resources shared by all environments
- **minikube/**: Local testing with RabbitMQ in-cluster
- **prod/**: Production with replica scaling

### Docker Multi-stage Builds

Our Dockerfiles use a **builder pattern**:

1. `Dockerfile.builder` - Compiles TypeScript, installs dependencies
2. `Dockerfile` - Copies artifacts from builder, runs application
3. `Dockerfile.cmdRunner` - Extends builder for one-off commands

**Benefits:**
- Faster builds (shared builder is cached)
- Smaller production images
- Consistent build environment

## 📞 Common Commands

### Deployment CLI

```bash
# Interactive mode
npm run deploymentCli

# Docker deployments
npm run deploy-local-databases       # Start databases
npm run deploy-local-services        # Start services
npm run deploy-local-up-all          # Start everything
npm run deploy-local-down-all        # Stop everything

# Minikube deployments
npm run minikube-create              # Full Minikube setup
npm run minikube-apply               # Apply manifest changes
npm run minikube-reset               # Reset deployment
npm run minikube-cleanup             # Full cleanup
npm run minikube-validate            # Validate deployment

# Utilities
npm run deploymentCli -- local bootstrap    # Bootstrap data
npm run deploymentCli -- local build        # Build base image
```

### Docker Commands

```bash
# View logs
docker compose -f infrastructure/local/docker/compose/docker-compose-services.yml logs -f

# View specific service
docker logs -f srvthreds-engine

# Rebuild with no cache
docker compose -f infrastructure/local/docker/compose/docker-compose-services.yml build --no-cache

# Remove all containers and volumes
docker compose -f infrastructure/local/docker/compose/docker-compose-db.yml down -v
docker compose -f infrastructure/local/docker/compose/docker-compose-services.yml down -v
```

### Kubernetes Commands

```bash
# Apply manifests with Kustomize
kubectl apply -k infrastructure/local/minikube/manifests/minikube

# View resources
kubectl get pods -n srvthreds
kubectl get services -n srvthreds

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Port forward for local access
kubectl port-forward svc/srvthreds-session-agent 3000:3000 -n srvthreds

# Scale deployment
kubectl scale deployment srvthreds-engine --replicas=3 -n srvthreds
```

## 🔍 Troubleshooting

### Docker issues

**Problem:** MongoDB replica set initialization fails
**Solution:** Check [local/docker/scripts/setup-repl.sh](local/docker/scripts/setup-repl.sh) and container logs

**Problem:** Services can't connect to databases
**Solution:** Ensure databases are running: `docker ps | grep mongo`

**Problem:** Port conflicts
**Solution:** Check what's using ports: `lsof -i :27017` or `lsof -i :3000`

### Kubernetes issues

**Problem:** Pods not starting
**Solution:** Check events: `kubectl describe pod <pod-name> -n srvthreds`

**Problem:** Can't access services
**Solution:** Verify services: `kubectl get svc -n srvthreds`

**Problem:** MongoDB connection issues
**Solution:** Run debug script: `./local/minikube/scripts/debug-mongodb.sh`

**Problem:** Minikube can't reach host databases
**Solution:** Check connectivity: `kubectl exec -n srvthreds deployment/srvthreds-engine -- ping host.minikube.internal`

### More Help

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for comprehensive troubleshooting guide.

## 📦 Dependencies

### Local Development
- Docker Desktop or Docker Engine
- Docker Compose v2+
- Node.js 18+
- npm or yarn

### Kubernetes
- kubectl
- Minikube (for local K8s)
- Kustomize (usually bundled with kubectl)

### Cloud
- Terraform 1.5+
- Cloud CLI (azure-cli)
- Appropriate cloud credentials

## 🤝 Contributing

When adding infrastructure changes:

1. **Local changes** → Update [local/](local/) and test with deployment CLI
2. **K8s changes** → Update [local/minikube/manifests/base/](local/minikube/manifests/base/) and appropriate overlays
3. **Cloud changes** → Update Terraform modules in [cloud/terraform/modules/](cloud/terraform/modules/)
4. **Automation changes** → Update [tools/deployment-cli/](tools/deployment-cli/) and config JSON files
5. **Documentation** → Update this README and [docs/](docs/)

## 📄 License

See project root for license information.
