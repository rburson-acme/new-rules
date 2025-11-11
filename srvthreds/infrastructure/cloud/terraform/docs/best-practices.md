# Best Practices

Terraform coding standards, naming conventions, and best practices for SrvThreds Azure infrastructure.

## Naming Conventions

All resources follow **Army NETCOM naming standards** with consistent patterns.

### Standard Pattern

```
CAZ-SRVTHREDS-{ENV}-E-{RESOURCE}
```

Where:
- **CAZ**: cARMY Azure (constant)
- **SRVTHREDS**: Application name (constant)
- **{ENV}**: Environment code (D=dev, T=test, P=prod)
- **E**: Region code (E=East US)
- **{RESOURCE}**: Resource type suffix

### Resource Naming Standards

| Resource Type | Pattern | Example |
|--------------|---------|---------|
| Resource Group | CAZ-SRVTHREDS-{ENV}-E-RG | CAZ-SRVTHREDS-D-E-RG |
| Virtual Network | CAZ-SRVTHREDS-{ENV}-E-NET-VNET | CAZ-SRVTHREDS-D-E-NET-VNET |
| Key Vault | CAZ-SRVTHREDS-{ENV}-E-KEY | CAZ-SRVTHREDS-D-E-KEY |
| AKS Cluster | CAZ-SRVTHREDS-{ENV}-E-AKS | CAZ-SRVTHREDS-D-E-AKS |
| Cosmos DB | caz-srvthreds-{env}-e-cosmos | caz-srvthreds-d-e-cosmos |
| Redis | CAZ-SRVTHREDS-{ENV}-E-REDIS | CAZ-SRVTHREDS-D-E-REDIS |
| Service Bus | caz-srvthreds-{env}-e-sbus | caz-srvthreds-d-e-sbus |
| ACR | cazsrvthreds{env}eacr | cazsrvthredsdeacr |
| Storage Account | cazsrvthreds{env}estg{func} | cazsrvthredsdestgtf |
| App Gateway | CAZ-SRVTHREDS-{ENV}-E-AGW | CAZ-SRVTHREDS-D-E-AGW |
| Log Analytics | CAZ-SRVTHREDS-{ENV}-E-LOGS | CAZ-SRVTHREDS-D-E-LOGS |
| App Insights | CAZ-SRVTHREDS-{ENV}-E-APPI | CAZ-SRVTHREDS-D-E-APPI |

### Special Cases

**Azure Container Registry** (no hyphens allowed):
```
cazsrvthreds{env}eacr
Examples: cazsrvthredsdeacr, cazsrvthredsteacr
```

**Storage Accounts** (lowercase alphanumeric only, 24 char limit):
```
cazsrvthreds{env}estg{function}
Examples:
  - cazsrvthredsdestgtf   (Terraform state)
  - cazsrvthredsdestglogs (Application logs)
```

**Cosmos DB** (must be lowercase):
```
caz-srvthreds-{env}-e-cosmos
Examples: caz-srvthreds-d-e-cosmos
```

### Subnet Naming

Subnets use descriptive lowercase names:

```
{purpose}-subnet
```

Examples:
- `gateway-subnet` - Application Gateway + WAF
- `aks-subnet` - AKS cluster nodes
- `private-endpoint-subnet` - Private endpoints for PaaS
- `data-subnet` - Database tier
- `support-subnet` - Container instances

### Private Endpoints

Private endpoints append `-pe` to the resource name:

```
{resource-name}-pe
```

Examples:
- `CAZ-SRVTHREDS-D-E-KEY-pe` (Key Vault)
- `caz-srvthreds-d-e-cosmos-pe` (Cosmos DB)

### Environment Codes

| Code | Environment | Use Case |
|------|-------------|----------|
| D | Development | Cost-optimized, lower resources |
| T | Test | Staging, prod-like configuration |
| P | Production | HA, auto-scaling, full observability |

## Tagging Standards

All resources must include these tags:

```hcl
tags = {
  Project     = "srvthreds"
  Environment = "dev|test|prod"
  ManagedBy   = "Terraform"
  CostCenter  = "engineering|production"
  Owner       = "Platform Team"
}
```

Additional optional tags:
- `Component` - Logical component (e.g., "networking", "data")
- `Criticality` - Resource criticality (e.g., "high", "medium", "low")
- `BackupPolicy` - Backup requirements
- `MaintenanceWindow` - Allowed maintenance window

## Terraform Code Standards

### Module Structure

```
modules/azure/{module-name}/
├── main.tf           # Primary resource definitions
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── locals.tf         # Local variables (optional)
├── versions.tf       # Provider version constraints
└── README.md         # Module documentation
```

### Variable Naming

```hcl
# Use descriptive snake_case names
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

# Include validation where appropriate
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod."
  }
}

# Provide sensible defaults
variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}
```

### Resource Naming in Code

Use locals to construct names:

```hcl
locals {
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))  # D/T/P
  region   = "E"

  # Build standard name
  name_prefix = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}"
  
  # Apply to resources
  resource_group_name = "${local.name_prefix}-RG"
  vnet_name          = "${local.name_prefix}-NET-VNET"
  keyvault_name      = "${local.name_prefix}-KEY"
}
```

### Output Naming

```hcl
# Use descriptive names
output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

# Group related outputs
output "subnet_ids" {
  description = "Map of subnet names to subnet IDs"
  value = {
    gateway            = azurerm_subnet.gateway.id
    aks                = azurerm_subnet.aks.id
    private_endpoints  = azurerm_subnet.private_endpoints.id
  }
}
```

### Data Source Usage

```hcl
# Remote state for stack dependencies
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = var.state_storage_account_name
    container_name       = "tfstate"
    key                  = "networking.tfstate"
  }
}

# Azure data sources for existing resources
data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}
```

## Security Best Practices

### Private by Default

All PaaS services use private endpoints:

```hcl
# Enable private endpoint
resource "azurerm_private_endpoint" "example" {
  name                = "${local.resource_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${local.resource_name}-psc"
    private_connection_resource_id = azurerm_example.main.id
    is_manual_connection           = false
    subresource_names              = ["exampleSubResource"]
  }
}

# Disable public access
public_network_access_enabled = false
```

### Managed Identities

Use managed identities instead of service principals:

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = local.aks_name
  # ...

  identity {
    type = "SystemAssigned"
  }
}
```

### RBAC Authorization

Use RBAC, not access keys:

```hcl
# Key Vault RBAC
resource "azurerm_role_assignment" "keyvault_admin" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Administrator"
  principal_id         = var.admin_principal_id
}

# Enable RBAC authorization
enable_rbac_authorization = true
```

### Network Security

Apply network security groups:

```hcl
resource "azurerm_network_security_group" "example" {
  name                = "${local.subnet_name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Deny all inbound by default
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

### Encryption

Enable encryption at rest and in transit:

```hcl
# Encryption at rest
resource "azurerm_cosmosdb_account" "main" {
  # ...
  
  # Use customer-managed keys
  key_vault_key_id = var.cmk_key_id
}

# TLS 1.2 minimum
minimum_tls_version = "1.2"
```

## State Management

### Remote State Backend

Always use remote state in Azure Storage:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
    key                  = "stack-name.tfstate"
  }
}
```

### State Locking

State locking is automatic with Azure Storage backend.

### State Backups

Always backup before risky operations:

```bash
npm run terraformCli -- state backup dev
```

## Code Organization

### Stack Independence

Keep stacks loosely coupled:

```hcl
# ✅ GOOD: Use remote state
data "terraform_remote_state" "networking" {
  # ...
}

subnet_id = data.terraform_remote_state.networking.outputs.aks_subnet_id

# ❌ BAD: Don't hardcode dependencies
subnet_id = "/subscriptions/.../subnets/aks-subnet"
```

### Module Reusability

Create reusable modules:

```hcl
# modules/azure/private-endpoint/main.tf
resource "azurerm_private_endpoint" "main" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = var.connection_name
    private_connection_resource_id = var.resource_id
    is_manual_connection           = var.is_manual
    subresource_names              = var.subresource_names
  }
}

# Use module in stacks
module "keyvault_pe" {
  source = "../../modules/azure/private-endpoint"
  
  name                = "${local.keyvault_name}-pe"
  resource_id         = azurerm_key_vault.main.id
  subresource_names   = ["vault"]
  # ...
}
```

## Documentation

### Module Documentation

Every module must have README.md with:

1. **Overview** - What the module does
2. **Usage Example** - Basic usage
3. **Inputs** - All variables with descriptions
4. **Outputs** - All outputs with descriptions
5. **Examples** - Common scenarios

### Inline Comments

Use comments for complex logic:

```hcl
# Calculate node count based on environment
# Dev: 2 nodes, Test: 3 nodes, Prod: 5 nodes
locals {
  node_count = var.environment == "prod" ? 5 : (var.environment == "test" ? 3 : 2)
}
```

## Testing

### Validate Before Apply

```bash
# Format check
terraform fmt -check

# Validation
terraform validate

# Plan review
terraform plan
```

### Test in Dev First

Always test changes in dev environment before prod:

```bash
# Deploy to dev
npm run terraformCli -- deploy dev networking

# Verify it works
npm run terraformCli -- status dev

# Then deploy to prod
npm run terraformCli -- deploy prod networking
```

## Related Documentation

- [Deployment Guide](deployment-guide.md) - Deployment workflows
- [Stacks Guide](stacks-guide.md) - Stack architecture
- [Module Documentation](modules/) - Individual modules
- [Troubleshooting](troubleshooting.md) - Common issues

---

**Last Updated:** 2025-01-11
**Maintained By:** Platform Team
