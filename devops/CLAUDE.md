# CLAUDE.md

This file provides guidance to Claude Code when working with the devops project.

## Project Overview

This project contains DevOps tooling and infrastructure-as-code for the threds monorepo. The primary deployment target is **srvthreds** (event-driven workflow automation backend).

## Directory Structure

```
devops/
├── configs/                      # Configuration files
│   ├── config-registry.yaml      # Service definitions, ports, resources
│   └── terraform/
│       ├── stacks.json           # Stack definitions & dependencies
│       └── environments.json     # Environment metadata
├── docs/                         # Documentation
│   ├── AZURE_DEPLOYMENT.md
│   ├── MINIKUBE_DEPLOYMENT.md
│   ├── PROJECT_CONFIGURATION.md
│   └── TROUBLESHOOTING.md
├── kubernetes/                   # AKS manifests (Kustomize)
│   └── srvthreds/
│       ├── base/                 # Shared manifests
│       ├── dev/                  # Dev overlay
│       ├── test/                 # Test overlay
│       └── prod/                 # Prod overlay
├── minikube/                     # Local Kubernetes development
│   └── srvthreds/
│       ├── configs/agents/       # Agent configuration files
│       ├── manifests/
│       │   ├── base/             # Base manifests
│       │   ├── minikube/         # Minikube-specific overlay
│       │   └── prod/             # Prod overlay
│       └── scripts/              # Helper scripts
├── projects/                     # Project-specific configs
│   └── srvthreds/
│       └── project.yaml          # Project metadata & paths
├── terraform/                    # Infrastructure as Code
│   ├── azure-pipelines/          # CI/CD pipelines
│   ├── modules/
│   │   ├── azure/                # Azure modules (11 modules)
│   │   ├── eks/                  # EKS modules
│   │   ├── mongodb-atlas/        # MongoDB Atlas modules
│   │   └── networking/           # Networking modules
│   ├── stacks/srvthreds/         # Environment-specific stacks
│   │   ├── _shared/              # Shared backend configuration
│   │   ├── acr/                  # Container registry
│   │   ├── aks/                  # Kubernetes cluster
│   │   ├── appgateway/           # Application gateway
│   │   ├── common/               # Common resources
│   │   ├── cosmosdb/             # MongoDB API database
│   │   ├── keyvault/             # Secrets management
│   │   ├── monitoring/           # Log Analytics, App Insights
│   │   ├── networking/           # VNet, subnets, NSGs
│   │   ├── nginx-ingress/        # Ingress controller
│   │   ├── redis/                # Cache layer
│   │   └── servicebus/           # Service bus
│   └── state-backend/            # Terraform state bootstrap
└── tools/                        # CLI tools (TypeScript)
    ├── kubernetes-cli/           # K8s deployment CLI
    │   ├── cli.ts
    │   ├── commands/             # minikube.ts, aks.ts, config.ts
    │   ├── config/               # project-loader.ts
    │   └── utils/
    ├── kubernetes-deployer/      # Deployer framework
    │   └── src/
    │       ├── deployers/        # MinikubeDeployer, AKSDeployer
    │       ├── operations/       # KubernetesClient
    │       ├── state/
    │       ├── types/
    │       └── utils/
    ├── shared/                   # Common utilities
    │   ├── config/
    │   │   └── validator.ts      # Config validation
    │   ├── config-loader.ts
    │   ├── error-handler.ts
    │   ├── logger.ts
    │   └── shell.ts
    └── terraform-cli/            # Terraform wrapper (11 command files)
        ├── cli.ts
        ├── commands/             # deploy, plan, destroy, init, etc.
        ├── types/
        └── utils/
```

## Essential Commands

### Terraform (Azure Infrastructure)
```bash
npm run tf:init -- <env>              # Initialize Terraform for environment
npm run tf:plan -- <env>              # Preview changes (dev|test|prod)
npm run tf:apply -- <env>             # Deploy infrastructure
npm run tf:destroy -- <env>           # Tear down infrastructure
npm run tf:status -- <env>            # Check deployment status
npm run tf:bootstrap                  # Initialize state backend (deprecated alias)
npm run tf:fix-symlinks               # Fix symlink consistency issues
npm run tf:validate-security -- <env> # Validate security configuration
npm run tf:import -- <args>           # Import existing Azure resources
npm run tf:state -- <cmd> <env>       # Manage Terraform state
```

### Kubernetes
```bash
npm run minikube:deploy       # Deploy to Minikube
npm run minikube:reset        # Reset deployment (keeps cluster)
npm run minikube:cleanup      # Full cleanup (destroys cluster)
npm run minikube:status       # Check Minikube status

npm run aks:deploy -- <env>   # Deploy to Azure AKS
npm run aks:status -- <env>   # Check AKS deployment status
```

### Configuration
```bash
npm run config:validate       # Validate configuration consistency
```

### Development
```bash
npm run check                 # TypeScript type checking
npm run test                  # Run tests
npm run format                # Format code with Prettier
```

---

## Architecture & Patterns

### Terraform Stack Dependencies

Stacks must be deployed in dependency order. The graph is defined in `configs/terraform/stacks.json`:

```
networking (root - no dependencies)
    ├── keyvault (depends on: networking)
    ├── acr (depends on: networking)
    ├── cosmosdb (depends on: networking)
    ├── redis (depends on: networking)
    └── monitoring (depends on: networking)

aks (depends on: networking, acr)
    └── nginx-ingress (depends on: aks, networking)
```

**When adding a new stack:**
1. Create module in `terraform/modules/azure/<name>/`
2. Create stack in `terraform/stacks/srvthreds/<name>/`
3. Symlink `_shared/backend-config.tf` into the stack
4. Add entry to `configs/terraform/stacks.json` with dependencies
5. Use remote state data sources to reference dependent stacks

### Azure Naming Convention

All Azure resources follow Army NETCOM standard:
```
CAZ-{APPNAME}-{ENV}-{REGION}-{RESOURCE_TYPE}
```

| Component | Dev | Test | Prod |
|-----------|-----|------|------|
| Env Code  | D   | T    | P    |
| Region    | E (East US) | E | E |

Examples:
- Resource Group: `CAZ-SRVTHREDS-D-E-RG`
- AKS Cluster: `caz-srvthreds-d-e-aks`
- Key Vault: `caz-srvthreds-d-e-kv`

### Terraform Module Pattern

Every module follows this structure:
```
modules/azure/<name>/
├── main.tf        # Resource definitions
├── variables.tf   # Input variables
└── outputs.tf     # Output values
```

**Azure modules (11):** acr, aks, appgateway, cosmosdb, keyvault, monitoring, networking, private-endpoint, rbac, redis, servicebus

### Kubernetes Manifest Pattern

Manifests use Kustomize with base + overlays:
- **AKS** (`kubernetes/srvthreds/`): base/, dev/, test/, prod/
- **Minikube** (`minikube/srvthreds/manifests/`): base/, minikube/, prod/

Key patterns:
- Service account: `srvthreds-workload` (with Workload Identity)
- Namespace: `srvthreds`
- Secrets: Mounted via CSI from Key Vault at `/mnt/secrets-store`
- Images: `{acr-name}.azurecr.io/srvthreds/{service}:latest`

### CLI Tool Pattern

Terraform CLI uses custom command structure:
```typescript
// cli.ts - Entry point with command map
// commands/<cmd>.ts - Exports handler function and description
```

Kubernetes CLI uses yargs:
```typescript
// cli.ts - Entry point with yargs
// commands/minikube.ts - Minikube subcommands
// commands/aks.ts - AKS subcommands
// commands/config.ts - Config commands
```

**Error hierarchy:**
- `CLIError` (base, code 1)
- `ValidationError` (code 2)
- `ConfigError` (code 3)
- `ExecutionError` (code 4)
- `AzureError` (code 5)
- `TerraformError` (code 6)

### Configuration Sources

1. `configs/config-registry.yaml` - Service definitions, ports, resources, connection strings
2. `configs/terraform/stacks.json` - Stack dependencies
3. `configs/terraform/environments.json` - Environment metadata
4. `projects/srvthreds/project.yaml` - Project-specific paths
5. Stack-level `*.tfvars` files - Environment-specific values

**config-registry.yaml** defines:
- Services: `builder`, `bootstrap`, `engine`, `session-agent`, `persistence-agent`
- Databases: `mongodb`, `redis`, `rabbitmq`
- Connection strings: `local`, `docker`, `kubernetes`, `minikube` profiles

---

## Documentation

- [Azure Deployment](docs/AZURE_DEPLOYMENT.md) - Cloud deployment guide
- [Minikube Deployment](docs/MINIKUBE_DEPLOYMENT.md) - Local development
- [Project Configuration](docs/PROJECT_CONFIGURATION.md) - Config system
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues

---

## Execution Policy

**READ-ONLY commands allowed without asking:**
- `kubectl get`, `kubectl describe`, `kubectl logs`
- `az show`, `az list`
- `terraform plan`, `terraform show`

**Commands requiring explicit approval:**
- `terraform apply`, `terraform destroy`
- `kubectl apply`, `kubectl delete`
- Any Azure resource modifications
