# Terraform Infrastructure CLI

Type-safe CLI for managing Azure infrastructure deployments with comprehensive error handling and logging.

## Overview

The Terraform CLI provides a streamlined interface for infrastructure teams to:
- Preview infrastructure changes before deploying
- Deploy infrastructure stacks with dependency management
- Manage Terraform state (backup, validate, repair, clean)
- Cleanup infrastructure with soft-delete handling
- Bootstrap foundational infrastructure
- Check deployment status

## How It Works

### CLI Architecture

The Terraform CLI is a TypeScript-based wrapper around Terraform that provides:

1. **Dependency Management**: Automatically deploys stacks in the correct order based on dependencies
2. **Configuration Management**: Loads environment-specific configurations from JSON files
3. **State Management**: Configures remote state storage in Azure Storage
4. **Error Handling**: Provides detailed error messages and validation
5. **Dry-run Support**: Preview changes before applying them

### Interaction with Terraform

The CLI executes Terraform commands through a structured workflow:

```
CLI Command → Configuration Loading → Dependency Resolution → Terraform Execution
                                                                      ↓
                                                                terraform init
                                                                      ↓
                                                                terraform validate
                                                                      ↓
                                                                terraform plan
                                                                      ↓
                                                                terraform apply
```

Each Terraform command is executed with:
- Environment-specific variable files (`dev.tfvars`, `test.tfvars`, `prod.tfvars`)
- Backend configuration for remote state storage
- Proper working directory context
- Comprehensive logging and error handling

## Azure Authentication

### Prerequisites

Before using the Terraform CLI, you must authenticate with Azure. The CLI supports multiple authentication methods that are recognized by both the Azure CLI and Terraform's Azure provider.

### Authentication Methods

#### 1. Azure CLI Authentication (Recommended for Development)

```bash
# Login interactively
az login

# Set your subscription
az account set --subscription "<subscription-id>"

# Verify authentication
az account show
```

This method is ideal for:
- Local development
- Interactive sessions
- Testing and troubleshooting

#### 2. Service Principal Authentication (Recommended for CI/CD)

Create a service principal and set environment variables:

```bash
# Create service principal
az ad sp create-for-rbac --name "terraform-sp" --role="Contributor" \
  --scopes="/subscriptions/<subscription-id>"

# Set environment variables
export ARM_CLIENT_ID="<app-id>"
export ARM_CLIENT_SECRET="<password>"
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_TENANT_ID="<tenant-id>"
```

This method is ideal for:
- CI/CD pipelines
- Automated deployments
- Production environments

#### 3. Managed Identity Authentication (For Azure-hosted Systems)

If running on Azure VMs, Container Instances, or App Services:

```bash
export ARM_USE_MSI=true
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_TENANT_ID="<tenant-id>"
```

### Required Azure Permissions

The authenticated identity needs the following permissions:

- **Contributor** role on the subscription or resource groups
- **Storage Blob Data Contributor** on the Terraform state storage account
- **Key Vault Secrets Officer** for managing secrets (if using Key Vault)

### Verifying Authentication

Before running Terraform commands, verify your authentication:

```bash
# Check current account
az account show

# Test Azure provider authentication
cd infrastructure/cloud/terraform/stacks/networking
terraform init
terraform plan
```

### Troubleshooting Authentication

**Error: "Failed to get existing workspaces"**
```bash
# Solution: Re-authenticate with Azure CLI
az login
az account set --subscription "<subscription-id>"
```

**Error: "Error building ARM Config: obtain subscription"**
```bash
# Solution: Set subscription explicitly
export ARM_SUBSCRIPTION_ID="<subscription-id>"
```

**Error: "Authorization failed for resource"**
```bash
# Solution: Verify your role assignments
az role assignment list --assignee <your-principal-id>
```

## Usage

```bash
# Show help
npm run terraformCli -- --help

# Preview changes before deploying
npm run terraformCli -- plan dev

# Deploy all stacks to dev
npm run terraformCli -- deploy dev

# Deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault

# Backup state before deployment
npm run terraformCli -- state backup dev

# Check deployment status
npm run terraformCli -- status dev

# Cleanup with preview
npm run terraformCli -- cleanup dev --dry-run

# Cleanup with confirmation
npm run terraformCli -- cleanup dev
```

## Commands

### plan
Preview infrastructure changes without applying them. Generates Terraform plan files for review.

```bash
npm run terraformCli -- plan <environment> [stacks...]
```

This command:
- Initializes Terraform for each stack
- Validates configuration
- Generates plan files showing what would change
- Does NOT apply any changes

Use this to review changes before deploying.

### deploy
Deploy infrastructure stacks to Azure with automatic dependency resolution.

```bash
npm run terraformCli -- deploy <environment> [stacks...]

Options:
  --dry-run    Preview changes without applying
  --force      Skip confirmations
```

### state
Manage Terraform state files.

```bash
npm run terraformCli -- state <subcommand> <environment> [stacks...]

Subcommands:
  backup      Backup state files with timestamp
  validate    Check state consistency
  repair      Refresh state from Azure
  clean       Analyze state for orphaned resources
  show        Display current state
```

### cleanup
Cleanup infrastructure and state with soft-delete handling.

```bash
npm run terraformCli -- cleanup <environment> [options]

Options:
  --dry-run    Preview what will be deleted
  --force      Skip confirmations
```

### bootstrap
Initialize bootstrap infrastructure for Terraform state management.

```bash
npm run terraformCli -- bootstrap <environment> [options]

Options:
  --dry-run    Preview what will be created
  --force      Skip confirmations
```

### status
Check deployment status and resource counts.

```bash
npm run terraformCli -- status <environment> [stacks...]
```

## Configuration

Stack and environment configurations are stored in `infrastructure/shared/configs/terraform/`:

### stacks.json
Defines all available stacks and their dependencies:

```json
{
  "environments": ["dev", "test", "prod"],
  "stacks": [
    {
      "name": "networking",
      "path": "stacks/networking",
      "dependencies": []
    },
    {
      "name": "keyvault",
      "path": "stacks/keyvault",
      "dependencies": ["networking"]
    }
  ]
}
```

### environments.json
Environment-specific configuration:

```json
{
  "dev": {
    "resourceGroupName": "CAZ-SRVTHREDS-D-E-RG",
    "bootstrapResourceGroup": "srvthreds-terraform-rg",
    "bootstrapStorageAccount": "srvthredstfstate"
  }
}
```

## Architecture

```
terraform-cli/
├── cli.ts                 # Main CLI entry point
├── commands/
│   ├── deploy.ts         # Deploy stacks (with plan command)
│   ├── state.ts          # Manage state
│   ├── cleanup.ts        # Cleanup infrastructure
│   ├── bootstrap.ts      # Bootstrap infrastructure
│   └── status.ts         # Check status
├── utils/
│   ├── terraform.ts      # TerraformManager and executor abstraction
│   └── azure.ts          # Azure CLI operations
└── README.md
```

### TerraformManager Class

The `TerraformManager` class in [utils/terraform.ts](utils/terraform.ts) provides a high-level abstraction for Terraform operations:

**Key Features:**
- **Dependency Injection**: Accepts an optional `ITerraformExecutor` for testability
- **Type-Safe Operations**: All methods return strongly-typed results
- **Automatic Configuration**: Handles backend config and var files automatically
- **Comprehensive Commands**: Supports init, validate, plan, apply, destroy, refresh, import, taint, untaint

**Available Methods:**
```typescript
// Core operations
init(stackPath, options)      // Initialize with backend config
validate(stackPath, options)  // Validate configuration
plan(stackPath, planFile, options)  // Generate execution plan
apply(stackPath, planFile, options) // Apply changes
destroy(stackPath, options)   // Destroy resources

// State management
refresh(stackPath, options)   // Refresh state
showState(stackPath)          // Get current state as JSON
forceUnlock(stackPath, lockId, options) // Force unlock state

// Advanced operations
import(stackPath, address, id, options)  // Import existing resource
taint(stackPath, address, options)       // Mark resource for recreation
untaint(stackPath, address, options)     // Remove taint from resource
getOutput(stackPath, outputName)         // Get output values
```

**Command-Specific Options:**
```typescript
// TerraformInitOptions
{ upgrade: boolean, reconfigure: boolean }

// TerraformPlanOptions
{ destroy: boolean, refresh: boolean }

// TerraformApplyOptions
{ refresh: boolean }
```

### Backend Configuration

The CLI automatically configures Terraform remote state storage:

**Bootstrap Phase:**
1. Creates Azure Storage Account for state files
2. Creates container named `tfstate`
3. Enables versioning and encryption

**Runtime Configuration:**
For each stack, the CLI configures:
```bash
terraform init \
  -backend-config="key=stacks/<stack-name>/<environment>.tfstate" \
  -backend-config="resource_group_name=<bootstrap-rg>" \
  -backend-config="storage_account_name=<bootstrap-storage>" \
  -backend-config="container_name=tfstate"
```

This ensures:
- Isolated state per stack and environment
- Concurrent operations on different stacks
- State locking via Azure Blob Storage leases
- State history and rollback capability

## Shared Utilities

The CLI uses shared utilities from `infrastructure/tools/shared/`:

- **logger.ts** - Structured logging with colors and levels
- **shell.ts** - Shell command execution with streaming
- **config-loader.ts** - Type-safe configuration loading
- **error-handler.ts** - Consistent error handling and validation

## Error Handling

The CLI provides clear error messages and exit codes:

- `0` - Success
- `1` - General error
- `2` - Validation error
- `3` - Configuration error
- `4` - Execution error
- `5` - Azure error
- `6` - Terraform error

## Development

### Adding a new command

1. Create `commands/mycommand.ts`:

```typescript
export async function mycommandCommand(args: string[]): Promise<void> {
  // Implementation
}
```

2. Register in `cli.ts`:

```typescript
commands.set('mycommand', {
  name: 'mycommand',
  description: 'My command description',
  handler: mycommandCommand,
});
```

### Adding a new stack

1. Update `infrastructure/shared/configs/terraform/stacks.json`
2. Create stack directory in `infrastructure/cloud/terraform/stacks/`
3. Add Terraform configuration files

## Troubleshooting

See `infrastructure/cloud/terraform/docs/TROUBLESHOOTING.md` for common issues and solutions.

