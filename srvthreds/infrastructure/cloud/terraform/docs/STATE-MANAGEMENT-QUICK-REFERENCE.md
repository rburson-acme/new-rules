# State Management Quick Reference

## Commands at a Glance

| Command | Purpose | Safe? | Changes State? |
|---------|---------|-------|----------------|
| `validate-state` | Check state consistency | ✅ Yes | ❌ No |
| `backup-state` | Create timestamped backup | ✅ Yes | ❌ No |
| `repair-state` | Refresh state from Azure | ⚠️ Careful | ✅ Yes |
| `clean-state --dry-run` | Preview orphaned resources | ✅ Yes | ❌ No |
| `clean-state --remove-resource` | Remove orphaned resources | ⚠️ Careful | ✅ Yes |
| `force-unlock` | Unlock stuck state | ⚠️ Careful | ✅ Yes |

---

## Common Scenarios

### 🔍 "I want to check if state is healthy"
```bash
./scripts/deploy-stack.sh validate-state <stack> <env>
```

### 💾 "I want to backup state before making changes"
```bash
./scripts/deploy-stack.sh backup-state <stack> <env>
```

### 🔧 "State is out of sync with Azure (symlink issues)"
```bash
./scripts/deploy-stack.sh repair-state <stack> <env>
```

### 🗑️ "I want to remove orphaned resources from state"
```bash
# Preview first
./scripts/deploy-stack.sh clean-state <stack> <env> --dry-run

# Then remove
./scripts/deploy-stack.sh clean-state <stack> <env> --remove-resource
```

### 🔓 "State is locked and I can't deploy"
```bash
./scripts/deploy-stack.sh force-unlock <stack> <env>
```

---

## Full Recovery Workflow

### Step 1: Validate
```bash
./scripts/deploy-stack.sh validate-state cosmosdb dev
```
**What to look for**:
- ✅ "State is accessible (no lock)"
- ✅ "Configuration is valid"
- ✅ Resource count matches expectations

### Step 2: Backup
```bash
./scripts/deploy-stack.sh backup-state cosmosdb dev
```
**What to expect**:
- ✅ "State backed up to .state-backups/dev-TIMESTAMP.tfstate"

### Step 3: Repair
```bash
./scripts/deploy-stack.sh repair-state cosmosdb dev
```
**What to expect**:
- ✅ "State refreshed successfully"
- ✅ "State repair complete - no changes needed"

### Step 4: Verify
```bash
./scripts/deploy-stack.sh build cosmosdb dev
```
**What to expect**:
- ✅ "Build complete - plan saved"
- ✅ No unexpected changes in plan

---

## Bash Version Requirement

The script requires Bash 4.0+. On macOS with Homebrew:

```bash
# Check your bash version
bash --version

# If you have bash 3.x, use the Homebrew version
/opt/homebrew/bin/bash ./scripts/deploy-stack.sh <command>

# Or add to your PATH
export PATH="/opt/homebrew/bin:$PATH"
```

---

## State Backup Locations

Backups are stored in each stack directory:

```
stacks/cosmosdb/.state-backups/
  ├── dev-20241110-143022.tfstate
  ├── dev-20241110-150515.tfstate
  └── dev-20241110-152030.tfstate

stacks/keyvault/.state-backups/
  └── dev-20241110-143500.tfstate
```

### Restore from Backup

```bash
cd stacks/cosmosdb
terraform state push .state-backups/dev-20241110-143022.tfstate
```

---

## Error Messages & Solutions

### "Error acquiring the state lock"
```bash
# Get lock ID from error message, then:
./scripts/deploy-stack.sh force-unlock cosmosdb dev

# Or manually:
cd stacks/cosmosdb
terraform force-unlock <LOCK_ID>
```

### "Configuration validation failed"
```bash
# Check what's wrong
cd stacks/cosmosdb
terraform validate

# Fix issues, then retry
./scripts/deploy-stack.sh repair-state cosmosdb dev
```

### "Cannot import non-existent remote object"
```bash
# Option 1: Update configuration to match Azure
# Edit the configuration, then:
./scripts/deploy-stack.sh repair-state cosmosdb dev

# Option 2: Remove and recreate
./scripts/deploy-stack.sh clean-state cosmosdb dev --remove-resource
./scripts/deploy-stack.sh apply cosmosdb dev
```

### "No state found"
```bash
# This is normal for new stacks
# Just proceed with deployment
./scripts/deploy-stack.sh apply cosmosdb dev
```

---

## Best Practices Checklist

### Before Deployment
- [ ] Run `validate-state` to check health
- [ ] Review plan with `build`
- [ ] Confirm no unexpected changes

### Before Risky Changes
- [ ] Run `backup-state` to create backup
- [ ] Use `--dry-run` to preview changes
- [ ] Get approval before proceeding

### After Symlink Changes
- [ ] Run `validate-state` to verify
- [ ] Run `repair-state` if needed
- [ ] Run `build` to verify no changes

### Regular Maintenance
- [ ] Run `validate-state` weekly
- [ ] Clean up old backups (keep 7+ days)
- [ ] Document any state modifications

---

## Documentation

For more detailed information, see:

- **[STATE-MANAGEMENT-GUIDE.md](./STATE-MANAGEMENT-GUIDE.md)** - Complete user guide
- **[STATE-RECOVERY-GUIDE.md](./STATE-RECOVERY-GUIDE.md)** - Recovery strategies
- **[STATE-SYNC-SOLUTIONS.md](./STATE-SYNC-SOLUTIONS.md)** - Problem analysis
- **[STATE-MANAGEMENT-IMPLEMENTATION.md](./STATE-MANAGEMENT-IMPLEMENTATION.md)** - What was added

---

## Quick Command Reference

```bash
# Validation (safe)
./scripts/deploy-stack.sh validate-state <stack> <env>

# Backup (safe)
./scripts/deploy-stack.sh backup-state <stack> <env>

# Repair (modifies state)
./scripts/deploy-stack.sh repair-state <stack> <env>

# Clean - preview (safe)
./scripts/deploy-stack.sh clean-state <stack> <env> --dry-run

# Clean - remove (modifies state)
./scripts/deploy-stack.sh clean-state <stack> <env> --remove-resource

# Unlock (modifies state)
./scripts/deploy-stack.sh force-unlock <stack> <env>

# Help
./scripts/deploy-stack.sh help
```

---

## Support

If you encounter issues:

1. **Check the error message** - It usually tells you what's wrong
2. **Run `validate-state`** - Verify state is healthy
3. **Check the guides** - See STATE-MANAGEMENT-GUIDE.md
4. **Backup first** - Always backup before risky operations
5. **Ask for help** - Contact DevOps if unsure

---

## Key Takeaways

✅ **Always validate before deploying**
✅ **Always backup before modifying state**
✅ **Always use --dry-run first**
✅ **Always get confirmation before destructive operations**
✅ **Keep backups for at least 7 days**

---

## Examples

### Deploy with State Validation
```bash
./scripts/deploy-stack.sh validate-state cosmosdb dev
./scripts/deploy-stack.sh build cosmosdb dev
./scripts/deploy-stack.sh apply cosmosdb dev
```

### Recover from Symlink Issues
```bash
./scripts/deploy-stack.sh validate-state cosmosdb dev
./scripts/deploy-stack.sh repair-state cosmosdb dev
./scripts/deploy-stack.sh build cosmosdb dev
```

### Clean Up Orphaned Resources
```bash
./scripts/deploy-stack.sh clean-state cosmosdb dev --dry-run
./scripts/deploy-stack.sh backup-state cosmosdb dev
./scripts/deploy-stack.sh clean-state cosmosdb dev --remove-resource
```

### Unlock Stuck State
```bash
./scripts/deploy-stack.sh force-unlock cosmosdb dev
./scripts/deploy-stack.sh validate-state cosmosdb dev
```

