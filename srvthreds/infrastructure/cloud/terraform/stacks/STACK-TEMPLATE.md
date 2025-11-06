# Stack Template Guide

This guide provides the standard template for creating new stacks with consistent state file path management.

## Backend Configuration Template

**IMPORTANT**: The backend block does NOT support variables or locals. You must use literal strings with interpolation syntax.

### Standard Backend Block

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/<STACK_NAME>/${var.environment}.tfstate"
  }
}
```

**Replace `<STACK_NAME>` with**: networking, keyvault, acr, cosmosdb, redis, aks, etc.

## Remote State Reference Template

### Standard Remote State Data Source

```hcl
# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}
```

### Using Locals for Remote State Configuration (Recommended)

```hcl
locals {
  # Remote state configuration
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
  }
}

# Reference networking stack
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = "stacks/networking/${var.environment}.tfstate"
  })
}

# Reference keyvault stack
data "terraform_remote_state" "keyvault" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = "stacks/keyvault/${var.environment}.tfstate"
  })
}

# Reference ACR stack
data "terraform_remote_state" "acr" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = "stacks/acr/${var.environment}.tfstate"
  })
}
```

## Complete Stack Template

Create a new stack using this structure:

```
stacks/
  <new-stack-name>/
    main.tf           # Backend config, provider, resources
    variables.tf      # Input variables
    outputs.tf        # Output values
    dev.tfvars        # Dev environment config
    test.tfvars       # Test environment config
    prod.tfvars       # Prod environment config
```

### main.tf Template

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/<STACK_NAME>/${var.environment}.tfstate"  # REPLACE <STACK_NAME>
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

locals {
  # Army naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))
  region   = "E"

  # Resource group name (created by networking stack)
  rg_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-RG"

  # Remote state configuration
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
  }

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    ManagedBy   = "Terraform"
    Stack       = "<stack-name>"  # REPLACE
  }
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = "stacks/networking/${var.environment}.tfstate"
  })
}

# Add your resources here
```

## Validation Checklist

Before deploying a new stack, verify:

- [ ] Backend key uses: `stacks/<stack-name>/${var.environment}.tfstate`
- [ ] Backend key `<stack-name>` matches directory name
- [ ] Remote state references use `merge(local.backend_config, {key = "..."})`
- [ ] All remote state keys use `stacks/` prefix
- [ ] Environment interpolation uses `${var.environment}`
- [ ] Stack name in `common_tags` matches directory name

## Creating a New Stack

1. **Copy template structure**:
   ```bash
   cd infrastructure/cloud/terraform/stacks
   mkdir <new-stack-name>
   cp STACK-TEMPLATE.md <new-stack-name>/
   ```

2. **Create main.tf** using the template above

3. **Replace placeholders**:
   - `<STACK_NAME>` in backend key
   - `<stack-name>` in common_tags

4. **Add variables.tf** with standard variables

5. **Create environment tfvars** (dev.tfvars, test.tfvars, prod.tfvars)

6. **Test the stack**:
   ```bash
   cd infrastructure/cloud/terraform
   ./scripts/deploy-stack.sh build <new-stack-name> dev
   ```

## Benefits of This Approach

1. **Centralized Configuration**: Backend config values defined once in locals
2. **Reduced Duplication**: Use `merge()` to combine base config with specific keys
3. **Easier Maintenance**: Change storage account in one place
4. **Clear Pattern**: Every stack follows the same structure
5. **Self-Documenting**: Template provides examples and validation checklist
