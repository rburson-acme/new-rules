# Bootstrap Guide

Setting up Azure subscription and Terraform state management for the first time.

## Overview

The bootstrap process creates the foundational infrastructure needed for Terraform state management. This is a one-time setup per environment.

## What Gets Created

The bootstrap process creates:

1. **Resource Group**: `srvthreds-terraform-rg`
   - Contains all Terraform state infrastructure
   - Separate from application resources

2. **Storage Account**: `srvthredstfstate<random>`
   - Stores Terraform state files
   - Name includes random suffix for global uniqueness
   - Example: `srvthredstfstatei274ht`

3. **Storage Container**: `tfstate`
   - Blob container within the storage account
   - Holds individual state files for each stack

4. **Management Lock**: Prevents accidental deletion
   - Applied to the resource group
   - Must be manually removed before cleanup

## Bootstrap Process

### Step 1: Prerequisites

Ensure you have:

```bash
# Azure CLI installed and logged in
az login
az account show

# Set correct subscription
az account set --subscription "<subscription-id>"

# Terraform 1.5+ installed
terraform version

# In project root directory
cd srvthreds
```

### Step 2: Run Bootstrap

```bash
npm run terraformCli -- bootstrap dev
```

The bootstrap command will:
1. Check if bootstrap infrastructure already exists
2. Create resource group if needed
3. Create storage account with random suffix
4. Create blob container for state files
5. Apply management lock
6. Display outputs for reference

### Step 3: Save Outputs

The bootstrap process outputs important information:

```
Bootstrap completed successfully!

Resource Group: srvthreds-terraform-rg
Storage Account: srvthredstfstatei274ht
Container: tfstate
Location: eastus

Save these values for reference.
```

**Important:** Save the storage account name - you'll need it if you ever need to manually access state files.

## Backend Configuration

After bootstrap completes, the backend configuration is automatically set up:

**File**: `infrastructure/cloud/terraform/stacks/_shared/backend-config.tf`

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"  # Your unique name
    container_name       = "tfstate"
    key                  = "<stack-name>.tfstate"
  }
}
```

Each stack symlinks to this shared configuration, ensuring consistency across all stacks.

## Verification

Verify bootstrap was successful:

```bash
# Check resource group exists
az group show --name srvthreds-terraform-rg

# Check storage account exists
az storage account show \
  --name srvthredstfstatei274ht \
  --resource-group srvthreds-terraform-rg

# Check container exists
az storage container show \
  --name tfstate \
  --account-name srvthredstfstatei274ht

# Check management lock exists
az lock list --resource-group srvthreds-terraform-rg
```

## Troubleshooting

### "Storage account name already exists"

**Cause:** Storage account names are globally unique. The random suffix wasn't unique enough.

**Solution:** The bootstrap script will automatically try a different random suffix.

### "Insufficient permissions"

**Cause:** You don't have required permissions in Azure subscription.

**Solution:**
- Ensure you have "Contributor" or "Owner" role
- Check role assignments: `az role assignment list --assignee <your-email>`
- Contact Azure administrator

### "Resource group already exists"

**Cause:** Previous bootstrap attempt or manual resource group creation.

**Solution:**
```bash
# Check if it's from a previous bootstrap
az group show --name srvthreds-terraform-rg

# If it's your old bootstrap, you can use it
# Or delete and re-bootstrap
az group delete --name srvthreds-terraform-rg --yes
npm run terraformCli -- bootstrap dev
```

## Multiple Environments

Bootstrap is environment-specific. For multiple environments:

```bash
# Bootstrap dev environment
npm run terraformCli -- bootstrap dev

# Bootstrap test environment
npm run terraformCli -- bootstrap test

# Bootstrap prod environment
npm run terraformCli -- bootstrap prod
```

Each environment gets its own:
- Resource group: `srvthreds-terraform-<env>-rg`
- Storage account: `srvthredstfstate<env><random>`

## Cleanup Bootstrap

To remove bootstrap infrastructure (careful - this deletes all state!):

```bash
# Remove management lock first
az lock delete \
  --name "prevent-deletion" \
  --resource-group srvthreds-terraform-rg

# Delete resource group
az group delete --name srvthreds-terraform-rg --yes
```

**Warning:** This will delete all Terraform state files. Only do this if you've already destroyed all infrastructure.

## Best Practices

1. **Bootstrap Once**: Only run bootstrap once per environment
2. **Save Outputs**: Document the storage account name
3. **Don't Delete**: Never delete bootstrap resources while infrastructure exists
4. **Backup State**: Regularly backup state files
5. **Separate Subscriptions**: Consider separate Azure subscriptions for prod

## Related Documentation

- [Deployment Guide](deployment-guide.md) - How to deploy stacks
- [Stacks Guide](stacks-guide.md) - Understanding stack dependencies
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

---

**Last Updated:** 2025-01-11
**Maintained By:** Platform Team
