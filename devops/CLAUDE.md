# CLAUDE.md

This file provides guidance to Claude Code when working with the devops project.

## Project Overview

This project contains all DevOps tooling and infrastructure-as-code for the threds monorepo. It handles deployments for:
- **srvthreds** - Event-driven workflow automation backend
- **thredclient** - Client application
- **thredlib** - Shared library
- **demo-env** - Demo environment

## Directory Structure

```
devops/
├── cloud/                    # Cloud deployments
│   ├── kubernetes/           # AKS manifests (Kustomize)
│   └── terraform/            # Azure infrastructure modules & stacks
├── local/                    # Local development
│   ├── minikube/             # Local Kubernetes
│   └── configs/              # Environment configurations
├── tools/                    # CLI tools (TypeScript)
│   ├── terraform-cli/        # Terraform wrapper
│   ├── deployment-cli/       # Deployment orchestration
│   ├── kubernetes-deployer/  # K8s deployment framework
│   └── shared/               # Common utilities
├── configs/                  # Configuration registry
│   ├── config-registry.yaml  # Single source of truth
│   └── terraform/            # Stack definitions
├── projects/                 # Project-specific configs
│   ├── srvthreds/
│   ├── thredclient/
│   └── demo-env/
├── docs/                     # Documentation
└── test/
```

## Essential Commands

### Terraform (Azure Infrastructure)
```bash
npm run tf:plan -- <env>       # Preview changes (dev|test|prod)
npm run tf:apply -- <env>      # Deploy infrastructure
npm run tf:destroy -- <env>    # Tear down infrastructure
npm run tf:status -- <env>     # Check deployment status
npm run tf:bootstrap           # Initialize state backend
```

### Kubernetes
```bash
npm run minikube:create        # Create local K8s cluster
npm run minikube:apply         # Deploy to Minikube
npm run minikube:reset         # Reset Minikube cluster

npm run aks:deploy -- <env>    # Deploy to Azure AKS
npm run aks:status -- <env>    # Check AKS deployment status
```

### Configuration
```bash
npm run config:generate        # Generate configs from registry
npm run config:validate        # Validate configuration consistency
```

### Development
```bash
npm run check                  # TypeScript type checking
npm run test                   # Run tests
npm run format                 # Format code with Prettier
```

## Documentation

All documentation is located in the `docs/` folder:
- [Migration Plan](docs/MIGRATION_PLAN.md) - Migration status and phases

## Execution Policy

**READ-ONLY commands allowed without asking:**
- `kubectl get`, `kubectl describe`, `kubectl logs`
- `az show`, `az list`
- `terraform plan`, `terraform show`

**Commands requiring explicit approval:**
- `terraform apply`, `terraform destroy`
- `kubectl apply`, `kubectl delete`
- Any Azure resource modifications
