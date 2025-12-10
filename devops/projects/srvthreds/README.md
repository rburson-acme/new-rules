# srvthreds Project

Event-driven workflow automation backend - deployment configuration and infrastructure.

## Overview

This directory contains all deployment configuration, infrastructure definitions, and Kubernetes manifests for the srvthreds application.

## Directory Structure

```
srvthreds/
├── project.yaml           # Project configuration
├── deployments/           # Deployment configurations
│   ├── services.json      # Application service deployments
│   ├── databases.json     # Database setup/teardown
│   └── build.json         # Build configurations
├── docker/
│   ├── compose/           # Docker Compose files
│   ├── dockerfiles/       # Dockerfile definitions
│   └── assets/            # Docker build assets
├── kubernetes/            # AKS Kubernetes manifests
├── minikube/
│   ├── manifests/         # Minikube-specific manifests
│   └── configs/           # Agent configuration files
└── terraform/
    ├── stacks/            # Infrastructure stacks
    ├── stacks.json        # Stack definitions
    └── environments.json  # Environment configuration
```

## Quick Start

### Local Development (Minikube)

```bash
# 1. Start databases
npm run k8s -- minikube run s_a_dbs -p srvthreds

# 2. Deploy to Minikube (with build config)
npm run k8s -- minikube deploy -p srvthreds -d build_server

# 3. Check status
npm run minikube:srvthreds:status

# 4. Port forward to access
kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds

# 5. Access at http://localhost:3000
```

### Cloud Deployment (AKS)

```bash
# Deploy to dev (with build config)
npm run k8s -- aks deploy dev -p srvthreds -d build_server

# Deploy to production
npm run k8s -- aks deploy prod -p srvthreds -d build_server --tag v1.0.0
```

## Services

| Service | Description | Port |
|---------|-------------|------|
| srvthreds-engine | Core workflow engine | 3001 |
| srvthreds-session-agent | Session management | 3000 |
| srvthreds-persistence-agent | Data persistence | 3002 |

## Infrastructure

### Terraform Stacks

| Stack | Description | Dependencies |
|-------|-------------|--------------|
| networking | VNet, subnets, NSGs | - |
| keyvault | Azure Key Vault | networking |
| acr | Container Registry | - |
| servicebus | Azure Service Bus | networking |
| cosmosdb | Cosmos DB | networking, keyvault |
| redis | Azure Redis Cache | networking, keyvault |
| aks | Kubernetes cluster | networking, keyvault, acr |
| monitoring | Log Analytics, App Insights | aks |

### Environments

| Environment | Resource Group | Description |
|-------------|----------------|-------------|
| dev | CAZ-SRVTHREDS-D-E-RG | Development |
| test | CAZ-SRVTHREDS-T-E-RG | Testing/Staging |
| prod | CAZ-SRVTHREDS-P-E-RG | Production |

## Deployment Configurations

### Available Deployments

| shortName | Name | Description |
|-----------|------|-------------|
| `s_a_dbs` | Start All Databases | Start MongoDB and Redis |
| `d_a_dbs` | Stop All Databases | Stop database containers |
| `s_a_s` | Start All Services | Start application services |
| `build_server` | Build Server | Build all Docker images |

### Usage

```bash
# Run a specific deployment
npm run k8s -- minikube run <shortName> -p srvthreds

# Examples
npm run k8s -- minikube run s_a_dbs -p srvthreds
npm run k8s -- minikube run build_server -p srvthreds --use-minikube-docker
```

## Configuration Files

### project.yaml

Main project configuration defining paths, services, and settings.

Key sections:
- `source.path` - Path to source code
- `docker` - Docker configuration
- `kubernetes` - K8s namespace and deployments
- `azure` - Azure naming convention

### deployments/*.json

Deployment definitions specifying:
- Docker Compose commands
- Pre/post build hooks
- Environment-specific overrides

See [Deployment Configs](../../docs/deployment-configs.md) for schema details.

### terraform/stacks.json

Infrastructure stack definitions with dependencies.

### terraform/environments.json

Environment-specific Azure configuration:
- Subscription IDs
- Resource group names
- State backend settings

## Development Workflow

### Making Changes

1. **Infrastructure changes**: Modify Terraform stacks in `terraform/stacks/`
2. **Deployment changes**: Update `deployments/*.json`
3. **Kubernetes changes**: Update manifests in `kubernetes/` or `minikube/`

### Testing Locally

```bash
# 1. Make changes
# 2. Deploy to Minikube
npm run minikube:srvthreds:deploy

# 3. Test
# 4. Reset if needed
npm run minikube:srvthreds:reset
```

### Deploying to Cloud

```bash
# 1. Deploy infrastructure
npm run tf:srvthreds:apply -- dev

# 2. Deploy application
npm run aks:srvthreds:deploy -- dev

# 3. Validate
npm run aks:srvthreds:status -- dev
```

## Troubleshooting

### Common Issues

**Minikube deployment fails:**
```bash
# Check Minikube status
minikube status

# Check pod logs
kubectl logs -f <pod-name> -n srvthreds

# Describe pod for events
kubectl describe pod <pod-name> -n srvthreds
```

**Database connection issues:**
```bash
# Verify databases are running
docker ps | grep mongo
docker ps | grep redis

# Check database logs
docker logs mongo-repl-1
```

**AKS deployment fails:**
```bash
# Check Azure login
az account show

# Get cluster credentials
az aks get-credentials --resource-group CAZ-SRVTHREDS-D-E-RG --name CAZ-SRVTHREDS-D-E-AKS

# Check pod status
kubectl get pods -n srvthreds
```

## Related Documentation

- [Configuration Guide](../../docs/configuration.md)
- [Kubernetes CLI](../../docs/kubernetes-cli.md)
- [Terraform CLI](../../docs/terraform-cli.md)
- [Deployment Configs](../../docs/deployment-configs.md)
- [Architecture](../../docs/architecture.md)
