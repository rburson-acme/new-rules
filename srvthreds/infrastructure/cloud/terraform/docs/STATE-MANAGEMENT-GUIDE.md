# State Management Guide

## Overview

The `deploy-stack.sh` script now includes comprehensive state management commands to help you:
- **Validate** state consistency
- **Backup** state before risky operations
- **Repair** state when it gets out of sync
- **Clean** orphaned resources from state
- **Unlock** stuck state locks

This guide covers how to use these commands to prevent and recover from state issues like those caused by symlink problems.

---

## Quick Reference

```bash
# Check state consistency (safe, no changes)
./scripts/deploy-stack.sh validate-state <stack> <env>

# Backup state before risky operations
./scripts/deploy-stack.sh backup-state <stack> <env>

# Refresh state from Azure (fixes inconsistencies)
./scripts/deploy-stack.sh repair-state <stack> <env>

# See what would be removed from state
./scripts/deploy-stack.sh clean-state <stack> <env> --dry-run

# Remove orphaned resources from state
./scripts/deploy-stack.sh clean-state <stack> <env> --remove-resource

# Unlock stuck state locks
./scripts/deploy-stack.sh force-unlock <stack> <env>
```

---

## Commands

### 1. `validate-state` - Check State Consistency

**Purpose**: Verify state is healthy and configuration is valid

**Usage**:
```bash
./scripts/deploy-stack.sh validate-state cosmosdb dev
```

**What it does**:
- ✅ Lists all resources in state
- ✅ Checks for state locks
- ✅ Validates Terraform configuration
- ✅ Shows resource count summary

**When to use**:
- Before deploying to catch issues early
- After symlink changes to verify state integrity
- Regularly as a health check

**Example output**:
```
═══════════════════════════════════════════════════════
  VALIDATE STATE: cosmosdb (dev)
═══════════════════════════════════════════════════════

▸ Checking state consistency...
✓ Found resources in state:
  data.terraform_remote_state.networking
  module.cosmosdb.azurerm_cosmosdb_account.main
▸ Checking for state locks...
✓ State is accessible (no lock)
▸ Validating Terraform configuration...
✓ Configuration is valid
▸ State summary:
  Resources in state: 2
✓ State validation complete
```

---

### 2. `backup-state` - Backup State

**Purpose**: Create timestamped backup before risky operations

**Usage**:
```bash
./scripts/deploy-stack.sh backup-state cosmosdb dev
```

**What it does**:
- ✅ Creates `.state-backups` directory
- ✅ Saves state with timestamp: `dev-20241110-143022.tfstate`
- ✅ Shows backup file size

**When to use**:
- Before running `repair-state`
- Before running `clean-state --remove-resource`
- Before major configuration changes
- Automatically done by repair/clean commands

**Example output**:
```
═══════════════════════════════════════════════════════
  STATE BACKUP: cosmosdb (dev)
═══════════════════════════════════════════════════════

▸ Backing up state to .state-backups/dev-20241110-143022.tfstate...
✓ State backed up to .state-backups/dev-20241110-143022.tfstate
ℹ Backup size: 4.2K
```

---

### 3. `repair-state` - Refresh State from Azure

**Purpose**: Fix state inconsistencies by syncing with Azure

**Usage**:
```bash
./scripts/deploy-stack.sh repair-state cosmosdb dev
```

**What it does**:
- ✅ Automatically backs up state first
- ✅ Refreshes state from Azure
- ✅ Verifies with a plan
- ✅ Reports if changes are needed

**When to use**:
- After symlink issues are fixed
- When state is out of sync with Azure
- When resources exist in Azure but not in state
- To recover from configuration mismatches

**Example output**:
```
═══════════════════════════════════════════════════════
  REPAIR STATE: cosmosdb (dev)
═══════════════════════════════════════════════════════

▸ Backing up state before repair...
✓ State backed up
▸ Refreshing state from Azure...
✓ State refreshed successfully
▸ Verifying state with plan...
✓ State repair complete - no changes needed
```

---

### 4. `clean-state` - Remove Orphaned Resources

**Purpose**: Remove resources from state that shouldn't be there

**Usage**:
```bash
# Preview what would be removed (safe)
./scripts/deploy-stack.sh clean-state cosmosdb dev --dry-run

# Actually remove resources
./scripts/deploy-stack.sh clean-state cosmosdb dev --remove-resource
```

**What it does**:
- ✅ Lists all resources in state
- ✅ Automatically backs up state first
- ✅ With `--dry-run`: shows what would be removed
- ✅ With `--remove-resource`: removes resources (requires confirmation)

**When to use**:
- When state has orphaned resources
- After failed deployments
- To clean up test resources
- Before major state repairs

**Example output**:
```
═══════════════════════════════════════════════════════
  CLEAN STATE: cosmosdb (dev)
═══════════════════════════════════════════════════════

▸ Backing up state before cleanup...
✓ State backed up
▸ Resources currently in state:
  data.terraform_remote_state.networking
  module.cosmosdb.azurerm_cosmosdb_account.main
ℹ Use --remove-resource flag to actually remove resources
```

---

### 5. `force-unlock` - Unlock Stuck State

**Purpose**: Unlock state when operations are blocked

**Usage**:
```bash
./scripts/deploy-stack.sh force-unlock cosmosdb dev
```

**What it does**:
- ✅ Checks if state is locked
- ✅ Provides lock ID and unlock instructions
- ✅ Guides you through manual unlock if needed

**When to use**:
- When you see "Error acquiring the state lock"
- When previous operations crashed
- When state operations hang

**Example output**:
```
═══════════════════════════════════════════════════════
  FORCE UNLOCK: cosmosdb (dev)
═══════════════════════════════════════════════════════

▸ Checking for state locks...
✓ State is not locked
```

---

## State Recovery Workflow

### Scenario 1: Symlink Issues Caused State Corruption

**Problem**: After fixing symlinks, state is out of sync

**Solution**:
```bash
# 1. Validate state
./scripts/deploy-stack.sh validate-state cosmosdb dev

# 2. Backup state
./scripts/deploy-stack.sh backup-state cosmosdb dev

# 3. Repair state from Azure
./scripts/deploy-stack.sh repair-state cosmosdb dev

# 4. Verify with plan
./scripts/deploy-stack.sh build cosmosdb dev
```

### Scenario 2: State is Locked

**Problem**: "Error acquiring the state lock"

**Solution**:
```bash
# 1. Check lock status
./scripts/deploy-stack.sh force-unlock cosmosdb dev

# 2. If locked, manually unlock with lock ID from error
cd stacks/cosmosdb
terraform force-unlock <LOCK_ID>

# 3. Verify state is accessible
./scripts/deploy-stack.sh validate-state cosmosdb dev
```

### Scenario 3: Orphaned Resources in State

**Problem**: Resources in state but not in Azure (or vice versa)

**Solution**:
```bash
# 1. Preview what would be removed
./scripts/deploy-stack.sh clean-state cosmosdb dev --dry-run

# 2. Backup state
./scripts/deploy-stack.sh backup-state cosmosdb dev

# 3. Remove orphaned resources
./scripts/deploy-stack.sh clean-state cosmosdb dev --remove-resource

# 4. Verify
./scripts/deploy-stack.sh validate-state cosmosdb dev
```

---

## State Backups

### Location
```
stacks/<stack>/.state-backups/
  ├── dev-20241110-143022.tfstate
  ├── dev-20241110-150515.tfstate
  └── dev-20241110-152030.tfstate
```

### Restoring from Backup

If something goes wrong, you can restore:

```bash
cd stacks/cosmosdb

# Restore from backup
terraform state push .state-backups/dev-20241110-143022.tfstate

# Verify restoration
terraform state list
```

---

## Best Practices

### ✅ DO

- ✅ Run `validate-state` before major changes
- ✅ Use `backup-state` before risky operations
- ✅ Use `--dry-run` first to preview changes
- ✅ Keep backups for at least 7 days
- ✅ Document why you're modifying state
- ✅ Test in dev environment first

### ❌ DON'T

- ❌ Manually edit state files
- ❌ Delete backups without verification
- ❌ Use `--remove-resource` without `--dry-run` first
- ❌ Modify state during active deployments
- ❌ Share state files via email/Slack
- ❌ Ignore state validation warnings

---

## Troubleshooting

### "State is locked"

```bash
# Get lock ID from error message, then:
cd stacks/cosmosdb
terraform force-unlock <LOCK_ID>
```

### "Configuration validation failed"

```bash
# Check what's wrong
cd stacks/cosmosdb
terraform validate

# Fix configuration issues
# Then retry repair
./scripts/deploy-stack.sh repair-state cosmosdb dev
```

### "Cannot import non-existent remote object"

This means the Terraform configuration doesn't match the Azure resource. Options:

1. **Update configuration to match Azure**
   ```bash
   # Edit the configuration
   # Then retry repair
   ./scripts/deploy-stack.sh repair-state cosmosdb dev
   ```

2. **Remove from state and recreate**
   ```bash
   ./scripts/deploy-stack.sh clean-state cosmosdb dev --remove-resource
   ./scripts/deploy-stack.sh apply cosmosdb dev
   ```

---

## Integration with CI/CD

Add state validation to your CI/CD pipeline:

```bash
# In your pipeline before deployment
./scripts/deploy-stack.sh validate-state cosmosdb dev

# If validation fails, stop the pipeline
if [ $? -ne 0 ]; then
  echo "State validation failed - aborting deployment"
  exit 1
fi

# Proceed with deployment
./scripts/deploy-stack.sh apply cosmosdb dev
```

---

## References

- [Terraform State Documentation](https://www.terraform.io/language/state)
- [State Locking](https://www.terraform.io/language/state/locking)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

