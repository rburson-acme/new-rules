# DevOps - Infrastructure & Deployment Platform

A configuration-driven DevOps platform for managing deployments across local development (Minikube) and Azure cloud environments (AKS + Terraform).

## Overview

This platform provides infrastructure-as-code for deploying and managing applications in the threds monorepo. It combines Terraform for Azure infrastructure provisioning and Kubernetes for container orchestration, with TypeScript-based CLI tools for deployment automation.

### Key Features

- **Multi-Environment Support**: Deploy to local (Minikube), dev, test, and prod Azure environments
- **Configuration-Driven**: Single source of truth ([config-registry.yaml](configs/config-registry.yaml)) for deployment configurations
- **Type-Safe CLIs**: TypeScript command-line tools with comprehensive error handling
- **Infrastructure as Code**: Terraform modules for Azure resources (AKS, ACR, Key Vault, Cosmos DB, Redis, etc.)
- **Kubernetes Automation**: Kustomize-based manifest management for environment-specific configurations

### Primary Project

Currently configured for **srvthreds** - Event-driven workflow automation backend.

## Quick Start

### Prerequisites

**Required Tools:**
- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Minikube](https://minikube.sigs.k8s.io/docs/start/) (for local deployments)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (for cloud deployments)
- [Terraform](https://www.terraform.io/downloads) (for infrastructure provisioning)

**Installation:**

```bash
cd devops
npm install
npm run check
```

### Local Development (Minikube)

```bash
# Deploy to Minikube (creates cluster if needed)
npm run minikube:deploy

# Check deployment status
npm run minikube:status

# Reset deployment (keeps cluster running)
npm run minikube:reset

# Full cleanup (destroys cluster)
npm run minikube:cleanup
```

### Azure Cloud Deployment

```bash
# 1. Bootstrap Terraform state backend (one-time setup)
npm run tf:bootstrap

# 2. Initialize Terraform for an environment
npm run tf:init -- dev

# 3. Preview infrastructure changes
npm run tf:plan -- dev

# 4. Deploy infrastructure
npm run tf:apply -- dev

# 5. Deploy applications to AKS
npm run aks:deploy -- dev

# 6. Check deployment status
npm run aks:status -- dev
npm run tf:status -- dev
```

## Directory Structure

```
devops/
├── configs/                      # Configuration files
│   ├── config-registry.yaml      # Service definitions, ports, resources
│   └── terraform/
│       ├── stacks.json           # Stack definitions & dependencies
│       └── environments.json     # Environment metadata
│
├── docs/                         # Documentation
│   ├── AZURE_DEPLOYMENT.md
│   ├── MINIKUBE_DEPLOYMENT.md
│   ├── PROJECT_CONFIGURATION.md
│   └── TROUBLESHOOTING.md
│
├── kubernetes/                   # AKS manifests (Kustomize)
│   └── srvthreds/
│       ├── base/                 # Shared manifests
│       ├── dev/                  # Dev environment overlay
│       ├── test/                 # Test environment overlay
│       └── prod/                 # Production overlay
│
├── minikube/                     # Local Kubernetes development
│   └── srvthreds/
│       ├── configs/agents/       # Agent configuration files
│       ├── manifests/
│       │   ├── base/             # Base manifests
│       │   ├── minikube/         # Minikube-specific overlay
│       │   └── prod/             # Prod overlay
│       └── scripts/              # Helper scripts
│
├── projects/                     # Project-specific configs
│   └── srvthreds/
│       └── project.yaml          # Project metadata & paths
│
├── terraform/                    # Infrastructure as Code
│   ├── azure-pipelines/          # CI/CD pipelines
│   ├── modules/
│   │   ├── azure/                # Azure modules (11)
│   │   │   ├── acr/              # Container Registry
│   │   │   ├── aks/              # Kubernetes Service
│   │   │   ├── appgateway/       # Application Gateway
│   │   │   ├── cosmosdb/         # Cosmos DB (MongoDB API)
│   │   │   ├── keyvault/         # Key Vault
│   │   │   ├── monitoring/       # Log Analytics, App Insights
│   │   │   ├── networking/       # VNet, subnets, NSGs
│   │   │   ├── private-endpoint/ # Private endpoints
│   │   │   ├── rbac/             # Role-based access control
│   │   │   ├── redis/            # Cache for Redis
│   │   │   └── servicebus/       # Service Bus
│   │   ├── eks/                  # AWS EKS modules
│   │   ├── mongodb-atlas/        # MongoDB Atlas modules
│   │   └── networking/           # Cross-cloud networking
│   ├── stacks/srvthreds/         # srvthreds environment stacks
│   │   ├── _shared/              # Shared backend config
│   │   ├── acr/
│   │   ├── aks/
│   │   ├── appgateway/
│   │   ├── common/
│   │   ├── cosmosdb/
│   │   ├── keyvault/
│   │   ├── monitoring/
│   │   ├── networking/
│   │   ├── nginx-ingress/
│   │   ├── redis/
│   │   └── servicebus/
│   └── state-backend/            # Terraform state bootstrap
│
└── tools/                        # CLI tools (TypeScript)
    ├── kubernetes-cli/           # K8s deployment CLI
    │   ├── cli.ts                # Entry point (yargs)
    │   ├── commands/
    │   │   ├── aks.ts            # AKS commands
    │   │   ├── config.ts         # Config commands
    │   │   └── minikube.ts       # Minikube commands
    │   ├── config/
    │   │   └── project-loader.ts # Project config loader
    │   ├── test/
    │   └── utils/
    │       └── output.ts
    ├── kubernetes-deployer/      # Core deployment framework
    │   ├── src/
    │   │   ├── deployers/        # Deployer implementations
    │   │   ├── index.ts
    │   │   ├── operations/       # K8s operations
    │   │   ├── state/            # Deployment state
    │   │   ├── types/
    │   │   └── utils/
    │   └── test/
    ├── shared/                   # Shared utilities
    │   ├── config/
    │   │   └── validator.ts      # Config validation
    │   ├── config-loader.ts
    │   ├── error-handler.ts      # Error classes
    │   ├── logger.ts             # Logging framework
    │   └── shell.ts              # Shell command executor
    └── terraform-cli/            # Terraform management CLI
        ├── cli.ts                # Entry point
        ├── commands/             # 11 command files
        │   ├── bootstrap.ts
        │   ├── cleanup.ts
        │   ├── deploy.ts         # deploy + plan commands
        │   ├── destroy.ts
        │   ├── fix-symlinks.ts
        │   ├── import.ts
        │   ├── init.ts
        │   ├── output.ts
        │   ├── state.ts
        │   ├── status.ts
        │   └── validate-security.ts
        ├── test/
        ├── types/
        └── utils/
```

## Configuration

### Configuration Registry (`configs/config-registry.yaml`)

Single source of truth defining:
- Service definitions (images, ports, resources, replicas)
- Database configurations (MongoDB, Redis, RabbitMQ)
- Build paths and Docker contexts
- Connection strings (local, docker, kubernetes, minikube)
- Security settings (JWT, TLS)

**Services defined:**
- `builder` - Base builder image with compiled artifacts
- `bootstrap` - Database initialization and seeding
- `engine` - Main event processing engine
- `session-agent` - User session and participant management
- `persistence-agent` - Data persistence operations

**Databases defined:**
- `mongodb` - MongoDB replica set
- `redis` - Redis cache server
- `rabbitmq` - RabbitMQ message broker

### Project Configuration (`projects/srvthreds/project.yaml`)

Project-specific settings:
- Source paths to the project
- Docker image definitions
- Kubernetes namespace and deployments
- Manifest paths for Minikube and AKS

### Terraform Stack Dependencies

Stacks are defined in `configs/terraform/stacks.json` with dependencies:

```
networking (root)
├── keyvault
├── acr
├── cosmosdb
├── redis
└── monitoring

aks (depends on: networking, acr)
└── nginx-ingress (depends on: aks, networking)
```

## CLI Reference

### Terraform Commands

| Command | Description |
|---------|-------------|
| `npm run tf:init -- <env>` | Initialize Terraform for environment |
| `npm run tf:plan -- <env>` | Preview infrastructure changes |
| `npm run tf:apply -- <env>` | Deploy infrastructure |
| `npm run tf:destroy -- <env>` | Tear down infrastructure |
| `npm run tf:status -- <env>` | Check deployment status |
| `npm run tf:bootstrap` | Initialize state backend |
| `npm run tf:fix-symlinks` | Fix symlink consistency |
| `npm run tf:validate-security -- <env>` | Validate security config |
| `npm run tf:import -- <args>` | Import existing resources |
| `npm run tf:state -- <cmd> <env>` | Manage Terraform state |

### Kubernetes Commands

| Command | Description |
|---------|-------------|
| `npm run minikube:deploy` | Deploy to Minikube |
| `npm run minikube:reset` | Reset deployment (keeps cluster) |
| `npm run minikube:cleanup` | Destroy Minikube cluster |
| `npm run minikube:status` | Check Minikube status |
| `npm run aks:deploy -- <env>` | Deploy to AKS |
| `npm run aks:status -- <env>` | Check AKS status |

### Development Commands

| Command | Description |
|---------|-------------|
| `npm run check` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run format` | Format code with Prettier |
| `npm run config:validate` | Validate configuration |

## Advanced Usage

### Dry Run Mode

Preview deployments without making changes:

```bash
# Preview Minikube deployment
npm run k8s -- minikube deploy --dry-run

# Preview AKS deployment
npm run k8s -- aks deploy dev --dry-run

# Preview Terraform changes (always safe)
npm run tf:plan -- dev
```

### Verbose Logging

Enable detailed logging:

```bash
# Kubernetes deployments
npm run k8s -- minikube deploy -v

# Terraform operations
npm run terraform -- deploy dev --debug
```

### Selective Stack Deployment

Deploy specific Terraform stacks:

```bash
# Deploy only networking and AKS
npm run terraform -- deploy dev networking aks

# Deploy only databases
npm run terraform -- deploy dev cosmosdb redis
```

## Security

### Execution Policy

**READ-ONLY (no approval needed):**
- `kubectl get`, `kubectl describe`, `kubectl logs`
- `az show`, `az list`
- `terraform plan`, `terraform show`

**WRITE (require approval):**
- `terraform apply`, `terraform destroy`
- `kubectl apply`, `kubectl delete`
- Azure resource modifications

### Secrets Management

- Secrets stored in Azure Key Vault
- Environment variables injected at deployment time
- No secrets committed to version control
- `.env` files in `.gitignore`

## Documentation

- [Azure Deployment Guide](docs/AZURE_DEPLOYMENT.md)
- [Minikube Deployment Guide](docs/MINIKUBE_DEPLOYMENT.md)
- [Project Configuration Guide](docs/PROJECT_CONFIGURATION.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## Development

### Code Style

- TypeScript for all tooling
- Comprehensive error handling
- Logging at appropriate levels

### Testing

```bash
npm run test              # Run all tests
npm run check             # Type checking
npm run format            # Format code
```
