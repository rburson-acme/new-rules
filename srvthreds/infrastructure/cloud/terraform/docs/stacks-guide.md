# Stacks Guide

Understanding stack-based deployment with dependency resolution.

## Overview

Infrastructure is organized into independent **stacks** - logical groupings of related resources that can be deployed, updated, and destroyed independently while respecting dependencies.

## Stack Architecture

### What is a Stack?

A stack is a self-contained Terraform module that:
- Manages a specific set of related Azure resources
- Has clear inputs and outputs
- Can depend on other stacks
- Can be deployed independently (after its dependencies)

### Stack Directory Structure

```
stacks/
├── networking/           # VNet, subnets, NSGs
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── backend-config.tf → ../_shared/backend-config.tf
├── keyvault/            # Key Vault
├── acr/                 # Container registry
├── cosmosdb/            # Database
├── redis/               # Cache
├── servicebus/          # Message queue
├── monitoring/          # Logs and metrics
├── aks/                 # Kubernetes cluster
├── appgateway/          # Load balancer
└── _shared/             # Shared configuration
    └── backend-config.tf
```

## Available Stacks

| Stack | Purpose | Dependencies | Resources Created |
|-------|---------|--------------|-------------------|
| **networking** | Network foundation | None | VNet, subnets, NSGs, Private DNS zones |
| **keyvault** | Secrets management | networking | Key Vault + private endpoint |
| **acr** | Container registry | networking | ACR + private endpoint |
| **cosmosdb** | MongoDB database | networking | Cosmos DB + private endpoint |
| **redis** | Cache layer | networking | Redis + private endpoint |
| **servicebus** | Message queue | networking | Service Bus + queues/topics |
| **monitoring** | Observability | networking | Log Analytics + App Insights |
| **aks** | Kubernetes cluster | networking, acr | AKS cluster (private) |
| **appgateway** | Load balancer | networking | Application Gateway + WAF |

## Stack Dependencies

### Dependency Graph

```
networking (foundational)
    ├── keyvault
    ├── acr
    │   └── aks
    ├── cosmosdb
    ├── redis
    ├── servicebus
    ├── monitoring
    └── appgateway
```

### Deployment Order

When deploying all stacks, the CLI automatically resolves dependencies and deploys in this order:

1. **networking** - Must be first (no dependencies)
2. **keyvault, acr, cosmosdb, redis, servicebus, monitoring** - Can run in parallel (all depend only on networking)
3. **aks** - Requires both networking and acr
4. **appgateway** - Requires networking

## Working with Stacks

### Deploy Single Stack

```bash
# Deploy networking stack
npm run terraformCli -- deploy dev networking

# Deploy keyvault stack (networking must exist first)
npm run terraformCli -- deploy dev keyvault
```

### Deploy Multiple Stacks

```bash
# Deploy specific stacks (respects dependencies)
npm run terraformCli -- deploy dev networking keyvault acr

# Deploy all stacks
npm run terraformCli -- deploy dev
```

### Check Stack Status

```bash
# Check all stacks
npm run terraformCli -- status dev

# Check specific stack
npm run terraformCli -- status dev networking
```

### Update Stack

```bash
# Make changes to stack code
vim infrastructure/cloud/terraform/stacks/keyvault/main.tf

# Preview changes
npm run terraformCli -- plan dev keyvault

# Apply changes
npm run terraformCli -- deploy dev keyvault
```

### Destroy Stack

```bash
# Destroy single stack (be careful of dependents!)
npm run terraformCli -- destroy dev keyvault

# Destroy all stacks (in reverse dependency order)
npm run terraformCli -- cleanup dev
```

## Stack Communication

### Remote State Data Sources

Stacks communicate through Terraform remote state data sources:

**Example**: AKS stack reads networking stack outputs

```hcl
# stacks/aks/main.tf
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = var.state_storage_account_name
    container_name       = "tfstate"
    key                  = "networking.tfstate"
  }
}

# Use networking outputs
subnet_id = data.terraform_remote_state.networking.outputs.aks_subnet_id
vnet_id   = data.terraform_remote_state.networking.outputs.vnet_id
```

### Stack Outputs

Each stack exports outputs that other stacks can consume:

**Example**: Networking stack outputs

```hcl
# stacks/networking/outputs.tf
output "vnet_id" {
  value = azurerm_virtual_network.main.id
}

output "aks_subnet_id" {
  value = azurerm_subnet.aks.id
}

output "private_endpoint_subnet_id" {
  value = azurerm_subnet.private_endpoints.id
}
```

## Adding a New Stack

### 1. Create Stack Directory

```bash
mkdir infrastructure/cloud/terraform/stacks/newstack
cd infrastructure/cloud/terraform/stacks/newstack
```

### 2. Create Terraform Files

**main.tf:**
```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Use shared networking module
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = var.state_storage_account_name
    container_name       = "tfstate"
    key                  = "networking.tfstate"
  }
}

# Your resources here
resource "azurerm_..." "example" {
  # ...
}
```

**variables.tf:**
```hcl
variable "environment" {
  description = "Environment name (dev/test/prod)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "state_storage_account_name" {
  description = "Terraform state storage account"
  type        = string
}
```

**outputs.tf:**
```hcl
output "example_id" {
  value = azurerm_....example.id
}
```

### 3. Link Backend Configuration

```bash
ln -s ../_shared/backend-config.tf backend-config.tf
```

### 4. Update Stack Registry

Edit `infrastructure/shared/configs/terraform/stacks.json`:

```json
{
  "newstack": {
    "name": "newstack",
    "path": "stacks/newstack",
    "dependencies": ["networking"],
    "description": "Description of new stack"
  }
}
```

### 5. Deploy New Stack

```bash
npm run terraformCli -- deploy dev newstack
```

## Stack Best Practices

### ✅ DO

- ✅ Keep stacks focused on a single concern
- ✅ Use remote state for stack communication
- ✅ Document stack dependencies clearly
- ✅ Export outputs that other stacks need
- ✅ Use consistent naming conventions
- ✅ Test stacks in dev before prod

### ❌ DON'T

- ❌ Create circular dependencies between stacks
- ❌ Make stacks too large (split into multiple if needed)
- ❌ Hardcode values that should come from other stacks
- ❌ Deploy dependent stacks before their dependencies
- ❌ Delete stacks that other stacks depend on
- ❌ Mix unrelated resources in a single stack

## Troubleshooting

### "Cannot read remote state"

**Cause:** Dependency stack hasn't been deployed yet.

**Solution:**
```bash
# Deploy dependencies first
npm run terraformCli -- deploy dev networking

# Then deploy dependent stack
npm run terraformCli -- deploy dev keyvault
```

### "State lock timeout"

**Cause:** Another operation is modifying the stack.

**Solution:**
```bash
# Wait for other operation to complete
# Or if stuck, force unlock
terraform -chdir=stacks/<stack> force-unlock <lock-id>
```

### "Dependency cycle detected"

**Cause:** Circular dependency in stack configuration.

**Solution:** Review and fix stack dependencies in `stacks.json`.

## Related Documentation

- [Deployment Guide](deployment-guide.md) - How to deploy stacks
- [Bootstrap Guide](bootstrap-guide.md) - Setting up state storage
- [Best Practices](best-practices.md) - Terraform coding standards
- [Module Documentation](modules/) - Individual module documentation

---

**Last Updated:** 2025-01-11
**Maintained By:** Platform Team
