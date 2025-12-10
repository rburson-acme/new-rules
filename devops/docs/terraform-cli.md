# Terraform CLI Guide

The Terraform CLI (`terraform-cli`) manages Azure infrastructure deployments using Terraform with type-safe configuration and comprehensive error handling.

## Usage

```bash
npm run terraform -- <command> [options]

# Or directly:
tsx tools/terraform-cli/cli.ts <command> [options]
```

## Global Options

| Option | Description |
|--------|-------------|
| `--debug` | Enable debug logging |
| `--help`, `-h` | Show help message |

---

## Commands

### init

Initialize Terraform and pull remote state for an environment.

```bash
npm run terraform -- init -p <project> <environment> [stacks...] [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `environment` | Environment name: `dev`, `test`, `prod` |
| `stacks` | Optional: specific stacks to initialize |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--no-state` | Skip showing resource counts | `false` |

**Example:**

```bash
# Initialize all stacks for dev
npm run tf:srvthreds:init -- dev

# Initialize specific stacks
npm run terraform -- init -p srvthreds dev networking keyvault

# Initialize without state display (faster)
npm run terraform -- init -p srvthreds prod --no-state
```

**What it does:**
1. Connects to Azure Storage backend
2. Pulls current state for each stack
3. Displays resource counts per stack

---

### plan

Preview Terraform changes without applying.

```bash
npm run terraform -- plan -p <project> <environment> [stacks...] [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--target` | Target specific resource | - |

**Example:**

```bash
# Plan all stacks
npm run tf:srvthreds:plan -- dev

# Plan specific stacks
npm run terraform -- plan -p srvthreds dev aks
```

---

### deploy

Deploy infrastructure stacks to Azure.

```bash
npm run terraform -- deploy -p <project> <environment> [stacks...] [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--dry-run` | Preview changes only | `false` |
| `--auto-approve` | Skip confirmation prompts | `false` |

**Example:**

```bash
# Deploy all stacks
npm run tf:srvthreds:apply -- dev

# Deploy specific stacks
npm run terraform -- deploy -p srvthreds dev networking keyvault

# Preview only
npm run terraform -- deploy -p srvthreds dev --dry-run
```

**What it does:**
1. Sorts stacks by dependencies
2. For each stack: init → plan → apply
3. Respects dependency order (networking before aks)

---

### destroy

Destroy infrastructure stacks.

```bash
npm run terraform -- destroy -p <project> <environment> <stacks...> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `environment` | Environment name |
| `stacks` | Stacks to destroy (required, at least one) |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--dry-run` | Preview destruction | `false` |
| `--force` | Skip confirmation | `false` |

**Example:**

```bash
# Destroy specific stacks
npm run tf:srvthreds:destroy -- dev servicebus redis

# Preview destruction
npm run terraform -- destroy -p srvthreds dev aks --dry-run
```

**What it does:**
1. Reverse sorts by dependencies (destroys dependents first)
2. Confirms destruction (unless `--force`)
3. Runs terraform destroy for each stack

---

### status

Check deployment status and resource counts.

```bash
npm run terraform -- status -p <project> <environment> [stacks...]
```

**Example:**

```bash
# Status of all stacks
npm run tf:srvthreds:status -- dev

# Status of specific stacks
npm run terraform -- status -p srvthreds dev aks monitoring
```

**Shows:**
- Stack initialization status
- Resource counts
- Last apply timestamp

---

### state

Manage Terraform state files.

```bash
npm run terraform -- state <subcommand> <environment> [stacks...] [options]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `backup` | Backup state files |
| `validate` | Validate state consistency |
| `repair` | Repair state from Azure resources |
| `recover` | Recover out-of-sync resources |
| `clean` | Remove orphaned resources |
| `show` | Display state contents |

**Example:**

```bash
# Backup state
npm run terraform -- state backup dev

# Validate state
npm run terraform -- state validate dev

# Recover after "already exists" errors
npm run terraform -- state recover dev aks
```

---

### state-backend (bootstrap)

Initialize Terraform state backend infrastructure.

```bash
npm run terraform -- state-backend <environment> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview creation | `false` |
| `--force` | Skip confirmation | `false` |

**Example:**

```bash
# Bootstrap dev state backend
npm run tf:srvthreds:bootstrap -- dev
```

**Creates:**
- Resource group for state storage
- Storage account with blob container
- Configures encryption and access

---

### output

Get Terraform outputs from deployed stacks.

```bash
npm run terraform -- output <environment> [stack] [output-name]
```

**Example:**

```bash
# All outputs for environment
npm run terraform -- output dev

# Outputs for specific stack
npm run terraform -- output dev aks

# Specific output value
npm run terraform -- output dev aks aks_name
```

---

### cleanup

Cleanup infrastructure with soft-delete handling.

```bash
npm run terraform -- cleanup <environment> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--dry-run` | Preview cleanup | `false` |
| `--force` | Skip confirmation | `false` |

**What it does:**
- Purges soft-deleted Key Vaults
- Cleans up orphaned resources
- Handles Azure soft-delete restrictions

---

### validate-security

Validate Azure infrastructure security configuration.

```bash
npm run terraform -- validate-security <environment> [resource-group]
```

**Example:**

```bash
npm run tf:srvthreds:validate-security -- dev
```

**Validates:**
- Resource group locks
- Network security (VNet encryption, NSG rules)
- Private endpoints
- AKS cluster security settings
- RBAC configuration
- Encryption settings
- Monitoring configuration

---

### import

Import existing Azure resources into Terraform state.

```bash
npm run terraform -- import <stack> <resource-type> <terraform-name> <azure-name>
```

**Supported Resource Types:**
- `resource-group`
- `storage-account`
- `key-vault`
- `aks-cluster`
- `acr`
- `vnet`
- `subnet`
- `nsg`
- `private-endpoint`
- `cosmos-db`
- `redis`
- `servicebus-namespace`
- `log-analytics`
- `app-insights`

**Example:**

```bash
# Import existing AKS cluster
npm run terraform -- import aks aks-cluster main my-aks-cluster
```

---

### fix-symlinks

Validate and fix Terraform backend symlink consistency.

```bash
npm run terraform -- fix-symlinks [--check]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--check` | Check only, don't fix |

---

## Dependency Management

Stacks are deployed in dependency order:

```
networking (no deps)
    ↓
keyvault (depends on networking)
    ↓
acr (no deps, can run parallel)
    ↓
aks (depends on networking, keyvault, acr)
    ↓
monitoring (depends on aks)
```

For destruction, the order is reversed.

---

## Workflows

### Initial Setup

```bash
# 1. Login to Azure
az login
az account set --subscription <subscription-id>

# 2. Bootstrap state backend
npm run tf:srvthreds:bootstrap -- dev

# 3. Initialize all stacks
npm run tf:srvthreds:init -- dev

# 4. Deploy infrastructure
npm run tf:srvthreds:apply -- dev
```

### Daily Operations

```bash
# Check status
npm run tf:srvthreds:status -- dev

# Preview changes
npm run tf:srvthreds:plan -- dev

# Apply changes
npm run tf:srvthreds:apply -- dev
```

### Promoting to Production

```bash
# 1. Deploy to test first
npm run tf:srvthreds:apply -- test

# 2. Validate security
npm run tf:srvthreds:validate-security -- test

# 3. Deploy to prod
npm run tf:srvthreds:apply -- prod

# 4. Validate prod security
npm run tf:srvthreds:validate-security -- prod
```

### Troubleshooting

```bash
# State is out of sync
npm run terraform -- state recover dev aks

# Resource already exists error
npm run terraform -- state recover dev

# Check what's in state
npm run terraform -- state show dev aks
```

---

## Configuration Files

### stacks.json

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
      "name": "aks",
      "path": "stacks/aks",
      "dependencies": ["networking", "keyvault", "acr"]
    }
  ]
}
```

### environments.json

```json
{
  "dev": {
    "subscriptionId": "...",
    "resourceGroupName": "CAZ-SRVTHREDS-D-E-RG",
    "stateBackendResourceGroup": "srvthreds-terraform-rg",
    "stateBackendStorageAccount": "srvthredstfstatedev"
  }
}
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General CLI error |
| 2 | Validation error |
| 3 | Configuration error |
| 4 | Execution error |
| 5 | Azure API error |
| 6 | Terraform error |
