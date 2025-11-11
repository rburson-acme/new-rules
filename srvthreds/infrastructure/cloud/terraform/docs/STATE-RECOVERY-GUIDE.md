# Terraform State Recovery Guide

## Overview

This guide covers how to handle situations where Azure resources exist but Terraform state is out of sync. This commonly happens when:

- Resources are created outside of Terraform (manual Azure Portal creation)
- State file is lost or corrupted
- Terraform apply fails partway through
- Multiple people/processes modify infrastructure simultaneously
- State file is accidentally deleted

## Quick Start

### Automated Recovery (Recommended)

```bash
# Dry run - see what would happen
./scripts/recover-state.sh cosmosdb dev --dry-run

# Interactive mode - prompts before making changes
./scripts/recover-state.sh cosmosdb dev

# Force mode - auto-recover without prompts
./scripts/recover-state.sh cosmosdb dev --force
```

### Manual Recovery

```bash
cd stacks/cosmosdb

# Step 1: Refresh state to sync with Azure
terraform refresh -var-file=dev.tfvars

# Step 2: Verify the fix
terraform plan -var-file=dev.tfvars

# Step 3: If still out of sync, import the resource
terraform import -var-file=dev.tfvars \
  module.cosmosdb.azurerm_cosmosdb_account.main \
  /subscriptions/{subscription-id}/resourceGroups/{rg-name}/providers/Microsoft.DocumentDB/databaseAccounts/{account-name}
```

## Understanding the Problem

### Error Message

```
Error: A resource with the ID "..." already exists - to be managed via Terraform 
this resource needs to be imported into the State.
```

### What This Means

1. **Azure has the resource**: The resource physically exists in your Azure subscription
2. **Terraform doesn't know about it**: The Terraform state file doesn't have a record of it
3. **Terraform can't create it**: Terraform tries to create it, but Azure rejects the creation because it already exists

### Why This Happens

| Cause | Example | Prevention |
|-------|---------|-----------|
| Manual creation | Created via Azure Portal | Always use Terraform |
| Lost state | State file deleted | Backup state regularly |
| Failed apply | Terraform crashed mid-apply | Use state recovery |
| Concurrent changes | Multiple people deploying | Use locking (built-in) |
| State corruption | Corrupted state file | Monitor state health |

## Recovery Strategies

### Strategy 1: Refresh State (Recommended)

**When to use**: Resource exists in Azure and should be managed by Terraform

```bash
./scripts/recover-state.sh cosmosdb dev
```

**What it does**:
1. Reads current state from Azure
2. Updates Terraform state file to match
3. Verifies the fix with a plan

**Pros**:
- ✅ Simplest approach
- ✅ Preserves resource configuration
- ✅ No downtime
- ✅ Reversible

**Cons**:
- ❌ Only works if resource is in correct state
- ❌ Won't fix configuration mismatches

### Strategy 2: Import Resource

**When to use**: Resource exists but state is completely missing

```bash
cd stacks/cosmosdb

# Find the resource ID in Azure
RESOURCE_ID="/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed/resourceGroups/CAZ-SRVTHREDS-D-E-RG/providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos"

# Import it
terraform import -var-file=dev.tfvars \
  module.cosmosdb.azurerm_cosmosdb_account.main \
  "$RESOURCE_ID"
```

**What it does**:
1. Reads resource from Azure
2. Creates state entry for it
3. Links Terraform configuration to Azure resource

**Pros**:
- ✅ Works for completely missing state
- ✅ Preserves resource
- ✅ Flexible

**Cons**:
- ❌ More manual steps
- ❌ Need to find resource ID
- ❌ Configuration must match Azure resource

### Strategy 3: Remove and Recreate

**When to use**: Resource is misconfigured or should not exist

```bash
cd stacks/cosmosdb

# Remove from state (doesn't delete from Azure)
terraform state rm module.cosmosdb.azurerm_cosmosdb_account.main

# Delete from Azure (if needed)
az cosmosdb delete --name cazsrvthredsdecosmos --resource-group CAZ-SRVTHREDS-D-E-RG

# Recreate via Terraform
terraform apply -var-file=dev.tfvars
```

**What it does**:
1. Removes resource from Terraform state
2. Optionally deletes from Azure
3. Recreates via Terraform

**Pros**:
- ✅ Ensures clean state
- ✅ Fixes configuration mismatches

**Cons**:
- ❌ Causes downtime
- ❌ Data loss if not backed up
- ❌ Dependent resources affected

## Finding Resource IDs

### Method 1: From Error Message

```
Error: A resource with the ID "/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed/resourceGroups/CAZ-SRVTHREDS-D-E-RG/providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos" already exists
```

The ID is in the error message!

### Method 2: Azure CLI

```bash
# List all Cosmos DB accounts
az cosmosdb list --resource-group CAZ-SRVTHREDS-D-E-RG --query "[].id"

# Get specific account
az cosmosdb show --name cazsrvthredsdecosmos --resource-group CAZ-SRVTHREDS-D-E-RG --query "id"
```

### Method 3: Azure Portal

1. Navigate to the resource
2. Click "JSON View" or "Properties"
3. Copy the "Resource ID" field

## Prevention Strategies

### 1. Use State Locking

Already enabled in your configuration:
```hcl
backend "azurerm" {
  # State locking is automatic with Azure Storage
}
```

### 2. Regular State Backups

```bash
# Backup state before major changes
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).tfstate

# Restore if needed
terraform state push backup-20240101-120000.tfstate
```

### 3. Use Terraform Cloud/Enterprise

- Centralized state management
- Automatic backups
- Audit logs
- Team collaboration

### 4. Enforce Terraform-Only Changes

- Disable manual Azure Portal changes
- Use Azure Policy to prevent non-Terraform changes
- Implement approval workflows

### 5. Monitor State Health

```bash
# Check state consistency
terraform state list
terraform state show <resource>

# Validate configuration
terraform validate
terraform plan
```

## Troubleshooting

### Problem: "Cannot access Terraform state"

**Causes**:
- Backend not initialized
- Azure credentials missing
- Storage account inaccessible

**Solution**:
```bash
# Reinitialize backend
terraform init -reconfigure

# Check credentials
az account show

# Verify storage access
az storage account show --name srvthredstfstated9jvee
```

### Problem: "State refresh failed"

**Causes**:
- Configuration doesn't match Azure resource
- Missing required variables
- Provider version mismatch

**Solution**:
```bash
# Check configuration
terraform validate

# Review plan details
terraform plan -var-file=dev.tfvars

# Update configuration to match Azure resource
# Then retry refresh
```

### Problem: "Import failed - resource not found"

**Causes**:
- Wrong resource ID
- Resource doesn't exist in Azure
- Wrong subscription/region

**Solution**:
```bash
# Verify resource exists
az cosmosdb show --name cazsrvthredsdecosmos --resource-group CAZ-SRVTHREDS-D-E-RG

# Check subscription
az account show

# Verify resource ID format
az cosmosdb list --resource-group CAZ-SRVTHREDS-D-E-RG --query "[].id"
```

## Best Practices

### ✅ DO

- ✅ Always use Terraform for infrastructure changes
- ✅ Backup state before major operations
- ✅ Review plans before applying
- ✅ Use state locking (enabled by default)
- ✅ Keep Terraform and provider versions current
- ✅ Document manual changes (if any)
- ✅ Use version control for Terraform code

### ❌ DON'T

- ❌ Manually modify state files
- ❌ Create resources outside Terraform
- ❌ Share state files via email/Slack
- ❌ Use `terraform state rm` without backup
- ❌ Ignore state lock warnings
- ❌ Deploy from multiple locations simultaneously
- ❌ Modify state during apply

## Getting Help

### Useful Commands

```bash
# Show current state
terraform state list
terraform state show <resource>

# Validate configuration
terraform validate

# Check what would change
terraform plan -var-file=dev.tfvars

# See detailed state
terraform state pull | jq .

# Backup state
terraform state pull > state-backup.json

# Restore state
terraform state push state-backup.json
```

### When to Escalate

Contact DevOps if:
- State is corrupted (can't read/parse)
- Multiple resources are out of sync
- Unsure which recovery strategy to use
- Need to recover from backup
- State locking is stuck

## References

- [Terraform State Documentation](https://www.terraform.io/language/state)
- [Terraform Import](https://www.terraform.io/cli/commands/import)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [State Locking](https://www.terraform.io/language/state/locking)

