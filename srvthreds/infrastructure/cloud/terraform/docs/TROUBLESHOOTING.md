# Troubleshooting Guide

Common issues and solutions for Azure infrastructure deployment.

## Deployment Issues

### "Terraform initialization failed"

**Cause:** Backend configuration or state file issues.

**Solution:**
```bash
# Backup current state
npm run terraformCli -- state backup dev

# Repair state from Azure
npm run terraformCli -- state repair dev

# Try deployment again
npm run terraformCli -- deploy dev
```

### "Resource already exists"

**Cause:** Soft-deleted resources still exist in Azure (Key Vaults or Storage Accounts have 7-90 day retention).

**Solution:**
```bash
# Check soft-deleted resources
az keyvault list-deleted
az storage account list-deleted

# Wait for automatic purge or manually purge
az keyvault purge --name <name> --location <location>
az storage account purge --name <name> --resource-group <rg>

# Try deployment again
npm run terraformCli -- deploy dev
```

### "Cannot delete resource group"

**Cause:** Resources still exist or management locks prevent deletion.

**Solution:**
```bash
# Check what's in the resource group
az resource list --resource-group CAZ-SRVTHREDS-D-E-RG

# Check for management locks
az lock list --resource-group srvthreds-terraform-rg

# Remove locks if needed
az lock delete --name "prevent-deletion" --resource-group srvthreds-terraform-rg

# Try cleanup again
npm run terraformCli -- cleanup dev --dry-run
npm run terraformCli -- cleanup dev
```

### "State lock timeout"

**Cause:** Another deployment is in progress or a lock is stuck.

**Solution:**
```bash
# Check for locks
terraform -chdir=infrastructure/cloud/terraform/stacks/networking force-unlock <lock-id>

# Or use the CLI
npm run terraformCli -- state repair dev
```

## State Issues

### "State is out of sync with Azure"

**Cause:** Manual changes in Azure or failed deployments.

**Solution:**
```bash
# Refresh state from Azure
npm run terraformCli -- state repair dev

# Validate state consistency
npm run terraformCli -- state validate dev

# Show current state
npm run terraformCli -- state show dev
```

### "Cannot read state file"

**Cause:** Corrupted state file or backend configuration issue.

**Solution:**
```bash
# Backup current state
npm run terraformCli -- state backup dev

# Check backend configuration
cat infrastructure/cloud/terraform/stacks/_shared/backend-config.tf

# Verify symlinks are correct
ls -la infrastructure/cloud/terraform/stacks/*/backend-config.tf

# Repair state
npm run terraformCli -- state repair dev
```

## Azure Issues

### "Authentication failed"

**Cause:** Not logged into Azure or wrong subscription.

**Solution:**
```bash
# Login to Azure
az login

# Check current subscription
az account show

# Set correct subscription
az account set --subscription "<subscription-id>"

# Verify login
az account show
```

### "Insufficient permissions"

**Cause:** User doesn't have required permissions in Azure.

**Solution:**
- Contact your Azure administrator
- Ensure you have "Contributor" or "Owner" role on the subscription
- Check role assignments: `az role assignment list --assignee <your-email>`

### "Quota exceeded"

**Cause:** Azure subscription quota limits reached.

**Solution:**
```bash
# Check current usage
az vm list --resource-group CAZ-SRVTHREDS-D-E-RG

# Request quota increase in Azure Portal
# Settings → Subscriptions → Usage + quotas
```

## Cleanup Issues

### "Cleanup failed partway through"

**Cause:** One of the cleanup steps failed.

**Solution:**
```bash
# Check what's left
az resource list --resource-group CAZ-SRVTHREDS-D-E-RG
az keyvault list-deleted
az storage account list-deleted

# Manually clean up remaining resources
az group delete --name CAZ-SRVTHREDS-D-E-RG --yes

# Try cleanup again
npm run terraformCli -- cleanup dev --dry-run
npm run terraformCli -- cleanup dev --force
```

### "Cannot purge soft-deleted resources"

**Cause:** Retention period hasn't elapsed or permissions issue.

**Solution:**
```bash
# Check deletion dates
az keyvault list-deleted --query "[].{name:name, deletionDate:deletionDate, scheduledPurgeDate:scheduledPurgeDate}"

# Wait for scheduled purge date or request early purge
# Contact Azure support if needed

# Check permissions
az role assignment list --assignee <your-email>
```

## Symlink Issues

### "Symlink validation failed"

**Cause:** Backend configuration symlinks are broken or missing.

**Solution:**
```bash
# Check symlinks
ls -la infrastructure/cloud/terraform/stacks/*/backend-config.tf

# Validate symlinks
cd infrastructure/cloud/terraform
ls -la stacks/keyvault/backend-config.tf
ls -la stacks/acr/backend-config.tf

# All should point to: ../_shared/backend-config.tf

# If broken, recreate them
cd stacks/keyvault
rm backend-config.tf
ln -s ../_shared/backend-config.tf backend-config.tf
```

## CLI Issues

### "Command not found"

**Cause:** npm script not registered or CLI not installed.

**Solution:**
```bash
# Check npm scripts
npm run | grep terraform

# Reinstall dependencies
npm install

# Try again
npm run terraformCli -- --help
```

### "Permission denied"

**Cause:** Script doesn't have execute permissions.

**Solution:**
```bash
# Make scripts executable
chmod +x infrastructure/tools/terraform-cli/cli.ts

# Try again
npm run terraformCli -- --help
```

### "Module not found"

**Cause:** TypeScript compilation or import issues.

**Solution:**
```bash
# Check TypeScript compilation
npm run check

# Reinstall dependencies
npm install

# Clear cache
rm -rf node_modules/.cache

# Try again
npm run terraformCli -- --help
```

## Getting Help

If you encounter an issue not listed here:

1. **Enable debug logging:**
   ```bash
   npm run terraformCli -- --debug <command>
   ```

2. **Check logs:**
   - CLI output shows detailed error messages
   - Terraform logs: `TF_LOG=DEBUG terraform plan`

3. **Verify prerequisites:**
   ```bash
   az account show
   terraform version
   bash --version
   ```

4. **Check configuration:**
   ```bash
   cat infrastructure/shared/configs/terraform/stacks.json
   cat infrastructure/shared/configs/terraform/environments.json
   ```

5. **Contact infrastructure team** with:
   - Error message and full output
   - Environment (dev/test/prod)
   - Command that failed
   - Recent changes made

