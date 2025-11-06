# Shared Configuration

This directory contains shared configuration files used across all stacks.

## backend-config.tf

Centralized backend storage configuration for remote state references.

### Purpose

Provides a **single source of truth** for:
- Backend storage account configuration
- State file path format
- Remote state reference helpers

### Usage

Each stack should create a symbolic link to this file:

```bash
cd stacks/<your-stack>
ln -sf ../_shared/backend-config.tf ./shared-backend-config.tf
```

Then use the locals in your remote state references:

```hcl
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}
```

### Benefits

1. **Single Source of Truth**: Change storage account once, affects all stacks
2. **No Duplication**: Backend config defined once, used everywhere
3. **Type Safety**: Using `format()` with `state_key_format` catches typos
4. **Consistency**: All stacks use identical configuration
5. **Easy Migration**: Update storage account in one place

### Example

```hcl
# Instead of duplicating this in every stack:
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}

# Use this:
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}
```

### Available Locals

From `backend-config.tf`:

- `local.backend_config` - Map with RG, storage account, container
- `local.state_key_format` - Format string: `"stacks/%s/%s.tfstate"`
- Use with `format(local.state_key_format, stack_name, environment)`

### Stacks Using This Configuration

- ✅ networking
- ✅ keyvault
- ✅ acr
- 🚧 cosmosdb (add symlink when created)
- 🚧 redis (add symlink when created)
- 🚧 aks (add symlink when created)

## Adding to New Stacks

When creating a new stack:

1. Create the symbolic link:
   ```bash
   cd stacks/<new-stack>
   ln -sf ../_shared/backend-config.tf ./shared-backend-config.tf
   ```

2. Remove any `backend_config` or `state_key_format` locals from your stack's main.tf

3. Use the shared configuration in remote state references

4. Test the stack:
   ```bash
   cd ../../
   ./scripts/deploy-stack.sh build <new-stack> dev
   ```

## Migration Notes

If migrating existing stacks:

1. Create the symlink
2. Remove duplicate `backend_config` local from stack's main.tf
3. Update remote state references to use `format(local.state_key_format, ...)`
4. Run `terraform init` to ensure everything works
5. No state migration needed - only code changes

## Troubleshooting

### Error: "local.backend_config is not defined"

**Cause**: The symlink doesn't exist or is broken

**Solution**:
```bash
cd stacks/<stack-name>
ln -sf ../_shared/backend-config.tf ./shared-backend-config.tf
```

### Error: "local.state_key_format is not defined"

**Cause**: Using old hardcoded key path

**Solution**: Update to use `format(local.state_key_format, stack_name, var.environment)`
