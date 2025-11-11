# SrvThreds Azure Cloud Infrastructure

Terraform infrastructure-as-code for deploying SrvThreds to Azure with private networking and multi-environment support.

## Quick Start

All infrastructure deployments are managed through the **Terraform CLI**. This ensures consistent configuration, proper dependency ordering, and comprehensive error handling.

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

## Documentation

- **[Terraform Docs Index](docs/README.md)** - Complete Terraform documentation
  - Deployment guides, best practices, and all module documentation
- **[Terraform CLI](../../tools/terraform-cli/README.md)** - CLI tool documentation
- **[Azure Setup Guide](../../docs/cloud/AZURE-SETUP-GUIDE.md)** - Initial Azure configuration
- **[RBAC Guide](../../docs/cloud/AZURE-RBAC-GUIDE.md)** - Role-based access control

## Prerequisites

Before deploying, ensure you have:

```bash
# Azure CLI installed and logged in
az login
az account set --subscription "<subscription-id>"

# Terraform 1.5+
terraform version

# Bash 4.0+
bash --version
```

## Directory Structure

```
terraform/
├── bootstrap/              # Bootstrap infrastructure (state storage)
├── stacks/                 # Infrastructure stacks
│   ├── networking/         # VNet, subnets, NSGs
│   ├── keyvault/          # Key Vault for secrets
│   ├── acr/               # Container registry
│   ├── cosmosdb/          # Cosmos DB database
│   ├── redis/             # Redis cache
│   ├── servicebus/        # Service Bus messaging
│   ├── monitoring/        # Monitoring and logging
│   ├── aks/               # Kubernetes cluster
│   ├── appgateway/        # Application Gateway
│   └── _shared/           # Shared backend configuration
├── docs/                   # Documentation
└── README.md              # This file
```

## Deployment Workflow

### 1. Bootstrap (First Time Only)

```bash
npm run terraformCli -- bootstrap dev
```

This creates the storage account for Terraform state. The storage account name includes a random suffix (e.g., `srvthredstfstatei274ht`).

### 2. Deploy Infrastructure

```bash
# Deploy all stacks
npm run terraformCli -- deploy dev

# Or deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault
```

The CLI automatically handles:
- Dependency resolution (deploys in correct order)
- Terraform initialization and validation
- Planning and applying changes
- Error handling and rollback

### 3. Verify Deployment

```bash
npm run terraformCli -- status dev
```

## Stacks

Infrastructure is organized into independent stacks with clear dependencies:

| Stack | Purpose | Dependencies |
|-------|---------|--------------|
| **networking** | VNet, subnets, NSGs | None |
| **keyvault** | Secrets management | networking |
| **acr** | Container registry | networking |
| **cosmosdb** | MongoDB database | networking |
| **redis** | Cache layer | networking |
| **servicebus** | Message queue | networking |
| **monitoring** | Logging & monitoring | networking |
| **aks** | Kubernetes cluster | networking, acr |
| **appgateway** | Load balancer | networking |

## Common Commands

```bash
# Preview changes before deploying
npm run terraformCli -- plan dev

# Deploy all stacks
npm run terraformCli -- deploy dev

# Deploy specific stacks
npm run terraformCli -- deploy dev networking keyvault

# Check status
npm run terraformCli -- status dev

# Backup state
npm run terraformCli -- state backup dev

# Cleanup infrastructure
npm run terraformCli -- cleanup dev --dry-run
npm run terraformCli -- cleanup dev
```

## State Management

Manage Terraform state with the CLI:

```bash
# Backup state before risky operations
npm run terraformCli -- state backup dev

# Check state consistency
npm run terraformCli -- state validate dev

# Refresh state from Azure
npm run terraformCli -- state repair dev

# Show state information
npm run terraformCli -- state show dev
```

## Directory Structure

```
terraform/
├── bootstrap/              # Bootstrap infrastructure (state storage)
├── stacks/                 # Infrastructure stacks
│   ├── networking/         # VNet, subnets, NSGs
│   ├── keyvault/          # Key Vault
│   ├── acr/               # Container registry
│   ├── cosmosdb/          # MongoDB database
│   ├── redis/             # Cache
│   ├── servicebus/        # Message queue
│   ├── monitoring/        # Logging & monitoring
│   ├── aks/               # Kubernetes cluster
│   ├── appgateway/        # Load balancer
│   └── _shared/           # Shared backend configuration
├── modules/               # Reusable Terraform modules
│   └── azure/             # 11 production-ready Azure modules
├── docs/                  # Centralized documentation
│   ├── README.md          # Documentation index
│   ├── deployment-guide.md
│   ├── bootstrap-guide.md
│   ├── stacks-guide.md
│   ├── best-practices.md
│   └── modules/           # Module documentation
└── README.md              # This file
```

## Architecture

### Security Model

- **Zero Public Endpoints** - All PaaS services use private endpoints
- **Network Segmentation** - 5-tier subnet architecture with NSGs
- **Private AKS** - Kubernetes API not publicly accessible
- **Managed Identities** - No secrets in code
- **VNet Encryption** - Traffic encrypted on Azure backbone

### Subnet Architecture

```
VNet: CAZ-SRVTHREDS-{ENV}-E-NET-VNET
├── Gateway Subnet          → Application Gateway + WAF
├── AKS Subnet             → Kubernetes nodes
├── Private Endpoint Subnet → Private endpoints for PaaS services
├── Data Subnet            → Database tier (isolated)
└── Support Subnet         → Container Instances for jobs
```

## Naming Convention

Resources follow Army NETCOM naming standards:

```
CAZ-SRVTHREDS-{ENV}-E-{RESOURCE}
```

Where:
- `CAZ` - Commercial Azure
- `SRVTHREDS` - Application name
- `{ENV}` - Environment code (D=dev, T=test, P=prod)
- `E` - Enterprise
- `{RESOURCE}` - Resource type (RG, NET, KEY, etc.)

## Getting Help

For detailed information:

- **[Terraform Documentation Index](docs/README.md)** - Complete Terraform documentation
- **[Terraform CLI](../../tools/terraform-cli/README.md)** - CLI tool documentation
- **[Troubleshooting Guide](../../docs/TROUBLESHOOTING.md)** - Common issues and solutions

For command help:

```bash
npm run terraformCli -- --help
npm run terraformCli -- <command> --help
```

## Key Principles

- ✅ Always use the Terraform CLI - never run `terraform` directly
- ✅ Preview changes with `--dry-run` before applying
- ✅ Use `status` command regularly to check deployment health
- ✅ Backup state before risky operations
- ✅ The CLI handles all backend configuration automatically

## Support

For issues or questions:
1. Check [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)
2. Enable debug logging: `npm run terraformCli -- --debug <command>`
3. Contact infrastructure team
