# Terraform State File Path Conventions

**Last Updated**: 2025-01-06

## Overview

All Terraform state files are stored in Azure Storage with a consistent path structure to enable proper remote state references between stacks.

## Storage Configuration

- **Resource Group**: `srvthreds-terraform-rg`
- **Storage Account**: `srvthredstfstated9jvee`
- **Container**: `tfstate`

## Path Convention

All stacks **MUST** use the following path pattern:

```
stacks/{stack-name}/{environment}.tfstate
```

### Examples

```
tfstate/
  stacks/
    networking/
      dev.tfstate
      test.tfstate
      prod.tfstate
    keyvault/
      dev.tfstate
      test.tfstate
      prod.tfstate
    acr/
      dev.tfstate
      test.tfstate
      prod.tfstate
    cosmosdb/
      dev.tfstate
      test.tfstate
      prod.tfstate
    aks/
      dev.tfstate
      test.tfstate
      prod.tfstate
```

## Implementation

### Backend Configuration (in stack's main.tf)

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/{stack-name}/${var.environment}.tfstate"
  }
}
```

**Replace `{stack-name}` with the actual stack name (networking, keyvault, acr, etc.)**

### Remote State Reference (when referencing another stack)

```hcl
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

## Current Stack Implementations

| Stack | Backend Key | Status |
|-------|-------------|--------|
| networking | `stacks/networking/${var.environment}.tfstate` | ✅ Correct |
| keyvault | `stacks/keyvault/${var.environment}.tfstate` | ✅ Correct |
| acr | `stacks/acr/${var.environment}.tfstate` | ✅ Correct |
| cosmosdb | `stacks/cosmosdb/${var.environment}.tfstate` | 🚧 Not yet implemented |
| redis | `stacks/redis/${var.environment}.tfstate` | 🚧 Not yet implemented |
| servicebus | `stacks/servicebus/${var.environment}.tfstate` | 🚧 Not yet implemented |
| aks | `stacks/aks/${var.environment}.tfstate` | 🚧 Not yet implemented |
| appgateway | `stacks/appgateway/${var.environment}.tfstate` | 🚧 Not yet implemented |
| monitoring | `stacks/monitoring/${var.environment}.tfstate` | 🚧 Not yet implemented |

## Common Remote State References

### Referencing Networking Stack

Almost all stacks will need VNet and subnet IDs from the networking stack:

```hcl
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}

# Usage
resource "example" "main" {
  vnet_id   = data.terraform_remote_state.networking.outputs.vnet_id
  subnet_id = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
}
```

### Referencing KeyVault Stack

When secrets are needed:

```hcl
data "terraform_remote_state" "keyvault" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/keyvault/${var.environment}.tfstate"
  }
}

# Usage
resource "example" "main" {
  key_vault_id = data.terraform_remote_state.keyvault.outputs.key_vault_id
}
```

### Referencing ACR Stack

When container images need to be pulled:

```hcl
data "terraform_remote_state" "acr" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/acr/${var.environment}.tfstate"
  }
}

# Usage
resource "example" "main" {
  container_registry = data.terraform_remote_state.acr.outputs.acr_login_server
}
```

## Checklist for New Stacks

When creating a new stack, verify:

- [ ] Backend key uses pattern: `stacks/{stack-name}/${var.environment}.tfstate`
- [ ] Remote state references use correct keys with `stacks/` prefix
- [ ] Stack name in backend key matches directory name in `stacks/`
- [ ] Environment variable interpolation uses `${var.environment}` format
- [ ] All remote state data sources point to correct keys

## Troubleshooting

### Error: "object with no attributes"

**Symptom**: Remote state reference shows "object with no attributes"

**Cause**: Incorrect state file key path - the referenced state file doesn't exist at the specified path

**Solution**:
1. Verify the backend key in the referenced stack's main.tf
2. Update the remote state reference to match the correct path
3. Ensure the referenced stack has been deployed (state file exists)

### Error: "Backend configuration changed"

**Symptom**: Terraform complains about backend configuration change

**Solution**: Run `terraform init -reconfigure` to update backend configuration

## Best Practices

1. **Always use the `stacks/` prefix** - This keeps all stack state files organized
2. **Use consistent naming** - Stack directory name should match the name in the backend key
3. **Document dependencies** - Note which stacks reference others in this document
4. **Test state references** - Run `terraform plan` to verify remote state can be read
5. **Never hardcode environment names** - Always use `${var.environment}` for environment-specific paths

## Related Documentation

- [Stacks Deployment Guide](stacks/README.md)
- [Phase 3 Implementation Guide](PHASE3-IMPLEMENTATION.md)
- [Main README](README.md)
