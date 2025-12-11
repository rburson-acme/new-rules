# DevOps Toolkit

Enterprise DevOps toolkit for Azure infrastructure and Kubernetes deployments. Provides local-to-cloud parity using Minikube for development and AKS for production.

## Features

- **Local Kubernetes Simulation** - Minikube environment mirrors cloud AKS deployments
- **Configuration-Driven** - Single `project.yaml` defines all services, images, and deployment targets
- **Unified CLI** - Same commands work for local and cloud deployments
- **Infrastructure as Code** - Terraform modules for Azure resources with dependency management
- **CI/CD Ready** - GitHub Actions workflows for automated deployments

## Quick Start

### Prerequisites

- Docker Desktop
- Minikube (v1.30+)
- kubectl
- Node.js (v18+)
- npm (v9+)

### Installation

```bash
npm install
```

### Local Development

```bash
# Generate configuration from project.yaml
npm run generate -p srvthreds

# Start everything (infrastructure + build + deploy)
npm run minikube -p srvthreds --build

# Check status
npm run minikube:status -p srvthreds
```

### Useful Commands

```bash
# Stop services (keep data)
npm run minikube:stop -p srvthreds

# Full reset (delete all data)
npm run minikube:reset -p srvthreds

# Rebuild after code changes
npm run minikube -p srvthreds --build

# Deploy specific profile only
npm run minikube -p srvthreds --profile infra
```

## Project Structure

```
devops/
├── .github/workflows/         # CI/CD pipelines
├── docs/                      # Documentation
│   ├── architecture.md        # System design
│   ├── deployment-guide.md    # Step-by-step deployment
│   └── troubleshooting.md     # Common issues
├── projects/                  # Project configurations
│   └── srvthreds/
│       ├── project.yaml       # Single source of truth
│       ├── manifests/         # Kubernetes manifests
│       │   ├── base/          # Base resources
│       │   └── overlays/      # Environment overrides
│       └── terraform/         # Infrastructure definitions
├── terraform/modules/         # Reusable Terraform modules
└── tools/
    ├── cli/                   # Main DevOps CLI
    ├── terraform-cli/         # Terraform orchestration
    └── shared/                # Common utilities
```

## CLI Reference

### Main CLI (Minikube)

| Command | What it does |
|---------|--------------|
| `npm run generate -p <project>` | Generate docker-compose.yaml from project.yaml |
| `npm run minikube -p <project>` | **Deploy** project to minikube |
| `npm run minikube -p <project> --build` | **Deploy** with image rebuild (use after code changes) |
| `npm run minikube:stop -p <project>` | Stop project's services (keeps data) |
| `npm run minikube:reset -p <project>` | Delete project's containers, volumes, K8s namespace |
| `npm run minikube:status -p <project>` | Show project's service status |
| `npm run minikube:delete` | Delete entire minikube cluster (all projects) |

**Note:** `minikube` is the deploy command. Use `--build` when images need rebuilding.

### Terraform CLI

| Command | Description |
|---------|-------------|
| `npm run terraform -- init -p <project> <env>` | Initialize stacks |
| `npm run terraform -- plan -p <project> <env>` | Preview changes |
| `npm run terraform -- deploy -p <project> <env>` | Deploy infrastructure |
| `npm run terraform -- destroy -p <project> <env>` | Destroy infrastructure |
| `npm run terraform -- status -p <project> <env>` | Check status |

## Documentation

- [Architecture Overview](docs/architecture.md) - System design and component relationships
- [Deployment Guide](docs/deployment-guide.md) - Step-by-step deployment instructions
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## Adding a New Project

1. Create `projects/<name>/project.yaml`
2. Create Kubernetes manifests in `manifests/base/` and `manifests/overlays/`
3. Create Terraform configuration in `terraform/`
4. Add CI/CD workflow in `.github/workflows/`

See [Deployment Guide](docs/deployment-guide.md#adding-a-new-project) for details.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Local K8s | Minikube |
| Cloud K8s | Azure AKS |
| Container Registry | Azure ACR |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |
| Configuration | YAML (project.yaml, kustomize) |
