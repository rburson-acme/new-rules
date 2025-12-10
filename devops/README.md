# DevOps Infrastructure

Enterprise-grade DevOps tooling for managing Azure infrastructure and Kubernetes deployments. This repository provides a complete infrastructure-as-code solution with type-safe CLI tools, multi-environment support, and comprehensive deployment automation.

## Overview

This DevOps toolkit consists of three main components:

| Component | Purpose | Location |
|-----------|---------|----------|
| **Terraform CLI** | Azure infrastructure management | `tools/terraform-cli/` |
| **Kubernetes CLI** | Kubernetes deployment orchestration | `tools/kubernetes-cli/` |
| **Kubernetes Deployer** | Deployment execution library | `tools/kubernetes-deployer/` |

## Quick Start

### Prerequisites

- Node.js 18+
- Azure CLI (`az`) - logged in with appropriate permissions
- Terraform 1.5+
- kubectl configured for your clusters
- Docker (for Minikube deployments)
- Minikube (for local development)

### Installation

```bash
cd devops
npm install
```

### Common Commands

```bash
# Terraform Operations (for srvthreds project)
npm run tf:srvthreds:init -- dev           # Initialize Terraform for dev
npm run tf:srvthreds:plan -- dev           # Preview infrastructure changes
npm run tf:srvthreds:apply -- dev          # Deploy infrastructure
npm run tf:srvthreds:status -- dev         # Check deployment status

# Minikube (Local Development)
npm run minikube:srvthreds:deploy          # Deploy to local Minikube
npm run minikube:srvthreds:status          # Check Minikube status
npm run minikube:srvthreds:cleanup         # Clean up Minikube

# AKS (Azure Kubernetes Service)
npm run aks:srvthreds:deploy -- dev        # Deploy to AKS dev environment
npm run aks:srvthreds:status -- dev        # Check AKS status
```

## Project Structure

```
devops/
├── projects/                    # Project-specific configurations
│   └── srvthreds/              # Example project
│       ├── project.yaml        # Project configuration
│       ├── deployments/        # Deployment configurations
│       ├── docker/             # Docker compose & Dockerfiles
│       ├── kubernetes/         # AKS manifests
│       ├── minikube/           # Minikube manifests
│       └── terraform/          # Infrastructure stacks
├── tools/
│   ├── terraform-cli/          # Terraform management CLI
│   ├── kubernetes-cli/         # Kubernetes deployment CLI
│   ├── kubernetes-deployer/    # Deployment execution library
│   └── shared/                 # Shared utilities
├── docs/                       # Documentation
└── package.json
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | System architecture and design patterns |
| [Configuration Guide](docs/configuration.md) | Project and environment configuration |
| [Terraform CLI](docs/terraform-cli.md) | Terraform command reference |
| [Kubernetes CLI](docs/kubernetes-cli.md) | Kubernetes deployment guide |
| [Deployment Configs](docs/deployment-configs.md) | Deployment JSON format reference |

## Multi-Project Support

This toolkit supports multiple projects. Each project is self-contained under `projects/{project-name}/` with its own:

- Project configuration (`project.yaml`)
- Deployment definitions (`deployments/*.json`)
- Infrastructure stacks (`terraform/`)
- Kubernetes manifests (`kubernetes/`, `minikube/`)

All CLI commands require the `--project` (or `-p`) flag to specify which project to operate on.

## Environments

The system supports multiple deployment environments:

| Environment | Target | Description |
|-------------|--------|-------------|
| `minikube` | Local | Local development cluster |
| `dev` | AKS | Development environment |
| `test` | AKS | Testing/staging environment |
| `prod` | AKS | Production environment |

## Key Features

- **Type-Safe CLI**: Full TypeScript implementation with compile-time safety
- **Multi-Environment**: Seamless deployment across local and cloud environments
- **Dependency Management**: Automatic ordering of infrastructure stacks
- **State Management**: Remote state with backup and recovery capabilities
- **Security Validation**: Built-in Azure security best-practices validation
- **Dry-Run Support**: Preview all changes before applying
- **Rollback Support**: Automatic rollback on deployment failures

## Development

```bash
# Run tests
npm test

# Type checking
npm run check

# Format code
npm run format
```

## License

Private - Internal use only.
