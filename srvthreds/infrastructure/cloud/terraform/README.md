# SrvThreds Azure Cloud Infrastructure

Terraform infrastructure-as-code for deploying SrvThreds to Azure with private networking and multi-environment support.

## Deployment Pattern

**IMPORTANT**: All infrastructure deployments are managed through the `deploy-stack.sh` script. This is the **only** supported way to deploy, update, or destroy resources.

- ✅ **Use**: `./scripts/deploy-stack.sh`
- ❌ **Don't use**: Manual `terraform` commands

This ensures consistent backend configuration, proper dependency ordering, and prevents configuration errors.

## Quick Start

Follow these steps in order to deploy SrvThreds infrastructure to Azure.

### Step 1: Prerequisites

Before starting, ensure you have:

**Azure CLI** installed and you're logged in:
```bash
# Install Azure CLI if needed
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login to Azure
az login

# Set the correct subscription
az account set --subscription "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"

# Verify you're on the right subscription
az account show --query "{Name:name, SubscriptionId:id}" -o table
```

**Terraform** version 1.5 or higher:
```bash
# Check Terraform version
terraform version

# Should show: Terraform v1.5.x or higher
```

### Step 2: Deploy Bootstrap (One-Time Setup)

The bootstrap creates Azure Storage for Terraform state files. This is the **only** time you run terraform directly.

```bash
# Navigate to bootstrap directory
cd infrastructure/cloud/terraform/bootstrap

# Initialize Terraform
terraform init

# Deploy the state storage
terraform apply

# IMPORTANT: Save the storage account name from the output
# You'll see: storage_account_name = "srvthredstfstated9jvee"
```

✅ **Checkpoint**: You should see a new resource group `srvthreds-terraform-rg` in Azure portal.

### Step 3: Deploy Infrastructure to Dev

Now use the deployment script for all infrastructure operations.

**Option A: Deploy Everything (Recommended)**

```bash
# Navigate to terraform root
cd infrastructure/cloud/terraform

# Deploy all stacks to dev environment
./scripts/deploy-stack.sh all dev

# The script will:
# 1. Build (validate + plan) each stack
# 2. Show you what will be created
# 3. Ask for confirmation
# 4. Deploy everything in dependency order
```

**Option B: Deploy Individual Stacks**

```bash
cd infrastructure/cloud/terraform

# Step 1: Deploy networking (foundation)
./scripts/deploy-stack.sh build networking dev   # Review what will be created
./scripts/deploy-stack.sh apply networking dev   # Deploy it

# Step 2: Deploy Key Vault
./scripts/deploy-stack.sh apply keyvault dev     # Auto-runs build first

# Step 3: Deploy remaining stacks as they're implemented
# ./scripts/deploy-stack.sh apply acr dev
# ./scripts/deploy-stack.sh apply cosmosdb dev
# ./scripts/deploy-stack.sh apply aks dev
```

✅ **Checkpoint**: Run `./scripts/deploy-stack.sh status dev` to see what's deployed.

### Step 4: Verify Deployment

Check that everything deployed successfully:

```bash
# Show deployment status
./scripts/deploy-stack.sh status dev

# You should see:
# networking     ✓ Deployed        15
# keyvault       ✓ Deployed        8
```

Verify in Azure Portal:
- Resource group: `CAZ-SRVTHREDS-D-E-RG`
- VNet: `CAZ-SRVTHREDS-D-E-NET-VNET`
- Key Vault: `CAZ-SRVTHREDS-D-E-KEY`

## What's Included

### ✅ Deployed to Dev

- **[networking](modules/azure/networking/)** - VNet, subnets, NSGs
- **[keyvault](modules/azure/keyvault/)** - Key Vault with RBAC
- **[acr](modules/azure/acr/)** - Container Registry (Standard SKU)
- **[cosmosdb](modules/azure/cosmosdb/)** - MongoDB API (Free tier)
- **[redis](modules/azure/redis/)** - Cache (Basic C0)
- **[servicebus](modules/azure/servicebus/)** - Messaging with 3 queues
- **[aks](modules/azure/aks/)** - Kubernetes cluster (v1.33.5, 2 nodes, Free tier)
- **[monitoring](modules/azure/monitoring/)** - Log Analytics + Application Insights
- **[appgateway](modules/azure/appgateway/)** - Application Gateway (Standard_v2, TLS 1.2+)

### ✅ Available Modules

- **[private-endpoint](modules/azure/private-endpoint/)** - Reusable for Premium SKUs

## Common Operations

```bash
# Build (validate and plan) a stack - safe, no changes
./scripts/deploy-stack.sh build networking dev

# Deploy a stack (auto-runs build first)
./scripts/deploy-stack.sh apply networking dev

# Show deployment status
./scripts/deploy-stack.sh status dev

# Deploy all stacks in dependency order
./scripts/deploy-stack.sh all dev

# Destroy a stack (with dependency checking)
./scripts/deploy-stack.sh destroy keyvault dev

# Destroy all infrastructure (requires special confirmation)
./scripts/deploy-stack.sh destroy-all dev
```

## Directory Structure

```
.
├── bootstrap/              # Terraform state storage (run first with terraform directly)
├── scripts/
│   └── deploy-stack.sh    # 🎯 Primary deployment tool (use this for everything)
├── stacks/                # ✅ Modular stack deployments
│   ├── networking/        # ✅ VNet, subnets, NSGs (deployed)
│   ├── keyvault/          # ✅ Key Vault (deployed)
│   ├── acr/               # ✅ Container registry (deployed)
│   ├── cosmosdb/          # ✅ MongoDB API (deployed)
│   ├── redis/             # ✅ Cache for Redis (deployed)
│   ├── servicebus/        # ✅ Messaging (deployed)
│   ├── aks/               # ✅ Kubernetes cluster (deployed)
│   ├── monitoring/        # ✅ Log Analytics + App Insights (deployed)
│   └── appgateway/        # ✅ Application Gateway (deployed)
└── modules/
    └── azure/             # Reusable Terraform modules
        ├── networking/
        ├── keyvault/
        ├── acr/
        ├── cosmosdb/
        ├── redis/
        ├── servicebus/
        ├── aks/
        ├── monitoring/
        ├── appgateway/
        └── private-endpoint/
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
VNet: initiative-{env}-vnet
├── Gateway Subnet          → Application Gateway + WAF
├── AKS Subnet             → Kubernetes nodes
├── Private Endpoint Subnet → Private endpoints for PaaS services
├── Data Subnet            → Database tier (isolated)
└── Support Subnet         → Container Instances for jobs
```

## Environment Strategy

| Environment | VNet CIDR | Purpose | Domains |
|------------|-----------|---------|---------|
| **dev** | 10.0.0.0/16 | Development, cost-optimized | dev.initiative.io |
| **test** | 10.1.0.0/16 | Staging, prod-like config | test.initiative.io |
| **prod** | 10.2.0.0/16 | Production, HA, auto-scale | *.initiative.io |

## Common Workflows

### Daily Development Workflow

**Check what's currently deployed:**
```bash
cd infrastructure/cloud/terraform
./scripts/deploy-stack.sh status dev
```

**Make a change to infrastructure:**
```bash
# 1. Edit the stack files (e.g., stacks/networking/main.tf)

# 2. Preview changes before applying
./scripts/deploy-stack.sh build networking dev

# 3. Review the plan output carefully

# 4. Apply the changes
./scripts/deploy-stack.sh apply networking dev

# 5. Verify the changes
./scripts/deploy-stack.sh status dev
```

**Add a new stack:**
```bash
# 1. Create stack directory and files
# 2. Deploy the new stack
./scripts/deploy-stack.sh build <new-stack> dev
./scripts/deploy-stack.sh apply <new-stack> dev
```

### Promoting to Test/Production

**Deploy to test environment:**
```bash
# Review what will be deployed
./scripts/deploy-stack.sh status test

# Deploy all stacks to test
./scripts/deploy-stack.sh all test

# Verify deployment
./scripts/deploy-stack.sh status test
```

**Deploy to production:**
```bash
# Production requires extra care
# 1. Ensure test is working correctly
# 2. Deploy to production
./scripts/deploy-stack.sh all prod

# 3. Verify critical resources
./scripts/deploy-stack.sh status prod
```

### Destroying Resources

**Destroy a single stack:**
```bash
# The script checks for dependent stacks automatically
./scripts/deploy-stack.sh destroy keyvault dev

# If other stacks depend on it, you'll see an error like:
# "Cannot destroy networking - these deployed stacks depend on it: keyvault"
```

**Destroy all infrastructure:**
```bash
# WARNING: This destroys everything in the environment
./scripts/deploy-stack.sh destroy-all dev

# You'll need to type: destroy-all-dev
```

### Troubleshooting Deployments

**Build failed with errors:**
```bash
# Fix the error in the stack files
# Then run build again
./scripts/deploy-stack.sh build networking dev
```

**Detect configuration drift:**
```bash
# Status command shows drift automatically
./scripts/deploy-stack.sh status dev

# If you see "⚠ Drift detected":
./scripts/deploy-stack.sh build networking dev   # See what changed
./scripts/deploy-stack.sh apply networking dev   # Sync state
```

**Missing dependencies error:**
```bash
# Error: "Missing dependencies for keyvault: networking"
# Solution: Deploy dependencies first
./scripts/deploy-stack.sh apply networking dev
./scripts/deploy-stack.sh apply keyvault dev
```

**Important Notes:**
- ✅ Always use `./scripts/deploy-stack.sh` - never run `terraform` directly in stacks/
- ✅ Run `build` before `apply` to preview changes
- ✅ Use `status` command regularly to check deployment health
- ✅ The script handles all backend configuration automatically

## Documentation

- **[Stacks Deployment Guide](stacks/README.md)** - Complete modular deployment documentation
- **[Phase 3 Implementation Guide](PHASE3-IMPLEMENTATION.md)** - Overall deployment strategy
- **[Naming Conventions](NAMING-CONVENTIONS.md)** - Army NETCOM naming standards
- **[Azure Setup Guide](../../docs/cloud/AZURE-SETUP-GUIDE.md)** - Subscription setup
- **[Azure Security Requirements](../../docs/cloud/AZURE-SECURITY-REQUIREMENTS.md)** - Security architecture
- **[Infrastructure Roadmap](../../INFRASTRUCTURE-ROADMAP.md)** - Overall infrastructure plan

## Reference

- **Catalyst Infrastructure**: `~/Repos/catalyst-infrastructure/bicep/innovation-resources/`
- **Azure Terraform Provider**: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs

## Support

Initiative Labs Platform Team
- GitHub: github.com/initiative-labs/srvthreds
- Subscription ID: `f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed`

---

**Status**: Phase 3 In Progress
**Last Updated**: 2025-01-06
