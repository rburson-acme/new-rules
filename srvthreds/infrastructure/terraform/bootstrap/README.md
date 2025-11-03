# Terraform Bootstrap

This directory contains the bootstrap infrastructure for Terraform state management.

## Purpose

Creates the foundational Azure resources needed to store Terraform state remotely:
- Resource Group for Terraform resources
- Storage Account (geo-redundant, encrypted)
- Storage Container for state files
- Management Lock to prevent accidental deletion

## Prerequisites

1. Azure CLI installed and logged in:
   ```bash
   az login
   az account set --subscription "Initiative Labs Production"
   ```

2. Terraform installed (v1.5+):
   ```bash
   terraform version
   ```

## Deployment

### Step 1: Initialize Terraform

```bash
cd infrastructure/terraform/bootstrap
terraform init
```

### Step 2: Review the Plan

```bash
terraform plan
```

Expected resources:
- 1 Resource Group
- 1 Storage Account (with random suffix for uniqueness)
- 1 Storage Container
- 1 Management Lock

### Step 3: Deploy

```bash
terraform apply
```

Type `yes` when prompted.

**Deployment time**: ~2-3 minutes

### Step 4: Save the Output

After deployment, save the backend configuration:

```bash
terraform output -raw backend_config > ../backend-config.txt
```

This output will show you how to configure the backend for other Terraform projects.

## Important Notes

### State Storage for Bootstrap

The bootstrap project stores its state **locally** in `terraform.tfstate`. This is intentional - you can't use remote state to create the remote state storage!

**Protect this file**:
- Add to `.gitignore` (should already be there)
- Back it up securely (consider storing in password manager or secure location)
- Never commit to version control

### Management Lock

The deployed storage account has a `CanNotDelete` lock. This prevents accidental deletion but you can still:
- Modify the storage account
- Add/remove containers
- Delete individual state files

To delete the storage account:
1. Remove the lock via Azure Portal or:
   ```bash
   az lock delete --name prevent-deletion \
     --resource-group srvthreds-terraform-rg \
     --resource-type Microsoft.Storage/storageAccounts \
     --resource srvthredstfstate<suffix>
   ```
2. Then run `terraform destroy`

### Cost

Estimated monthly cost: **~$5**
- Storage Account (GRS): ~$3/month for state files (minimal data)
- Storage operations: ~$2/month

## Next Steps

After bootstrap is deployed:

1. **Copy backend configuration** to other Terraform projects
2. **Create service principal** for automated Terraform runs
3. **Deploy development environment** using the new backend

## Troubleshooting

### Storage account name already exists

Storage account names must be globally unique. The random suffix should prevent conflicts, but if you get an error:
1. Run `terraform apply` again (will generate new random suffix)
2. Or manually set a unique suffix

### Can't access storage account

If you get access errors:
1. Verify you're logged in: `az account show`
2. Verify you have Owner role: `az role assignment list --assignee $(az ad signed-in-user show --query id -o tsv)`
3. Check firewall rules on the storage account

### State file is locked

If you see "state lock" errors:
- Another Terraform operation may be running
- Wait a few minutes and try again
- If stuck, you may need to manually break the lock (use with caution)

## Modifying Bootstrap

To update the bootstrap infrastructure:

```bash
cd infrastructure/terraform/bootstrap
terraform plan
terraform apply
```

The state is stored locally, so you can always update it.

## Destroying Bootstrap (Not Recommended)

Only destroy if you're tearing down the entire infrastructure:

```bash
# Remove management lock first
az lock delete --name prevent-deletion \
  --resource-group srvthreds-terraform-rg \
  --resource-type Microsoft.Storage/storageAccounts \
  --resource <storage-account-name>

# Then destroy
terraform destroy
```

**Warning**: This will destroy the storage for ALL Terraform state files across ALL environments!
