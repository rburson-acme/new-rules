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
│   ├── deploy.ts         # Deploy stacks
│   ├── state.ts          # Manage state
│   ├── cleanup.ts        # Cleanup infrastructure
│   ├── bootstrap.ts      # Bootstrap infrastructure
│   └── status.ts         # Check status
├── utils/
│   ├── terraform.ts      # Terraform operations
│   └── azure.ts          # Azure CLI operations
└── README.md
```

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

