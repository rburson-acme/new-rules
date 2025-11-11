# State Synchronization Solutions

## Problem: "Resource Already Exists"

```
Error: A resource with the ID "..." already exists - to be managed via Terraform 
this resource needs to be imported into the State.
```

## Root Cause Analysis

This error occurs when:
1. **Azure has the resource** (physically exists)
2. **Terraform state doesn't have it** (no record in state file)
3. **Terraform tries to create it** (fails because it already exists)

### Why This Happens

- Resource created outside Terraform (manual, script, previous deployment)
- State file lost or corrupted
- Terraform apply failed partway through
- Multiple deployment processes running simultaneously

---

## Solution Approaches

### ✅ Approach 1: Refresh State (Recommended for Most Cases)

**When to use**: Resource exists in Azure and configuration is correct

```bash
cd stacks/cosmosdb

# Refresh state to sync with Azure
terraform refresh -var-file=dev.tfvars

# Verify the fix
terraform plan -var-file=dev.tfvars
```

**Pros**:
- ✅ Simplest approach
- ✅ No downtime
- ✅ Preserves resource
- ✅ Reversible

**Cons**:
- ❌ Only works if configuration matches Azure resource
- ❌ Won't fix configuration mismatches

---

### ⚠️ Approach 2: Import Resource (For Configuration Mismatches)

**When to use**: Resource exists but configuration doesn't match

```bash
cd stacks/cosmosdb

# Get resource ID from Azure
RESOURCE_ID=$(az cosmosdb show --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG --query "id" -o tsv)

# Import it
terraform import -var-file=dev.tfvars \
  module.cosmosdb.azurerm_cosmosdb_account.main \
  "$RESOURCE_ID"
```

**Pros**:
- ✅ Works for completely missing state
- ✅ Flexible

**Cons**:
- ❌ Configuration must match Azure resource exactly
- ❌ May fail if there are configuration mismatches
- ❌ More manual steps

**Common Issues**:
- "Cannot import non-existent remote object" - Configuration doesn't match
- "Error acquiring state lock" - Previous operation locked state

---

### 🔧 Approach 3: Fix Configuration Then Apply (Best for Clean State)

**When to use**: Configuration is wrong or resource should be recreated

**Step 1: Remove from state** (doesn't delete from Azure)
```bash
cd stacks/cosmosdb
terraform state rm module.cosmosdb.azurerm_cosmosdb_account.main
```

**Step 2: Delete from Azure** (if needed)
```bash
az cosmosdb delete --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG
```

**Step 3: Fix Terraform configuration**
```bash
# Edit modules/azure/cosmosdb/main.tf to match desired state
# Or edit stacks/cosmosdb/dev.tfvars to match Azure resource
```

**Step 4: Recreate via Terraform**
```bash
terraform apply -var-file=dev.tfvars
```

**Pros**:
- ✅ Ensures clean state
- ✅ Fixes configuration mismatches
- ✅ Guarantees consistency

**Cons**:
- ❌ Causes downtime
- ❌ Data loss if not backed up
- ❌ Dependent resources affected

---

## Troubleshooting

### Issue: "Error acquiring the state lock"

**Cause**: Previous operation left state locked

**Solution**:
```bash
cd stacks/cosmosdb

# Find lock ID from error message
# Then force unlock
terraform force-unlock <LOCK_ID>

# Confirm unlock
terraform state list
```

### Issue: "Cannot import non-existent remote object"

**Cause**: Terraform configuration doesn't match Azure resource

**Solution**:
```bash
# Check what Azure has
az cosmosdb show --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG

# Check what Terraform expects
terraform plan -var-file=dev.tfvars

# Update Terraform configuration to match Azure
# Then try refresh instead of import
terraform refresh -var-file=dev.tfvars
```

### Issue: "Resource not found in Azure"

**Cause**: Resource ID is wrong or resource was deleted

**Solution**:
```bash
# Verify resource exists
az cosmosdb list --resource-group CAZ-SRVTHREDS-D-E-RG

# Get correct resource ID
az cosmosdb show --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG --query "id"

# If resource doesn't exist, remove from state
terraform state rm module.cosmosdb.azurerm_cosmosdb_account.main
```

---

## For Your Specific Situation

### Current State
- **Azure**: CosmosDB account exists (`cazsrvthredsdecosmos`)
- **Terraform**: State doesn't have it
- **Error**: "already exists - needs to be imported"

### Recommended Solution

**Option A: Refresh State** (Fastest)
```bash
cd stacks/cosmosdb
terraform refresh -var-file=dev.tfvars
terraform plan -var-file=dev.tfvars
```

If this works, you're done!

**Option B: If Refresh Fails**

Check if configuration matches Azure:
```bash
# See what Azure has
az cosmosdb show --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG | jq .

# See what Terraform expects
cd stacks/cosmosdb
terraform plan -var-file=dev.tfvars
```

If they don't match, update `dev.tfvars` or module configuration to match Azure.

**Option C: Clean Slate** (If configuration is wrong)
```bash
cd stacks/cosmosdb

# Remove from state
terraform state rm module.cosmosdb.azurerm_cosmosdb_account.main

# Delete from Azure
az cosmosdb delete --name cazsrvthredsdecosmos \
  --resource-group CAZ-SRVTHREDS-D-E-RG

# Recreate via Terraform
terraform apply -var-file=dev.tfvars
```

---

## Prevention

### 1. Always Use Terraform
- Never create resources manually
- Never modify resources outside Terraform
- Use Terraform for all infrastructure changes

### 2. Backup State Regularly
```bash
# Before major changes
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).tfstate
```

### 3. Use State Locking
Already enabled in your configuration - Azure Storage handles it automatically.

### 4. Monitor State Health
```bash
# Check state consistency
terraform state list
terraform state show <resource>

# Validate configuration
terraform validate
terraform plan
```

### 5. Use Terraform Cloud/Enterprise
- Centralized state management
- Automatic backups
- Audit logs
- Team collaboration

---

## Scripts Available

### Automated Recovery
```bash
./scripts/recover-state.sh cosmosdb dev
./scripts/recover-state.sh cosmosdb dev --dry-run
./scripts/recover-state.sh cosmosdb dev --force
```

### Manual Import
```bash
./scripts/import-resource.sh cosmosdb cosmosdb_account cosmosdb \
  "/subscriptions/.../providers/Microsoft.DocumentDB/databaseAccounts/cazsrvthredsdecosmos"
```

---

## When to Escalate

Contact DevOps if:
- State is corrupted (can't read/parse)
- Multiple resources are out of sync
- Unsure which approach to use
- Need to recover from backup
- State locking is stuck

---

## References

- [Terraform State Documentation](https://www.terraform.io/language/state)
- [Terraform Import](https://www.terraform.io/cli/commands/import)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [State Locking](https://www.terraform.io/language/state/locking)

