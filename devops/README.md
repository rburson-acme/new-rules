# DevOps - Infrastructure & Deployment Platform

A comprehensive, configuration-driven DevOps platform for managing multi-project deployments across local development (Minikube) and Azure cloud environments (AKS + Terraform).

## Overview

This DevOps platform provides a unified infrastructure-as-code solution for deploying and managing applications in the threds monorepo. It combines Terraform for Azure infrastructure provisioning and Kubernetes for container orchestration, with sophisticated TypeScript-based CLI tools for deployment automation.

### Key Features

- **Multi-Environment Support**: Deploy to local (Minikube), development, testing, and production Azure environments
- **Configuration-Driven**: Single source of truth ([config-registry.yaml](configs/config-registry.yaml)) for all deployment configurations
- **Type-Safe CLIs**: TypeScript-based command-line tools with comprehensive error handling
- **Infrastructure as Code**: Terraform modules for Azure resources (AKS, ACR, Key Vault, Cosmos DB, Redis, etc.)
- **Kubernetes Automation**: Kustomize-based manifest management for environment-specific configurations
- **Project Extensibility**: Designed to support multiple projects beyond srvthreds

### Supported Projects

Currently configured for:
- **srvthreds** - Event-driven workflow automation backend (primary)
- **thredclient** - Client application (configurable)
- **thredlib** - Shared library (configurable)
- **demo-env** - Demo environment (configurable)

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
# Clone the repository
cd devops

# Install dependencies
npm install

# Verify setup
npm run check
```

### Local Development (Minikube)

Deploy srvthreds to your local Minikube cluster:

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

Deploy infrastructure and applications to Azure:

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

## Architecture

### Directory Structure

```
devops/
├── cloud/                      # Cloud deployment configurations
│   ├── kubernetes/             # AKS Kubernetes manifests (Kustomize)
│   │   └── srvthreds/          # srvthreds AKS configurations
│   │       ├── base/           # Base manifests (shared)
│   │       ├── dev/            # Dev environment overlays
│   │       ├── test/           # Test environment overlays
│   │       └── prod/           # Production environment overlays
│   └── terraform/              # Terraform infrastructure modules
│       ├── modules/            # Reusable Terraform modules
│       │   ├── networking/     # VNet, subnets, NSGs
│       │   ├── aks/            # Azure Kubernetes Service
│       │   ├── acr/            # Azure Container Registry
│       │   ├── keyvault/       # Azure Key Vault
│       │   ├── cosmosdb/       # Cosmos DB (MongoDB API)
│       │   ├── redis/          # Azure Cache for Redis
│       │   └── rabbitmq/       # RabbitMQ (VM-based)
│       └── stacks/             # Environment-specific stacks
│           ├── dev/            # Development stack
│           ├── test/           # Test stack
│           └── prod/           # Production stack
│
├── local/                      # Local development configurations
│   ├── minikube/               # Minikube Kubernetes manifests
│   │   └── srvthreds/          # srvthreds Minikube configurations
│   │       └── manifests/      # Kustomize manifests
│   └── configs/                # Local environment configs
│
├── configs/                    # Configuration management
│   ├── config-registry.yaml    # Single source of truth
│   └── terraform/              # Terraform stack definitions
│       ├── stacks.json         # Stack configurations
│       └── environments.json   # Environment configurations
│
├── projects/                   # Project-specific configurations
│   ├── srvthreds/              # srvthreds project config
│   │   └── project.yaml        # Project metadata & paths
│   ├── thredclient/            # thredclient project config
│   ├── thredlib/               # thredlib project config
│   └── demo-env/               # demo-env project config
│
├── tools/                      # CLI tooling (TypeScript)
│   ├── terraform-cli/          # Terraform management CLI
│   │   ├── cli.ts              # Main CLI entry point
│   │   ├── commands/           # Command implementations
│   │   └── utils/              # Terraform utilities
│   ├── kubernetes-cli/         # Kubernetes deployment CLI
│   │   ├── cli.ts              # Main CLI entry point
│   │   ├── commands/           # Command implementations
│   │   │   ├── minikube.ts     # Minikube commands
│   │   │   ├── aks.ts          # AKS commands
│   │   │   └── config.ts       # Config management
│   │   └── config/             # Configuration loaders
│   ├── kubernetes-deployer/    # Core deployment framework
│   │   └── src/
│   │       ├── deployers/      # Deployer implementations
│   │       │   ├── BaseDeployer.ts        # Abstract base
│   │       │   ├── MinikubeDeployer.ts    # Minikube deployer
│   │       │   └── AKSDeployer.ts         # AKS deployer
│   │       ├── operations/     # Kubernetes operations
│   │       │   └── KubernetesClient.ts    # kubectl wrapper
│   │       ├── state/          # Deployment state management
│   │       ├── types/          # TypeScript type definitions
│   │       └── utils/          # Shared utilities
│   └── shared/                 # Shared utilities
│       ├── logger.ts           # Logging framework
│       ├── shell.ts            # Shell command executor
│       ├── error-handler.ts    # Error handling
│       └── config/             # Config generation & validation
│
├── docs/                       # Documentation
│   ├── PROJECT_CONFIGURATION.md    # How to configure projects
│   ├── AZURE_DEPLOYMENT.md         # Azure deployment guide
│   ├── MINIKUBE_DEPLOYMENT.md      # Minikube deployment guide
│   └── TROUBLESHOOTING.md          # Common issues & solutions
│
└── test/                       # Tests
    ├── unit/                   # Unit tests
    └── integration/            # Integration tests
```

### Component Overview

#### 1. Configuration Registry (`configs/config-registry.yaml`)

Single source of truth defining:
- Service definitions (images, ports, resources, replicas)
- Database configurations (MongoDB, Redis, RabbitMQ)
- Build paths and Docker contexts
- Connection strings (local, docker, kubernetes, minikube)
- Security settings (JWT, TLS)
- Cloud-specific configurations

#### 2. Terraform CLI (`tools/terraform-cli/`)

Manages Azure infrastructure with commands:
- `init` - Initialize Terraform for an environment
- `plan` - Preview infrastructure changes
- `deploy` - Apply infrastructure changes
- `destroy` - Tear down infrastructure
- `status` - Check deployment status
- `bootstrap` - Initialize state backend
- `validate-security` - Validate security configurations
- `import` - Import existing Azure resources
- `state` - Manage Terraform state

#### 3. Kubernetes CLI (`tools/kubernetes-cli/`)

Manages Kubernetes deployments with commands:
- `minikube deploy` - Deploy to local Minikube
- `minikube reset` - Reset Minikube deployment
- `minikube cleanup` - Destroy Minikube cluster
- `minikube status` - Check Minikube status
- `aks deploy <env>` - Deploy to Azure AKS
- `aks status <env>` - Check AKS deployment status
- `config list` - List available projects

#### 4. Kubernetes Deployer Framework (`tools/kubernetes-deployer/`)

Core framework providing:
- Abstract base deployer with deployment lifecycle
- Minikube deployer for local development
- AKS deployer for Azure cloud
- Kubernetes client for kubectl operations
- Retry logic with exponential backoff
- Comprehensive error handling
- Deployment state management

## Configuration Management

### Configuration Registry Structure

The [config-registry.yaml](configs/config-registry.yaml) defines all deployment configurations:

```yaml
# Application metadata
metadata:
  name: srvthreds
  namespace: srvthreds
  version: "1.0.0"

# Service definitions
services:
  engine:
    name: srvthreds-engine
    image:
      repository: srvthreds/engine
      tag: latest
    ports:
      http: 8082
    resources:
      memory:
        request: 256Mi
        limit: 512Mi
      cpu:
        request: 200m
        limit: 500m
    replicas:
      dev: 1
      staging: 2
      production: 3

# Database definitions
databases:
  mongodb:
    name: mongo-repl-1
    port: 27017
    resources: {...}
  redis:
    name: redis
    port: 6379
    resources: {...}
  rabbitmq:
    name: rabbitmq
    ports:
      amqp: 5672
      management: 15672
    resources: {...}

# Connection strings for different environments
connectionStrings:
  local:
    mongodb: "localhost:27017"
    redis: "localhost:6379"
    rabbitmq: "localhost"
  kubernetes:
    mongodb: "mongodb-service:27017"
    redis: "redis-service:6379"
    rabbitmq: "rabbitmq-service"
  minikube:
    mongodb: "host.minikube.internal:27017"
    redis: "host.minikube.internal:6379"
    rabbitmq: "rabbitmq-service"
```

### Project Configuration

Each project has a `project.yaml` file in `projects/<project-name>/`:

```yaml
name: srvthreds
description: Event-driven workflow automation backend

source:
  path: ../srvthreds
  composePath: infrastructure/local/docker/compose
  configPath: infrastructure/shared/configs/deployments

docker:
  builderImage: srvthreds/builder
  services:
    - name: engine
      image: srvthreds/engine
    - name: session-agent
      image: srvthreds/session-agent

kubernetes:
  namespace: srvthreds
  deployments:
    - srvthreds-engine
    - srvthreds-session-agent

minikube:
  manifestPath: local/minikube/srvthreds/manifests/minikube/

aks:
  manifestPath: cloud/kubernetes/srvthreds/
  environments:
    - dev
    - test
    - prod
```

## Deployment Workflows

### Minikube Deployment Flow

1. **Pre-deployment Checks**
   - Verify Docker daemon is running
   - Check Minikube installation
   - Start Minikube cluster if needed (with configured resources)
   - Configure kubectl context
   - Ensure namespace exists

2. **Build Images**
   - Configure Docker to use Minikube environment
   - Build images using project's deployment CLI
   - Tag images for Minikube

3. **Setup Databases**
   - Start MongoDB and Redis on host Docker (accessible via host.minikube.internal)
   - Initialize MongoDB replica set
   - Verify database health

4. **Apply Manifests**
   - Apply Kustomize manifests to cluster
   - Create ConfigMaps, Secrets, Deployments, Services

5. **Wait for Readiness**
   - Monitor deployment rollout status
   - Check pod readiness probes
   - Verify all replicas are ready

6. **Validation**
   - Check pod status
   - Verify services are running
   - Report any issues

### AKS Deployment Flow

1. **Pre-deployment Checks**
   - Verify Azure CLI installation and authentication
   - Check AKS cluster exists and is accessible
   - Get AKS credentials and configure kubectl
   - Verify ACR (Azure Container Registry) access
   - Ensure namespace exists

2. **Build Images**
   - Build images for linux/amd64 platform
   - Tag images for ACR

3. **Push Images**
   - Login to Azure Container Registry
   - Push all images to ACR
   - Verify successful push

4. **Apply Manifests**
   - Apply Kustomize manifests to AKS cluster
   - Use server-side apply for better conflict resolution
   - Create environment-specific resources

5. **Wait for Readiness**
   - Monitor deployment rollout
   - Check replica counts
   - Verify health checks pass

6. **Validation**
   - Validate pod status
   - Check service endpoints
   - Report deployment health

### Terraform Deployment Flow

1. **Bootstrap** (one-time setup)
   - Create Azure resource group for Terraform state
   - Create storage account and container
   - Configure backend authentication

2. **Initialize**
   - Initialize Terraform working directory
   - Download provider plugins
   - Configure remote state backend

3. **Plan**
   - Generate and review execution plan
   - Show resource changes (create, update, delete)
   - Estimate costs (if configured)

4. **Apply**
   - Execute planned changes
   - Create/update Azure resources
   - Update state file

5. **Validation**
   - Verify resource creation
   - Check resource health
   - Output important values (connection strings, endpoints)

## Environment-Specific Configuration

### Development Environment

- **Terraform Stack**: `cloud/terraform/stacks/dev/`
- **AKS Manifests**: `cloud/kubernetes/srvthreds/dev/`
- **Naming Convention**: `CAZ-SRVTHREDS-D-E-*`
- **Resources**: Lower tier (cost-optimized)
- **Replicas**: 1 per service

### Test Environment

- **Terraform Stack**: `cloud/terraform/stacks/test/`
- **AKS Manifests**: `cloud/kubernetes/srvthreds/test/`
- **Naming Convention**: `CAZ-SRVTHREDS-T-E-*`
- **Resources**: Mid-tier
- **Replicas**: 2 per service

### Production Environment

- **Terraform Stack**: `cloud/terraform/stacks/prod/`
- **AKS Manifests**: `cloud/kubernetes/srvthreds/prod/`
- **Naming Convention**: `CAZ-SRVTHREDS-P-E-*`
- **Resources**: Production-grade (high availability)
- **Replicas**: 3+ per service

## CLI Reference

### Terraform Commands

```bash
# Initialize Terraform for an environment
npm run tf:init -- <env>

# Preview changes
npm run tf:plan -- <env>

# Apply changes
npm run tf:apply -- <env>

# Destroy infrastructure
npm run tf:destroy -- <env>

# Check status
npm run tf:status -- <env>

# Bootstrap state backend (one-time)
npm run tf:bootstrap

# Fix symlink issues
npm run tf:fix-symlinks

# Validate security configuration
npm run tf:validate-security -- <env> <resource-group>

# Import existing resource
npm run tf:import -- <stack> <resource-type> <resource-name> <azure-id>

# Manage state
npm run tf:state -- <command> <env>
```

### Kubernetes Commands

```bash
# Minikube deployment
npm run minikube:deploy        # Deploy to Minikube
npm run minikube:reset         # Reset deployment
npm run minikube:cleanup       # Destroy cluster
npm run minikube:status        # Check status

# AKS deployment
npm run aks:deploy -- <env>    # Deploy to AKS (dev|test|prod)
npm run aks:status -- <env>    # Check AKS status

# Configuration
npm run config:generate        # Generate configs from registry
npm run config:validate        # Validate configuration
```

### Development Commands

```bash
# Type checking
npm run check

# Run tests
npm test

# Format code
npm run format
```

## Advanced Features

### Dry Run Mode

Test deployments without making actual changes:

```bash
# Preview Minikube deployment
npm run k8s -- minikube deploy --dry-run

# Preview AKS deployment
npm run k8s -- aks deploy dev --dry-run

# Preview Terraform changes (always safe)
npm run tf:plan -- dev
```

### Verbose Logging

Enable detailed logging for debugging:

```bash
# Kubernetes deployments
npm run k8s -- minikube deploy -v

# Terraform operations
npm run terraform -- deploy dev --debug
```

### Project Selection

Deploy specific projects:

```bash
# Deploy a specific project to Minikube
npm run k8s -- minikube deploy --project demo-env

# List available projects
npm run k8s -- config list
```

### Selective Stack Deployment

Deploy specific Terraform stacks:

```bash
# Deploy only networking and AKS
npm run terraform -- deploy dev networking aks

# Deploy only databases
npm run terraform -- deploy dev cosmosdb redis
```

## Security Considerations

### Execution Policy

**READ-ONLY commands (no approval needed):**
- `kubectl get`, `kubectl describe`, `kubectl logs`
- `az show`, `az list`
- `terraform plan`, `terraform show`
- All status and info commands

**WRITE commands (require explicit approval):**
- `terraform apply`, `terraform destroy`
- `kubectl apply`, `kubectl delete`
- Any Azure resource modifications
- Database operations

See [.claude/CLAUDE.md](.claude/CLAUDE.md) for AI assistant execution policies.

### Secrets Management

- Secrets stored in Azure Key Vault
- Environment variables injected at deployment time
- No secrets committed to version control
- `.env` files in `.gitignore`

### Network Security

- Network Security Groups (NSGs) for traffic filtering
- Private endpoints for databases
- TLS/SSL for all external connections
- Service mesh (future consideration)

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --grep "terraform"
npm test -- --grep "kubernetes"

# Run with coverage
npm test -- --coverage
```

## Documentation

Detailed guides are available in the [docs/](docs/) directory:

- [Project Configuration Guide](docs/PROJECT_CONFIGURATION.md) - How to add and configure new projects
- [Azure Deployment Guide](docs/AZURE_DEPLOYMENT.md) - Comprehensive Azure deployment instructions
- [Minikube Deployment Guide](docs/MINIKUBE_DEPLOYMENT.md) - Local development setup and workflows
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common issues and solutions

## Contributing

### Code Style

- TypeScript for all tooling
- Functional programming patterns preferred
- Comprehensive error handling required
- Logging at appropriate levels

### Pull Request Process

1. Run type checking: `npm run check`
2. Run tests: `npm test`
3. Format code: `npm run format`
4. Update documentation as needed
5. Test deployment in dev environment

### Adding New Projects

See [Project Configuration Guide](docs/PROJECT_CONFIGURATION.md) for detailed instructions on adding new projects to the platform.

## Roadmap

- [ ] Support for additional cloud providers (AWS, GCP)
- [ ] GitOps integration (ArgoCD, Flux)
- [ ] Service mesh integration (Istio, Linkerd)
- [ ] Observability stack (Prometheus, Grafana, Jaeger)
- [ ] Cost optimization and reporting
- [ ] Multi-region deployments
- [ ] Disaster recovery automation
- [ ] Infrastructure drift detection
- [ ] Automated security scanning

## License

Internal use only - part of the threds monorepo.

## Support

For issues, questions, or contributions:
- Create an issue in the monorepo
- Contact the DevOps team
- Refer to [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
