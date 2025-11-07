# SrvThreds Azure Terraform Stacks

Modular stack-based Terraform deployment for SrvThreds Azure infrastructure. Each stack is independently deployable and follows Army NETCOM naming conventions.

## Architecture Overview

This modular approach separates infrastructure into independent stacks that can be deployed individually or all together. Similar to the Catalyst bicep implementation pattern.

### Why Modular Stacks?

**Benefits:**
- Deploy and update resources independently
- Faster deployments (only deploy what changed)
- Easier troubleshooting and rollbacks
- Clear dependency management
- Team collaboration (different teams can own different stacks)
- Smaller Terraform state files

**vs. Monolithic Approach:**
- Monolithic: All resources in `environments/dev/main.tf`
- Modular: Each resource type has its own stack directory

## Stack Architecture

```
stacks/
├── networking/        # VNet, subnets, NSGs (Foundation)
├── keyvault/          # Key Vault with private endpoint
├── acr/               # Azure Container Registry
├── cosmosdb/          # CosmosDB MongoDB API
├── redis/             # Azure Cache for Redis
├── servicebus/        # Azure Service Bus
├── aks/               # Azure Kubernetes Service
├── appgateway/        # Application Gateway + WAF
└── monitoring/        # Log Analytics, App Insights
```

### Deployment Order

Stacks must be deployed in dependency order:

1. **networking** - Creates resource group and VNet (must be first)
2. **keyvault** - Depends on networking
3. **acr** - Depends on networking
4. **cosmosdb** - Depends on networking
5. **redis** - Depends on networking
6. **servicebus** - Depends on networking
7. **aks** - Depends on networking, acr
8. **appgateway** - Depends on networking
9. **monitoring** - Depends on networking

## Stack Structure

Each stack follows a consistent structure:

```
<stack-name>/
├── main.tf           # Terraform configuration and module calls
├── variables.tf      # Input variables
├── outputs.tf        # Output values (used by other stacks)
├── dev.tfvars        # Dev environment values
├── test.tfvars       # Test environment values (when ready)
└── prod.tfvars       # Prod environment values (when ready)
```

### Stack Dependencies

Stacks reference each other using Terraform remote state:

```hcl
# Example: Key Vault references networking outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}

# Use outputs from networking stack
vnet_id   = data.terraform_remote_state.networking.outputs.vnet_id
subnet_id = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
```

## Deployment Script

**IMPORTANT**: The `deploy-stack.sh` script is the **only** supported way to deploy infrastructure. Never run `terraform` commands directly.

### Available Commands

```bash
cd infrastructure/cloud/terraform

# build - Validate and plan (no changes, safe to run anytime)
./scripts/deploy-stack.sh build networking dev

# apply - Deploy stack (auto-runs build first if needed)
./scripts/deploy-stack.sh apply networking dev

# destroy - Destroy stack (checks for dependent stacks)
./scripts/deploy-stack.sh destroy keyvault dev

# all - Deploy all stacks in dependency order
./scripts/deploy-stack.sh all dev

# destroy-all - Destroy all stacks in reverse order
./scripts/deploy-stack.sh destroy-all dev

# status - Show deployment status and drift detection
./scripts/deploy-stack.sh status dev
```

### Deploy All Stacks

```bash
# Deploy all stacks in dependency order
./scripts/deploy-stack.sh all dev
```

This will:
1. **Phase 1**: Build (validate + plan) all stacks
2. **Confirmation**: Ask you to confirm before deploying
3. **Phase 2**: Apply all stacks in order if builds succeed

Deployment order:
1. networking (creates RG + VNet) ✅ Deployed
2. keyvault ✅ Deployed
3. acr ✅ Deployed
4. cosmosdb ✅ Created
5. redis ✅ Deployed
6. servicebus ✅ Deployed
7. aks ✅ Ready to deploy
8. appgateway (future)
9. monitoring (future)

## Quick Start Guide

### Step-by-Step Deployment

Follow these steps to deploy SrvThreds infrastructure using the modular stack approach.

#### Step 1: Verify Prerequisites

Before deploying stacks, ensure:

```bash
# Check Azure CLI login
az account show

# Check Terraform version (need 1.5+)
terraform version

# Verify bootstrap is deployed
az storage account list --resource-group srvthreds-terraform-rg --query "[].name" -o table
# Should show: srvthredstfstated9jvee
```

If bootstrap isn't deployed, see main [README.md](../README.md#step-2-deploy-bootstrap-one-time-setup).

#### Step 2: Navigate to Terraform Root

```bash
# From repository root
cd infrastructure/cloud/terraform
```

#### Step 3: Choose Deployment Method

**Method A: Deploy All Stacks (Fastest)**

```bash
# Deploy everything in one command
./scripts/deploy-stack.sh all dev

# What happens:
# Phase 1: Builds all stacks (validate + plan)
# Confirmation: Asks "Type 'yes' to proceed"
# Phase 2: Deploys all stacks in dependency order
```

✅ **Use this method for**: First-time deployment, deploying to new environment

**Method B: Deploy Individual Stacks (More Control)**

```bash
# Step 1: Deploy networking foundation
./scripts/deploy-stack.sh build networking dev
# Review the plan carefully - this creates the resource group!

./scripts/deploy-stack.sh apply networking dev
# Creates: Resource group, VNet, 5 subnets, 5 NSGs

# Step 2: Check deployment status
./scripts/deploy-stack.sh status dev
# Should show: networking ✓ Deployed

# Step 3: Deploy Key Vault
./scripts/deploy-stack.sh apply keyvault dev
# Auto-runs build, then deploys Key Vault with private endpoint

# Step 4: Verify both stacks deployed
./scripts/deploy-stack.sh status dev
# Should show:
# networking ✓ Deployed    15
# keyvault   ✓ Deployed    8

# Step 5: Deploy remaining stacks as they're implemented
# ./scripts/deploy-stack.sh apply acr dev
# ./scripts/deploy-stack.sh apply cosmosdb dev
# ./scripts/deploy-stack.sh apply aks dev
```

✅ **Use this method for**: Deploying one stack at a time, testing changes

**Method C: Check What's Deployed (Status)**

```bash
# See all stacks and their status
./scripts/deploy-stack.sh status dev

# Output example:
# Stack           Status          Resources
# ─────────────────────────────────────────────────
# networking      ✓ Deployed      15
# keyvault        ✓ Deployed      8
# acr             ○ Not deployed  0
# cosmosdb        ⚫ Not implemented
```

✅ **Use this method for**: Checking deployment health, detecting drift

#### Step 4: Verify in Azure Portal

After deployment, verify resources in Azure Portal:

1. Navigate to resource group: `CAZ-SRVTHREDS-D-E-RG`
2. You should see:
   - Virtual network: `CAZ-SRVTHREDS-D-E-NET-VNET`
   - Network security groups (5 total)
   - Key Vault: `CAZ-SRVTHREDS-D-E-KEY`
   - Private endpoint for Key Vault
   - Private DNS zone

#### Step 5: What's Next?

Once networking and keyvault are deployed:

```bash
# Deploy remaining stacks as they're implemented
./scripts/deploy-stack.sh apply acr dev
./scripts/deploy-stack.sh apply cosmosdb dev
./scripts/deploy-stack.sh apply redis dev
./scripts/deploy-stack.sh apply aks dev
```

Or deploy to other environments:

```bash
# Deploy to test
./scripts/deploy-stack.sh all test

# Deploy to production
./scripts/deploy-stack.sh all prod
```

## Resource Naming

All resources follow **Army NETCOM naming conventions**:

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-{FUNCTION}`

- **CAZ**: cARMY Azure
- **SRVTHREDS**: Application name
- **ENV**: D (dev), T (test), P (prod)
- **E**: Region (East US / Virginia Gov)

### Examples

| Resource | Dev Name | Test Name | Prod Name |
|----------|----------|-----------|-----------|
| Resource Group | CAZ-SRVTHREDS-D-E-RG | CAZ-SRVTHREDS-T-E-RG | CAZ-SRVTHREDS-P-E-RG |
| VNet | CAZ-SRVTHREDS-D-E-NET-VNET | CAZ-SRVTHREDS-T-E-NET-VNET | CAZ-SRVTHREDS-P-E-NET-VNET |
| Key Vault | CAZ-SRVTHREDS-D-E-KEY | CAZ-SRVTHREDS-T-E-KEY | CAZ-SRVTHREDS-P-E-KEY |
| AKS | CAZ-SRVTHREDS-D-E-AKS | CAZ-SRVTHREDS-T-E-AKS | CAZ-SRVTHREDS-P-E-AKS |

See [NAMING-CONVENTIONS.md](../NAMING-CONVENTIONS.md) for complete reference.

## Environment Configuration

Each environment has separate IP address spaces:

| Environment | VNet CIDR | Purpose |
|------------|-----------|---------|
| dev | 10.0.0.0/16 | Development, cost-optimized |
| test | 10.1.0.0/16 | Staging, prod-like config |
| prod | 10.2.0.0/16 | Production, HA, auto-scale |

## Network Architecture

All environments use a 5-tier subnet architecture:

```
VNet: CAZ-SRVTHREDS-{ENV}-E-NET-VNET
├── gateway-subnet (10.x.1.0/24)
│   └── Application Gateway + WAF
├── aks-subnet (10.x.2.0/20)
│   └── AKS cluster nodes (4094 IPs)
├── private-endpoint-subnet (10.x.20.0/24)
│   └── Private endpoints for all PaaS services
├── data-subnet (10.x.21.0/24)
│   └── Database tier (isolated)
└── support-subnet (10.x.22.0/24)
    └── Container Instances for jobs
```

## State Management

Each stack maintains its own state file in Azure Storage:

**State File Naming**: `stacks/{stack-name}/{environment}.tfstate`

Examples:
- `stacks/networking/dev.tfstate`
- `stacks/keyvault/dev.tfstate`
- `stacks/aks/dev.tfstate`

**Backend Configuration** (same for all stacks):
```hcl
backend "azurerm" {
  resource_group_name  = "srvthreds-terraform-rg"
  storage_account_name = "srvthredstfstated9jvee"
  container_name       = "tfstate"
  key                  = "stacks/<stack-name>/${var.environment}.tfstate"
}
```

## Deployed Stacks

### ✅ networking

**Purpose**: Foundation networking infrastructure

**Creates**:
- Single resource group (first deployment only)
- VNet with 5 subnets
- Network Security Groups for each subnet
- VNet encryption

**Dependencies**: None (must be deployed first)

**Outputs**: VNet ID, subnet IDs, NSG IDs

**Status**: Deployed to dev

### ✅ keyvault

**Purpose**: Secrets management with private access

**Creates**:
- Key Vault with RBAC authorization
- Private endpoint (Premium SKU)
- Private DNS zone

**Dependencies**: networking

**Outputs**: Key Vault ID, URI, private endpoint ID

**Status**: Deployed to dev

### ✅ acr

**Purpose**: Container image registry

**Creates**:
- Azure Container Registry (Standard SKU for dev)
- Supports private endpoint (Premium SKU)
- Admin user enabled

**Dependencies**: networking

**Outputs**: ACR ID, login server, admin credentials

**Status**: Deployed to dev

### ✅ cosmosdb

**Purpose**: MongoDB-compatible database

**Creates**:
- CosmosDB account (MongoDB API, Free tier for dev)
- Automatic backup
- Geo-redundancy (production)

**Dependencies**: networking

**Outputs**: CosmosDB ID, endpoint, connection strings

**Status**: Deployed to dev

### ✅ redis

**Purpose**: Caching layer

**Creates**:
- Azure Cache for Redis (Basic C0 for dev)
- TLS enforcement
- Supports private endpoint (Premium SKU)

**Dependencies**: networking

**Outputs**: Redis ID, hostname, port, primary key

**Status**: Deployed to dev

### ✅ servicebus

**Purpose**: Messaging and event streaming

**Creates**:
- Service Bus namespace (Basic SKU for dev)
- 3 queues: inbound-events, outbound-messages, dead-letter
- Supports private endpoint (Premium SKU)

**Dependencies**: networking

**Outputs**: Service Bus ID, endpoint, connection strings

**Status**: Deployed to dev

### ✅ aks

**Purpose**: Kubernetes cluster

**Creates**:
- AKS cluster (Free tier for dev, public endpoint)
- System-assigned managed identity
- Azure CNI networking with network policy
- Key Vault secrets provider enabled
- ACR integration via role assignment

**Dependencies**: networking, acr

**Outputs**: AKS ID, FQDN, kubeconfig, kubelet identity

**Status**: Deployed to dev (v1.33.5, 2 nodes)

### ✅ monitoring

**Purpose**: Observability and diagnostics

**Creates**:
- Log Analytics workspace (30-day retention, 5GB daily quota for dev)
- Application Insights (full sampling, 30-day retention)
- Action Groups for alerts (optional)

**Dependencies**: networking

**Outputs**: Log Analytics workspace ID, Application Insights ID, connection strings

**Status**: Deployed to dev

### ✅ appgateway

**Purpose**: Ingress with WAF capabilities

**Creates**:
- Application Gateway v2 (Standard_v2 for dev, WAF_v2 for prod)
- Public IP (static)
- WAF policy with OWASP 3.2 rules (WAF_v2 only)
- Modern TLS policy (TLS 1.2+)

**Dependencies**: networking

**Outputs**: Application Gateway ID, public IP address, backend pool ID

**Status**: Deployed to dev (Standard_v2, public IP: 172.171.199.160)

## Common Operations

**IMPORTANT**: Always use the deployment script. The examples below are for reference only - you should rarely need to run `terraform` commands directly.

### Check Deployment Status

```bash
# See all stacks, resource counts, and drift detection
./scripts/deploy-stack.sh status dev
```

### Build and Review Changes

```bash
# Validate and plan changes (safe, no modifications)
./scripts/deploy-stack.sh build networking dev

# Review the plan output, then apply
./scripts/deploy-stack.sh apply networking dev
```

### Deploy Individual Stacks

```bash
# Deploy a specific stack
./scripts/deploy-stack.sh apply keyvault dev

# The script automatically:
# - Checks dependencies are deployed
# - Runs build if no plan exists
# - Initializes backend if needed
```

### Destroy Resources

```bash
# Destroy a single stack (checks for dependents)
./scripts/deploy-stack.sh destroy keyvault dev

# Destroy all infrastructure (USE WITH CAUTION)
./scripts/deploy-stack.sh destroy-all dev
```

### Advanced: Manual Terraform Operations

**Only use these if the deployment script is not working:**

```bash
# View outputs from a stack
cd stacks/networking
terraform output

# View stack state
terraform show

# Import existing resource
terraform import azurerm_resource_group.main /subscriptions/.../resourceGroups/CAZ-SRVTHREDS-D-E-RG
```

## Troubleshooting

### Issue: "Missing dependencies"

**Symptom**: Error message "Missing dependencies for <stack>: networking"

**Solution**: The deployment script automatically checks dependencies. Deploy required stacks first:
```bash
# Deploy networking first
./scripts/deploy-stack.sh apply networking dev

# Then deploy dependent stack
./scripts/deploy-stack.sh apply keyvault dev
```

### Issue: "Cannot destroy - dependent stacks exist"

**Symptom**: Error message "Cannot destroy networking - these deployed stacks depend on it: keyvault"

**Solution**: The deployment script protects you from breaking dependencies. Either:

**Option A**: Destroy dependent stacks first
```bash
./scripts/deploy-stack.sh destroy keyvault dev
./scripts/deploy-stack.sh destroy networking dev
```

**Option B**: Destroy all in correct order
```bash
./scripts/deploy-stack.sh destroy-all dev
```

### Issue: "Not yet implemented"

**Symptom**: Error message "This stack has not been implemented yet"

**Solution**: Stack directory doesn't exist. Check available stacks:
```bash
./scripts/deploy-stack.sh status dev
```

### Issue: "Drift detected"

**Symptom**: Status command shows "⚠ Drift detected"

**Solution**: Resources were modified outside Terraform. Review changes and apply:
```bash
# See what changed
./scripts/deploy-stack.sh build networking dev

# Apply to sync state
./scripts/deploy-stack.sh apply networking dev
```

## Migration from Monolithic

If you have existing resources in `environments/dev/main.tf`:

1. **Export current state outputs**:
   ```bash
   cd environments/dev
   terraform output > outputs.txt
   ```

2. **Deploy networking stack** (will detect existing RG):
   ```bash
   cd ../../stacks/networking
   # Edit dev.tfvars: set create_resource_group = false
   terraform init
   terraform import azurerm_resource_group.main[0] <rg-id>
   terraform apply -var-file=dev.tfvars
   ```

3. **Deploy remaining stacks individually**

4. **Destroy old monolithic deployment** (after verification):
   ```bash
   cd environments/dev
   terraform destroy
   ```

## Cost Estimates

### Dev Environment (All Stacks)

- networking: ~$5/month
- keyvault: ~$10/month
- acr: ~$5/month
- cosmosdb: ~$10-30/month (serverless)
- redis: ~$15/month
- servicebus: ~$10/month
- aks: ~$50/month (2 nodes)
- appgateway: ~$150/month
- monitoring: ~$10/month

**Total**: ~$265-285/month

## Best Practices

1. **Always deploy networking first** - It creates the resource group
2. **Use the deployment script** - Ensures proper initialization
3. **Plan before apply** - Review changes before deploying
4. **Tag all resources** - Tags are included in common_tags
5. **Keep .tfvars out of Git** - Add `*.tfvars` to .gitignore (except examples)
6. **Commit .terraform.lock.hcl** - Ensures dependency consistency
7. **Use remote state** - Already configured in backend blocks
8. **Deploy to dev first** - Test in dev before test/prod

## Next Steps

1. Review [PHASE3-IMPLEMENTATION.md](../PHASE3-IMPLEMENTATION.md) for overall deployment guide
2. Deploy networking stack to dev
3. Deploy keyvault stack to dev
4. Implement remaining stacks (AKS, CosmosDB, etc.)
5. Create test environment configurations
6. Create prod environment configurations

## Documentation

- **[Naming Conventions](../NAMING-CONVENTIONS.md)** - Army NETCOM naming standards
- **[Phase 3 Guide](../PHASE3-IMPLEMENTATION.md)** - Overall deployment strategy
- **[Azure Security Requirements](../../../docs/cloud/AZURE-SECURITY-REQUIREMENTS.md)** - Security architecture
- **[Infrastructure Roadmap](../../../INFRASTRUCTURE-ROADMAP.md)** - Overall infrastructure plan

## Support

Initiative Labs Platform Team
- GitHub: github.com/initiative-labs/srvthreds
- Subscription: `f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed`

---

**Last Updated**: 2025-01-06
**Deployment Pattern**: Modular Stack-Based (Catalyst-inspired)
