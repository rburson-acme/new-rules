# Phase 3: Azure Cloud Deployment - Implementation Guide

## Overview

This document provides a step-by-step guide to implementing Phase 3 of the SrvThreds infrastructure roadmap: deploying to Azure cloud with private networking and multi-environment support.

## Current Status

### ✅ Completed

1. **Infrastructure Roadmap Updated** - Updated to reflect Azure (not AWS) deployment strategy
2. **Bootstrap Infrastructure** - Terraform state storage in Azure (`bootstrap/`)
3. **Modular Stack Architecture** - Independent deployable stacks with shared backend config
4. **Networking Stack** (`stacks/networking/`) - Deployed to dev
   - VNet with 5 subnet architecture
   - Network Security Groups for each subnet tier
   - Support for VNet encryption
   - Module: `modules/azure/networking/`
5. **Private Endpoint Module** (`modules/azure/private-endpoint/`)
   - Reusable module for any Azure service
   - Automatic Private DNS zone creation and linking
6. **Key Vault Stack** (`stacks/keyvault/`) - Deployed to dev
   - RBAC authorization enabled
   - Configurable purge protection (prod vs dev)
   - Module: `modules/azure/keyvault/`
7. **ACR Stack** (`stacks/acr/`) - Deployed to dev
   - Standard SKU for dev (no private endpoint)
   - Premium SKU for prod with private endpoint support
   - Module: `modules/azure/acr/`
8. **CosmosDB Stack** (`stacks/cosmosdb/`) - Created
   - MongoDB API 4.2 with configurable throughput
   - Free tier for dev, autoscale for test, continuous backup for prod
   - Module: `modules/azure/cosmosdb/`
9. **Redis Stack** (`stacks/redis/`) - Deployed to dev
   - Basic C0 for dev, Standard for test, Premium for prod
   - Private endpoint support on Premium SKU
   - Module: `modules/azure/redis/`
10. **Service Bus Stack** (`stacks/servicebus/`) - Deployed to dev
   - Basic SKU for dev, Standard for test, Premium for prod
   - Queues: inbound-events, outbound-messages, dead-letter
   - Private endpoint support on Premium SKU
   - Module: `modules/azure/servicebus/`
11. **AKS Stack** (`stacks/aks/`) - Created (ready to deploy)
   - Free tier for dev/test, Standard (SLA) for prod
   - Private cluster for prod, public for dev/test
   - Azure CNI networking, auto-scaling, zone redundancy
   - ACR integration, Key Vault secrets provider
   - Module: `modules/azure/aks/`

### 🚧 In Progress / Next Steps

12. **Application Gateway Module** - WAF and TLS termination
13. **Monitoring Module** - Log Analytics and Application Insights

## Architecture

### Network Design

```
VNet: initiative-{env}-vnet (10.x.0.0/16)
├── Gateway Subnet (10.x.1.0/24)
│   └── Application Gateway + WAF
├── AKS Subnet (10.x.2.0/20)
│   └── AKS Private Cluster nodes
├── Private Endpoint Subnet (10.x.20.0/24)
│   └── Private endpoints for all PaaS services
├── Data Subnet (10.x.21.0/24)
│   └── Database tier (isolated)
└── Support Subnet (10.x.22.0/24)
    └── Container Instances for jobs
```

### Environment IP Allocation

- **Dev**: 10.0.0.0/16
- **Test**: 10.1.0.0/16
- **Prod**: 10.2.0.0/16

### Security Principles

1. **Zero Public Endpoints** - All PaaS services accessible only via private endpoints
2. **Defense in Depth** - NSGs on every subnet with deny-default rules
3. **Managed Identities** - No connection strings or keys in code
4. **Private AKS** - Kubernetes API server not publicly accessible
5. **VNet Encryption** - Traffic encrypted within Azure backbone
6. **RBAC Everywhere** - Azure RBAC for all service-to-service access

## Deployment Instructions

### Prerequisites

1. **Azure CLI** installed and authenticated:
   ```bash
   az login
   az account set --subscription "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
   az account show
   ```

2. **Terraform** v1.5+ installed:
   ```bash
   terraform version
   ```

3. **Access Permissions** - Owner or Contributor role on subscription

### Step 1: Deploy Bootstrap (One-time)

This creates the Terraform remote state storage:

```bash
cd infrastructure/cloud/terraform/bootstrap
terraform init
terraform plan
terraform apply

# Save outputs for later
terraform output storage_account_name
# Output example: srvthredstfstate3a5b2c
```

### Step 2: Deploy Dev Environment

```bash
cd ../environments/dev

# Initialize with remote backend
terraform init \
  -backend-config="resource_group_name=srvthreds-terraform-rg" \
  -backend-config="storage_account_name=srvthredstfstate3a5b2c" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=dev.terraform.tfstate"

# Review plan
terraform plan

# Deploy
terraform apply
```

**What gets created:**
- 1 Resource group (initiative-dev-rg) containing all resources
- Virtual Network with 5 subnets
- 5 Network Security Groups
- Key Vault with private endpoint
- Private DNS zone for Key Vault

**Estimated time:** 5-10 minutes
**Estimated cost:** ~$15/month (mostly Key Vault and networking)

### Step 3: Verify Deployment

```bash
# List resource groups
az group list --query "[?contains(name,'initiative-dev')].name" -o table

# List resources in the dev resource group
az resource list \
  --resource-group initiative-dev-rg \
  --query "[].{Name:name, Type:type}" -o table

# Check VNet
az network vnet show \
  --resource-group initiative-dev-rg \
  --name initiative-dev-vnet \
  --query "{name:name, subnets:length(subnets)}" -o table

# Check Key Vault
az keyvault show \
  --name initiative-dev-kv \
  --query "{name:name, publicAccess:publicNetworkAccess}" -o table
```

### Step 4: Configure Backend (Optional)

If you want to enable the remote backend in the dev environment code:

1. Edit `environments/dev/main.tf`
2. Uncomment the `backend "azurerm"` block
3. Replace `<from bootstrap output>` with actual storage account name
4. Run `terraform init -migrate-state`

## Module Reference

### Networking Module

**Location**: `modules/azure/networking/`

**Purpose**: Creates VNet, subnets, and NSGs with security-first defaults

**Usage**:
```hcl
module "networking" {
  source = "../../modules/azure/networking"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.network.name
  vnet_address_space  = "10.0.0.0/16"

  enable_ddos_protection = false  # true for prod
  enable_vnet_encryption = true

  tags = local.common_tags
}
```

**Outputs**:
- `vnet_id`, `vnet_name`
- `gateway_subnet_id`, `aks_subnet_id`, `private_endpoint_subnet_id`, `data_subnet_id`, `support_subnet_id`
- `nsg_*_id` for each NSG

### Private Endpoint Module

**Location**: `modules/azure/private-endpoint/`

**Purpose**: Reusable module to create private endpoint and DNS zone for any Azure service

**Usage**:
```hcl
module "private_endpoint" {
  source = "../../modules/azure/private-endpoint"

  location                       = "eastus"
  resource_group_name            = "my-rg"
  private_endpoint_name          = "myservice"
  subnet_id                      = module.networking.private_endpoint_subnet_id
  private_connection_resource_id = azurerm_cosmosdb_account.main.id
  subresource_names              = ["MongoDB"]  # Service-specific
  private_dns_zone_name          = "privatelink.mongo.cosmos.azure.net"
  vnet_id                        = module.networking.vnet_id
  tags                           = local.common_tags
}
```

**Common Subresource Names**:
- CosmosDB (MongoDB): `["MongoDB"]`
- Key Vault: `["vault"]`
- Redis: `["redisCache"]`
- Storage Blob: `["blob"]`
- ACR: `["registry"]`

### Key Vault Module

**Location**: `modules/azure/keyvault/`

**Purpose**: Azure Key Vault with private endpoint and RBAC

**Usage**:
```hcl
module "keyvault" {
  source = "../../modules/azure/keyvault"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.security.name
  vnet_id             = module.networking.vnet_id
  subnet_id           = module.networking.private_endpoint_subnet_id

  sku_name                      = "standard"
  purge_protection_enabled      = false  # true for prod
  public_network_access_enabled = false

  tags = local.common_tags
}
```

**Outputs**:
- `key_vault_id`, `key_vault_name`, `key_vault_uri`
- `private_endpoint_id`, `private_dns_zone_id`

## Next Module Development Priorities

### 1. AKS Module (Highest Priority)

**Requirements**:
- Private cluster (no public API endpoint)
- System-assigned managed identity
- Azure CNI networking
- Workload identity enabled
- Integration with Key Vault via CSI driver

**Reference**: See Catalyst patterns for App Service integration

### 2. CosmosDB Module

**Requirements**:
- MongoDB API (4.2+)
- Private endpoint only
- Serverless for dev, provisioned for prod
- Automatic backup enabled

**Private DNS Zone**: `privatelink.mongo.cosmos.azure.net`

### 3. Redis Module

**Requirements**:
- Azure Cache for Redis
- Basic SKU for dev, Standard for prod
- Private endpoint only
- TLS 1.2+ enforced

**Private DNS Zone**: `privatelink.redis.cache.windows.net`

### 4. Azure Container Registry Module

**Requirements**:
- Premium SKU (supports private endpoints)
- Private endpoint only
- Managed identity pull access from AKS
- Vulnerability scanning enabled

**Private DNS Zone**: `privatelink.azurecr.io`

## Naming Conventions

All resources follow **Army NETCOM naming standards**. See [NAMING-CONVENTIONS.md](NAMING-CONVENTIONS.md) for complete details.

| Resource | Pattern | Dev Example | Prod Example |
|----------|---------|-------------|--------------|
| Resource Groups | CAZ-SRVTHREDS-{ENV}-E-RG | CAZ-SRVTHREDS-D-E-RG | CAZ-SRVTHREDS-P-E-RG |
| VNet | CAZ-SRVTHREDS-{ENV}-E-NET-VNET | CAZ-SRVTHREDS-D-E-NET-VNET | CAZ-SRVTHREDS-P-E-NET-VNET |
| Subnets | {purpose}-subnet | aks-subnet, private-endpoint-subnet | (same) |
| Key Vault | CAZ-SRVTHREDS-{ENV}-E-KEY | CAZ-SRVTHREDS-D-E-KEY | CAZ-SRVTHREDS-P-E-KEY |
| AKS | CAZ-SRVTHREDS-{ENV}-E-AKS | CAZ-SRVTHREDS-D-E-AKS | CAZ-SRVTHREDS-P-E-AKS |
| CosmosDB | CAZ-SRVTHREDS-{ENV}-E-COSMOS | CAZ-SRVTHREDS-D-E-COSMOS | CAZ-SRVTHREDS-P-E-COSMOS |
| Redis Cache | CAZ-SRVTHREDS-{ENV}-E-REDIS | CAZ-SRVTHREDS-D-E-REDIS | CAZ-SRVTHREDS-P-E-REDIS |
| ACR | cazsrvthreds{env}eacr (no hyphens) | cazsrvthredsdeacr | cazsrvthredspeacr |

**Convention Components**:
- **CAZ**: cARMY Azure
- **SRVTHREDS**: Application name
- **ENV**: D (dev), T (test), P (prod)
- **E**: Region (East US, eventually Virginia Gov)

**Note**: Each environment has a single resource group containing all resources.

## Cost Estimates

### Development Environment (~$100/month)

- VNet + NSGs: ~$5/month
- Key Vault: ~$10/month
- AKS (2-node cluster): ~$50/month
- CosmosDB (serverless): ~$10-30/month
- Redis (Basic): ~$15/month
- ACR (Basic): ~$5/month

### Production Environment (~$500-800/month)

- VNet + DDoS Protection: ~$3,000/month (DDoS is expensive!)
- Key Vault (Premium): ~$125/month
- AKS (4-10 nodes): ~$200-500/month
- CosmosDB (provisioned): ~$50-200/month
- Redis (Standard HA): ~$75/month
- ACR (Premium): ~$20/month
- Application Gateway: ~$150/month

**Recommendation**: Skip DDoS Protection initially, add when revenue justifies cost

## Migration Path to Azure Government

When ready to migrate to Azure Government Cloud:

1. **Create new Terraform environments**: `environments/govcloud-dev/`, `environments/govcloud-prod/`
2. **Update provider configuration**:
   ```hcl
   provider "azurerm" {
     environment = "usgovernment"
     # ... other config
   }
   ```
3. **Update Private DNS Zone names** (different in gov cloud):
   - Key Vault: `privatelink.vaultcore.usgovcloudapi.net`
   - CosmosDB: `privatelink.mongo.cosmos.usgovcloudapi.net`
   - Etc.
4. **Deploy in parallel** to validate
5. **Migrate data** via secure transfer
6. **Cut over DNS**
7. **Decommission commercial cloud** resources

## Troubleshooting

### Common Issues

**Issue**: "Storage account name already exists"
- **Solution**: Run bootstrap again, it will generate a new random suffix

**Issue**: "Insufficient permissions to create resource"
- **Solution**: Verify you have Contributor or Owner role: `az role assignment list --assignee <your-email>`

**Issue**: "Cannot connect to Key Vault"
- **Solution**: Key Vault is private-only. You must be on VNet or use Azure Bastion to access

**Issue**: "Terraform state locked"
- **Solution**: Wait for other operation to complete, or use `terraform force-unlock <lock-id>`

## Support

For questions or issues:
- **Documentation**: See `infrastructure/docs/cloud/`
- **Catalyst Reference**: `~/Repos/catalyst-infrastructure/bicep/innovation-resources/`
- **Team**: Initiative Labs Platform Team

---

**Last Updated**: 2025-01-06
**Status**: Phase 3 In Progress
**Next Milestone**: Deploy complete dev environment with AKS
