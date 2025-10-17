# SrvThreds Infrastructure

This directory contains all infrastructure-related code, configurations, and scripts for deploying SrvThreds across different environments.

## 📁 Directory Structure

```
infrastructure/
├── local/          # Docker-based local development
├── kubernetes/     # Kubernetes deployments (Minikube + Cloud)
├── terraform/      # Cloud infrastructure as code
├── deployment/     # Deployment CLI and automation
└── docs/          # Infrastructure documentation
```

## 🚀 Quick Start

### Local Development (Docker)

Start all services locally with Docker Compose:

```bash
# Start databases and services
npm run deploymentCli -- local s_a_dbs_s

# Or use the interactive menu
npm run deploymentCli
```

**Where to find local development resources:**
- Docker Compose files: [`local/compose/`](local/compose/)
- Dockerfiles: [`local/dockerfiles/`](local/dockerfiles/)
- Local scripts: [`local/scripts/`](local/scripts/)
- Environment configs: [`local/configs/`](local/configs/)

### Kubernetes Deployment (Minikube/Cloud)

Deploy to Kubernetes environments:

```bash
# Deploy to Minikube (local)
./kubernetes/scripts/deploy-dev.sh minikube

# Deploy to cloud dev environment
./kubernetes/scripts/deploy-dev.sh dev
```

**Where to find Kubernetes resources:**
- Base manifests: [`kubernetes/base/`](kubernetes/base/)
- Environment overlays: [`kubernetes/overlays/`](kubernetes/overlays/)
- Deployment scripts: [`kubernetes/scripts/`](kubernetes/scripts/)
- K8s configs: [`kubernetes/configs/`](kubernetes/configs/)

### Cloud Infrastructure (Terraform)

Provision cloud resources with Terraform:

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

**Where to find Terraform resources:**
- Reusable modules: [`terraform/modules/`](terraform/modules/)
- Environment configs: [`terraform/environments/`](terraform/environments/)

## 📚 Developer Guide

### I want to...

#### 🐳 Work on local Docker development

**Find:** [`local/`](local/)

- **Modify database setup** → [`local/compose/docker-compose-db.yml`](local/compose/docker-compose-db.yml)
- **Modify service containers** → [`local/compose/docker-compose-services.yml`](local/compose/docker-compose-services.yml)
- **Update Dockerfiles** → [`local/dockerfiles/`](local/dockerfiles/)
- **Add local scripts** → [`local/scripts/`](local/scripts/)
- **Configure environment** → [`local/configs/.env.local.example`](local/configs/.env.local.example)

**Common tasks:**
```bash
# Start just databases
npm run deploymentCli -- local s_a_dbs

# Start just services
npm run deploymentCli -- local s_a_s

# Stop and remove all containers
npm run deploymentCli -- local d_a_dbs_s

# Bootstrap test data
npm run deploymentCli -- local bootstrap
```

#### ☸️ Deploy to Kubernetes

**Find:** [`kubernetes/`](kubernetes/)

- **Modify base deployments** → [`kubernetes/base/`](kubernetes/base/)
- **Configure Minikube** → [`kubernetes/overlays/minikube/`](kubernetes/overlays/minikube/)
- **Configure dev/staging/prod** → [`kubernetes/overlays/{dev,staging,prod}/`](kubernetes/overlays/)
- **Deployment scripts** → [`kubernetes/scripts/`](kubernetes/scripts/)
- **K8s environment vars** → [`kubernetes/configs/`](kubernetes/configs/)

**Key concepts:**
- **Base manifests**: Common K8s resources shared across all environments
- **Overlays**: Environment-specific configurations using Kustomize
- **Minikube overlay**: Includes databases (for local testing)
- **Cloud overlays**: Exclude databases (use managed services)

**Common tasks:**
```bash
# Deploy to Minikube
./kubernetes/scripts/deploy-dev.sh minikube

# Deploy to cloud dev
./kubernetes/scripts/deploy-dev.sh dev

# Deploy to production
./kubernetes/scripts/deploy-prod.sh

# Debug MongoDB in K8s
./kubernetes/scripts/debug-mongodb.sh
```

#### ☁️ Provision cloud infrastructure

**Find:** [`terraform/`](terraform/)

- **Create reusable modules** → [`terraform/modules/`](terraform/modules/)
- **Configure dev environment** → [`terraform/environments/dev/`](terraform/environments/dev/)
- **Configure staging** → [`terraform/environments/staging/`](terraform/environments/staging/)
- **Configure production** → [`terraform/environments/prod/`](terraform/environments/prod/)

**Available modules:**
- `eks/` - EKS Kubernetes cluster
- `mongodb-atlas/` - MongoDB Atlas managed database
- `redis/` - Redis managed service (ElastiCache/Redis Cloud)
- `rabbitmq/` - RabbitMQ managed service (CloudAMQP)
- `networking/` - VPC, subnets, security groups

**Common tasks:**
```bash
# Initialize Terraform for dev
cd terraform/environments/dev
terraform init

# Plan infrastructure changes
terraform plan

# Apply changes
terraform apply

# Destroy infrastructure
terraform destroy
```

#### 🔧 Modify deployment automation

**Find:** [`deployment/`](deployment/)

- **CLI entry point** → [`deployment/cli.ts`](deployment/cli.ts)
- **Deployment logic** → [`deployment/deployment.ts`](deployment/deployment.ts)
- **Deployment config** → [`deployment/configs/containerDeploymentConfig.json`](deployment/configs/containerDeploymentConfig.json)
- **Build assets** → [`deployment/assets/`](deployment/assets/)

**How it works:**
1. CLI reads config from `containerDeploymentConfig.json`
2. User selects environment + deployment
3. Executes pre-build commands (e.g., build base images)
4. Runs docker compose with specified files
5. Executes post-up commands (e.g., setup replica set)

**Adding new deployment:**
1. Edit [`deployment/configs/containerDeploymentConfig.json`](deployment/configs/containerDeploymentConfig.json)
2. Add new deployment entry with name, shortName, environments
3. Specify composeFile(s), defaultArgs, and commands
4. Test with `npm run deploymentCli`

#### 📖 Find documentation

**Find:** [`docs/`](docs/)

- **Deployment guide** → [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Configuration guide** → [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md)
- **Architecture overview** → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **Infrastructure roadmap** → [`INFRASTRUCTURE-ROADMAP.md`](INFRASTRUCTURE-ROADMAP.md)

## 🗺️ Infrastructure Roadmap

SrvThreds follows a **3-phase infrastructure evolution**:

### Phase 1: Local Development (Complete ✅)
- Docker Compose for databases and services
- Interactive deployment CLI
- Multi-stage Docker builds with shared builder
- Local development workflow

**Status:** Fully implemented and operational

### Phase 2: Minikube for Production-like Testing (Next 🚀)
- Kubernetes manifests for Minikube
- Includes databases in cluster (for testing)
- Kustomize overlays for configuration
- Local K8s development workflow

**Status:** Infrastructure ready, manifests in progress

### Phase 3: Cloud Deployment (Planned 📋)
- Terraform modules for cloud resources
- EKS/GKE/AKS for Kubernetes
- Managed services for databases:
  - MongoDB Atlas
  - Redis Cloud / ElastiCache
  - CloudAMQP / Amazon MQ
- Multi-environment (dev, staging, prod)

**Status:** Terraform modules created, ready for configuration

**See:** [INFRASTRUCTURE-ROADMAP.md](INFRASTRUCTURE-ROADMAP.md) for details

## 🔑 Key Design Decisions

### Databases in Kubernetes?

**Local (Minikube):** ✅ Yes - databases run in cluster for self-contained testing

**Cloud (EKS/GKE):** ❌ No - use managed services (Atlas, ElastiCache, CloudAMQP)

**Why?**
- Managed services provide better reliability, backups, and scaling
- Reduces operational burden
- Focus development time on application, not database operations

### Kustomize Overlays

We use Kustomize for environment-specific configurations:

- **base/**: Common resources shared by all environments
- **overlays/minikube/**: Local testing with databases
- **overlays/dev/**: Cloud dev without databases
- **overlays/staging/**: Cloud staging without databases
- **overlays/prod/**: Cloud production without databases, replica scaling

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

# Direct commands
npm run deploymentCli -- local s_a_dbs      # Start databases
npm run deploymentCli -- local s_a_s        # Start services
npm run deploymentCli -- local s_a_dbs_s    # Start all
npm run deploymentCli -- local d_a_dbs_s    # Stop all

# Individual services
npm run deploymentCli -- local s_s          # Start server
npm run deploymentCli -- local s_sa         # Start session agent
npm run deploymentCli -- local s_pa         # Start persistence agent

# Utilities
npm run deploymentCli -- local bootstrap    # Bootstrap data
npm run deploymentCli -- local build        # Build base image
```

### Docker Commands

```bash
# View logs
docker compose -f infrastructure/local/compose/docker-compose-services.yml logs -f

# View specific service
docker logs -f srvthreds-engine

# Rebuild with no cache
docker compose -f infrastructure/local/compose/docker-compose-services.yml build --no-cache

# Remove all containers and volumes
docker compose -f infrastructure/local/compose/docker-compose-db.yml down -v
docker compose -f infrastructure/local/compose/docker-compose-services.yml down -v
```

### Kubernetes Commands

```bash
# Apply manifests with Kustomize
kubectl apply -k infrastructure/kubernetes/overlays/minikube

# View resources
kubectl get pods -n srvthreds
kubectl get services -n srvthreds

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Port forward for local access
kubectl port-forward svc/srvthreds-session-agent 3000:3000 -n srvthreds
```

## 🔍 Troubleshooting

### Docker issues

**Problem:** MongoDB replica set initialization fails
**Solution:** Check [`local/scripts/setup-repl.sh`](local/scripts/setup-repl.sh) and container logs

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
**Solution:** Run debug script: `./kubernetes/scripts/debug-mongodb.sh`

### Terraform issues

**Problem:** State lock conflicts
**Solution:** Ensure no other `terraform apply` is running, or force-unlock if needed

**Problem:** Resource already exists
**Solution:** Import existing resource or modify naming

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
- Cloud CLI (aws-cli, gcloud, or az)
- Appropriate cloud credentials

## 🤝 Contributing

When adding infrastructure changes:

1. **Local changes** → Update [`local/`](local/) and test with deployment CLI
2. **K8s changes** → Update [`kubernetes/base/`](kubernetes/base/) and appropriate overlays
3. **Cloud changes** → Update Terraform modules in [`terraform/modules/`](terraform/modules/)
4. **Automation changes** → Update [`deployment/`](deployment/) and config JSON
5. **Documentation** → Update this README and [`docs/`](docs/)

## 📄 License

See project root for license information.
