# DevOps

Infrastructure-as-code and deployment tooling for the threds monorepo.

## Quick Start

```bash
npm install
npm run check
```

## Documentation

See the [docs/](docs/) folder for detailed documentation:

- [Migration Plan](docs/MIGRATION_PLAN.md) - Migration from srvthreds/infrastructure

## Project Structure

```
devops/
├── cloud/          # Cloud infrastructure (Terraform, K8s manifests)
├── local/          # Local development (Minikube)
├── tools/          # CLI tools (TypeScript)
├── configs/        # Configuration registry
├── projects/       # Per-project configurations
├── docs/           # Documentation
└── test/           # Tests
```

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run tf:plan` | Preview Terraform changes |
| `npm run tf:apply` | Apply Terraform changes |
| `npm run minikube:create` | Create local K8s cluster |
| `npm run aks:deploy` | Deploy to Azure AKS |
| `npm run config:generate` | Generate configs from registry |
| `npm run config:validate` | Validate configurations |
