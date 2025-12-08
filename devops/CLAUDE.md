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
├── terraform/                # Infrastructure as Code
│   ├── modules/azure/        # Reusable Terraform modules (13 modules)
│   ├── stacks/srvthreds/     # Environment-specific stacks
│   │   ├── _shared/          # Shared backend configuration
│   │   ├── networking/       # VNet, subnets, NSGs (root dependency)
│   │   ├── keyvault/         # Secrets management
│   │   ├── acr/              # Container registry
│   │   ├── cosmosdb/         # MongoDB API database
│   │   ├── redis/            # Cache layer
│   │   ├── monitoring/       # Log Analytics, App Insights
│   │   ├── aks/              # Kubernetes cluster
│   │   └── nginx-ingress/    # Ingress controller
│   └── state-backend/        # Terraform state bootstrap
├── kubernetes/               # AKS manifests (Kustomize)
│   └── srvthreds/
│       ├── base/             # Shared manifests
│       ├── dev/              # Dev overlay
│       ├── test/             # Test overlay
│       └── prod/             # Prod overlay
├── minikube/                 # Local Kubernetes development
│   └── srvthreds/
│       ├── configs/          # Agent configurations
│       ├── manifests/        # Kustomize manifests
│       └── scripts/          # Helper scripts
├── tools/                    # CLI tools (TypeScript)
│   ├── terraform-cli/        # Terraform wrapper (12 commands)
│   ├── kubernetes-cli/       # K8s deployment CLI
│   ├── kubernetes-deployer/  # Deployer framework
│   └── shared/               # Common utilities
├── configs/                  # Configuration registry
│   ├── config-registry.yaml  # Single source of truth
│   └── terraform/
│       ├── stacks.json       # Stack definitions & dependencies
│       └── environments.json # Environment metadata
├── projects/srvthreds/       # Project-specific configs
└── docs/                     # Documentation
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

---

## Architecture & Patterns

### Terraform Stack Dependencies

Stacks must be deployed in dependency order. The graph is defined in `configs/terraform/stacks.json`:

```
networking (root - no dependencies)
    ├── keyvault
    ├── acr
    ├── cosmosdb
    ├── redis
    └── monitoring
         └── aks (depends on: networking, acr)
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

**When creating resources:** Use the naming locals pattern from existing stacks.

### Terraform Module Pattern

Every module follows this structure:
```
modules/azure/<name>/
├── main.tf        # Resource definitions
├── variables.tf   # Input variables
└── outputs.tf     # Output values
```

**When modifying modules:**
- Modules are shared across environments - changes affect all
- Add new variables with defaults to avoid breaking existing stacks
- Always expose necessary values via outputs for remote state

### Kubernetes Manifest Pattern

Manifests use Kustomize with base + overlays:
- **Base** (`kubernetes/srvthreds/base/`): Environment-agnostic manifests
- **Overlays** (`dev/`, `test/`, `prod/`): Environment-specific patches

Key patterns in manifests:
- Service account: `srvthreds-workload` (with Workload Identity)
- Namespace: `srvthreds`
- Secrets: Mounted via CSI from Key Vault at `/mnt/secrets-store`
- Images: `{acr-name}.azurecr.io/srvthreds/{service}:latest`

**When adding a new service:**
1. Add deployment to `base/` with standard labels and service account
2. Add image reference to each overlay's `kustomization.yaml`
3. Include CSI volume mount if service needs secrets

### CLI Tool Pattern

Tools in `tools/` follow this structure:
```typescript
// cli.ts - Entry point with yargs
// commands/<cmd>.ts - Export { description, handler }
// types/*.types.ts - Type definitions
// utils/*.ts - Utilities
```

**Error hierarchy:**
- `CLIError` (base, code 1)
- `ValidationError` (code 2)
- `ConfigError` (code 3)
- `ExecutionError` (code 4)
- `AzureError` (code 5)
- `TerraformError` (code 6)

### Configuration Sources

Priority order (most specific wins):
1. `configs/config-registry.yaml` - Service definitions, ports, resources
2. `configs/terraform/stacks.json` - Stack dependencies
3. `configs/terraform/environments.json` - Environment metadata
4. Stack-level `*.tfvars` files - Environment-specific values

**config-registry.yaml** defines:
- Services: `builder`, `bootstrap`, `engine`, `session-agent`, `persistence-agent`
- Databases: `mongodb`, `redis`, `rabbitmq`
- Connection strings: `local`, `docker`, `kubernetes`, `minikube` profiles

---

## Common Tasks

### Adding a New Terraform Stack

```bash
# 1. Create module (if new resource type)
mkdir -p terraform/modules/azure/newmodule
# Create main.tf, variables.tf, outputs.tf

# 2. Create stack
mkdir -p terraform/stacks/srvthreds/newstack
cd terraform/stacks/srvthreds/newstack
ln -s ../_shared/backend-config.tf .
# Create main.tf referencing the module

# 3. Register in stacks.json
# Add: { "name": "newstack", "path": "stacks/srvthreds/newstack", "dependencies": [...] }

# 4. Test
npm run tf:plan -- dev
```

### Adding a New Kubernetes Service

1. Create deployment in `kubernetes/srvthreds/base/<service>.yaml`
2. Add to `base/kustomization.yaml` resources list
3. Add image entry in each overlay's `kustomization.yaml`:
   ```yaml
   images:
     - name: <service>
       newName: <acr>.azurecr.io/srvthreds/<service>
       newTag: latest
   ```

### Adding a New CLI Command

1. Create `tools/<cli>/commands/<cmd>.ts`:
   ```typescript
   export const description = 'Command description';
   export async function handler(args: Args): Promise<void> { ... }
   ```
2. Register in `cli.ts` yargs configuration
3. Add tests in `test/commands/<cmd>.test.ts`

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
