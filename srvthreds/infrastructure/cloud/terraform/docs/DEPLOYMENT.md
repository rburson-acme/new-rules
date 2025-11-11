# Azure Infrastructure Deployment Guide

Complete guide for deploying and managing Azure infrastructure using the Terraform CLI.

## Quick Start

```bash
# Show available commands
npm run terraformCli -- --help

# Deploy all stacks to dev
npm run terraformCli -- deploy dev

# Check deployment status
npm run terraformCli -- status dev

# Cleanup infrastructure
npm run terraformCli -- cleanup dev --dry-run
npm run terraformCli -- cleanup dev
```

## Prerequisites

Before deploying, ensure:

```bash
# You're logged into Azure
az account show

# You have the right subscription
az account set --subscription "<subscription-id>"

# You're in the project root
cd srvthreds

# You have Terraform 1.5+
terraform version

# You have bash 4.0+
bash --version
```

## Deployment Workflow

### 1. Bootstrap Infrastructure (First Time Only)

Initialize the foundational infrastructure for Terraform state management:

```bash
npm run terraformCli -- bootstrap dev
```

This creates:
- Resource group: `srvthreds-terraform-rg`
- Storage account: `srvthredstfstate<random>`
- Container: `tfstate`
- Management lock to prevent accidental deletion

**Note:** The storage account name includes a random suffix. Save this for reference.

### 2. Deploy Infrastructure

Deploy all stacks with automatic dependency resolution:

```bash
# Deploy all stacks
npm run terraformCli -- deploy dev

# Deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault

# Preview changes first
npm run terraformCli -- deploy dev --dry-run
```

Deployment order (respects dependencies):
1. networking (creates VNet and subnets)
2. keyvault (depends on networking)
3. acr (depends on networking)
4. cosmosdb (depends on networking)
5. redis (depends on networking)
6. servicebus (depends on networking)
7. monitoring (depends on networking)
8. aks (depends on networking, acr)
9. appgateway (depends on networking)

### 3. Verify Deployment

Check deployment status:

```bash
npm run terraformCli -- status dev
```

This shows:
- Azure resources in the resource group
- Terraform state for each stack
- Resource counts and outputs

## State Management

### Backup State

Before making changes, backup your state:

```bash
npm run terraformCli -- state backup dev
```

Backups are stored in `.state-backups/` with timestamps.

### Validate State

Check state consistency:

```bash
npm run terraformCli -- state validate dev
```

### Repair State

Refresh state from Azure (useful if state is out of sync):

```bash
npm run terraformCli -- state repair dev networking
```

### Show State

Display current state information:

```bash
npm run terraformCli -- state show dev networking
```

## Cleanup and Reset

### Preview Cleanup

Always preview before cleanup:

```bash
npm run terraformCli -- cleanup dev --dry-run
```

### Cleanup Infrastructure

Remove all infrastructure and state:

```bash
npm run terraformCli -- cleanup dev
```

This will:
1. Destroy all Terraform stacks (in reverse order)
2. Delete Terraform state files
3. Purge soft-deleted Key Vaults (90-day retention)
4. Purge soft-deleted Storage Accounts (7-day retention)
5. Delete resource group
6. Cleanup bootstrap infrastructure

**Warning:** This is destructive and cannot be undone. You will be prompted for confirmation.

### Force Cleanup

Skip confirmations (use with caution):

```bash
npm run terraformCli -- cleanup dev --force
```

## Environment Variables

The CLI uses these environment variables:

- `AZURE_SUBSCRIPTION_ID` - Azure subscription ID (optional, can be set with `az account set`)
- `TF_VAR_environment` - Terraform environment variable (set automatically by CLI)

## Troubleshooting

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for common issues and solutions.

## Advanced Usage

### Deploy with Debug Logging

```bash
npm run terraformCli -- --debug deploy dev
```

### Dry-Run Mode

Preview changes without applying:

```bash
npm run terraformCli -- deploy dev --dry-run
npm run terraformCli -- cleanup dev --dry-run
```

### Force Mode

Skip all confirmations (use carefully):

```bash
npm run terraformCli -- deploy dev --force
npm run terraformCli -- cleanup dev --force
```

## Configuration

Stack and environment configurations are in `infrastructure/shared/configs/terraform/`:

- **stacks.json** - Stack definitions and dependencies
- **environments.json** - Environment-specific settings

To add a new stack:
1. Update `stacks.json` with stack definition
2. Create stack directory in `infrastructure/cloud/terraform/stacks/`
3. Add Terraform configuration files

## Support

For detailed command help:

```bash
npm run terraformCli -- <command> --help
```

For CLI documentation:
- See `infrastructure/tools/terraform-cli/README.md`

For Terraform documentation:
- See `infrastructure/cloud/terraform/README.md`

