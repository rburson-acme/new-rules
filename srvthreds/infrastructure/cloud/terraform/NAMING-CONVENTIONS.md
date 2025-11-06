# SrvThreds Azure Naming Conventions

This document defines the naming conventions for all Azure resources in the SrvThreds project, following **Army NETCOM naming standards** as defined in the [cARMY_NAMING_CONVENTIONS.md](cARMY_NAMING_CONVENTIONS.md).

## Overview

All resources follow the Army naming convention pattern with these standard components:

- **CAZ**: cARMY Azure (constant)
- **SRVTHREDS**: Application name (constant)
- **ENV**: Environment code (D=dev, T=test, P=prod)
- **E**: Region code (E=East US, eventually Virginia Gov)

## Resource Naming Standards

### Resource Groups

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-RG`

| Environment | Name | Example |
|------------|------|---------|
| Development | CAZ-SRVTHREDS-D-E-RG | Resource group for dev |
| Test | CAZ-SRVTHREDS-T-E-RG | Resource group for test |
| Production | CAZ-SRVTHREDS-P-E-RG | Resource group for prod |

**Character Limit**: 64 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)

### Virtual Networks

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-NET-VNET`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-NET-VNET |
| Test | CAZ-SRVTHREDS-T-E-NET-VNET |
| Production | CAZ-SRVTHREDS-P-E-NET-VNET |

**Character Limit**: 64 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)

### Subnets

**Pattern**: `{purpose}-subnet` (lowercase)

| Subnet | Name | Purpose |
|--------|------|---------|
| Gateway | gateway-subnet | Application Gateway + WAF |
| AKS | aks-subnet | AKS cluster nodes |
| Private Endpoints | private-endpoint-subnet | Private endpoints for PaaS |
| Data | data-subnet | Database tier |
| Support | support-subnet | Container instances for jobs |

**Note**: Subnet names are not constrained by Army naming as they are sub-resources.

### Key Vault

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-KEY`

| Environment | Name | Length |
|------------|------|--------|
| Development | CAZ-SRVTHREDS-D-E-KEY | 21 chars |
| Test | CAZ-SRVTHREDS-T-E-KEY | 21 chars |
| Production | CAZ-SRVTHREDS-P-E-KEY | 21 chars |

**Character Limit**: 24 characters (Azure limit)
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)
**Uniqueness**: Global

### AKS Cluster

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-AKS`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-AKS |
| Test | CAZ-SRVTHREDS-T-E-AKS |
| Production | CAZ-SRVTHREDS-P-E-AKS |

**Character Limit**: 63 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)

### CosmosDB Account

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-COSMOS`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-COSMOS |
| Test | CAZ-SRVTHREDS-T-E-COSMOS |
| Production | CAZ-SRVTHREDS-P-E-COSMOS |

**Character Limit**: 44 characters
**Allowed Characters**: a-z, 0-9, - (hyphen), must be lowercase
**Uniqueness**: Global

### Azure Cache for Redis

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-REDIS`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-REDIS |
| Test | CAZ-SRVTHREDS-T-E-REDIS |
| Production | CAZ-SRVTHREDS-P-E-REDIS |

**Character Limit**: 63 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)
**Uniqueness**: Global

### Azure Service Bus Namespace

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-SB`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-SB |
| Test | CAZ-SRVTHREDS-T-E-SB |
| Production | CAZ-SRVTHREDS-P-E-SB |

**Character Limit**: 50 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)
**Uniqueness**: Global

### Azure Container Registry

**Pattern**: `cazsrvthreds{env}eacr` (no hyphens, lowercase)

| Environment | Name |
|------------|------|
| Development | cazsrvthredsdeacr |
| Test | cazsrvthredsteacr |
| Production | cazsrvthredspeacr |

**Character Limit**: 50 characters
**Allowed Characters**: a-z, 0-9 (alphanumeric only, no hyphens)
**Uniqueness**: Global

### Storage Accounts

**Pattern**: `cazsrvthreds{env}estg{function}` (no hyphens, lowercase)

| Function | Dev Name | Purpose |
|----------|----------|---------|
| Terraform State | cazsrvthredsdestgtf | Terraform state files |
| Application Logs | cazsrvthredsdestglogs | Application logs |
| Bootstrap Data | cazsrvthredsdestgboot | Bootstrap configs |

**Character Limit**: 24 characters
**Allowed Characters**: a-z, 0-9 (lowercase alphanumeric only)
**Uniqueness**: Global

### Application Gateway

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-AGW`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-AGW |
| Test | CAZ-SRVTHREDS-T-E-AGW |
| Production | CAZ-SRVTHREDS-P-E-AGW |

**Character Limit**: 80 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)

### Log Analytics Workspace

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-LOGS`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-LOGS |
| Test | CAZ-SRVTHREDS-T-E-LOGS |
| Production | CAZ-SRVTHREDS-P-E-LOGS |

**Character Limit**: 63 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen)

### Application Insights

**Pattern**: `CAZ-SRVTHREDS-{ENV}-E-AI`

| Environment | Name |
|------------|------|
| Development | CAZ-SRVTHREDS-D-E-AI |
| Test | CAZ-SRVTHREDS-T-E-AI |
| Production | CAZ-SRVTHREDS-P-E-AI |

**Character Limit**: 260 characters
**Allowed Characters**: a-z, A-Z, 0-9, - (hyphen), . (period), _ (underscore)

## Virtual Machine Naming (Future)

If VMs are needed, they must follow Army NETCOM standards:

**Pattern**: `CAZAW{UIC}{FUNCTION}{ENV}{ORDINAL}`

Example: `CAZAW123AAA0D01`

- **CA**: cARMY location
- **Z**: Azure Unclassified
- **A**: Project code (assigned)
- **W123AA**: UIC (assigned)
- **A0**: Application Server function code
- **D**: Development environment
- **01**: Ordinal number

**Character Limit**: 15 characters (Windows NetBIOS requirement)
**Allowed Characters**: A-Z, 0-9 (uppercase alphanumeric only, per RFC 1035)

**Important**: Do not begin VM names with "CAZZ" as this bypasses naming policy.

## Private Endpoints

**Pattern**: `{resource-name}-pe`

Private endpoints are automatically named by appending `-pe` to the resource name.

Examples:
- Key Vault PE: `CAZ-SRVTHREDS-D-E-KEY-pe`
- CosmosDB PE: `CAZ-SRVTHREDS-D-E-COSMOS-pe`
- ACR PE: `cazsrvthredsdeacr-pe`

## Private DNS Zones

**Pattern**: `privatelink.{service}.azure.net` (commercial) or `privatelink.{service}.usgovcloudapi.net` (government)

| Service | Commercial Cloud | Government Cloud |
|---------|-----------------|------------------|
| Key Vault | privatelink.vaultcore.azure.net | privatelink.vaultcore.usgovcloudapi.net |
| CosmosDB (MongoDB) | privatelink.mongo.cosmos.azure.net | privatelink.mongo.cosmos.usgovcloudapi.net |
| Redis | privatelink.redis.cache.windows.net | privatelink.redis.cache.usgovcloudapi.net |
| ACR | privatelink.azurecr.io | privatelink.azurecr.us |
| Storage Blob | privatelink.blob.core.windows.net | privatelink.blob.core.usgovcloudapi.net |

## Network Security Groups

**Pattern**: `{vnet-name}-{subnet-name}-nsg`

| Subnet | NSG Name |
|--------|----------|
| Gateway | CAZ-SRVTHREDS-D-E-NET-VNET-gateway-nsg |
| AKS | CAZ-SRVTHREDS-D-E-NET-VNET-aks-nsg |
| Private Endpoints | CAZ-SRVTHREDS-D-E-NET-VNET-pe-nsg |
| Data | CAZ-SRVTHREDS-D-E-NET-VNET-data-nsg |
| Support | CAZ-SRVTHREDS-D-E-NET-VNET-support-nsg |

## Region Codes

| Code | Region | Cloud Type |
|------|--------|-----------|
| E | East US | Commercial (current) |
| E | Virginia Gov | Government (future) |
| W | West US / Arizona Gov | Alternative |

## Environment Codes

| Code | Environment | Description |
|------|-------------|-------------|
| D | Development | Cost-optimized, lower resources |
| T | Test | Staging, prod-like configuration |
| P | Production | HA, auto-scaling, full observability |

## Tagging Standards

All resources must include these tags:

```hcl
tags = {
  Project     = "srvthreds"
  Environment = "dev|test|prod"
  ManagedBy   = "Terraform"
  CostCenter  = "engineering|production"
  Owner       = "Platform Team"
}
```

## Implementation in Terraform

All modules use local variables to construct names:

```hcl
locals {
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))  # D/T/P
  region   = "E"

  # Build name according to pattern
  resource_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-{SUFFIX}"
}
```

## Compliance Notes

- All naming follows **Army NETCOM naming conventions**
- Resource names are designed for both commercial and government cloud
- Names remain unchanged during migration to Azure Government Cloud
- Only Private DNS zone names change between commercial and government
- Virtual machine naming must strictly follow 15-character RFC 1035 standard

## References

- [Army Naming Conventions](cARMY_NAMING_CONVENTIONS.md)
- [Azure Naming Rules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules)
- [NETCOM Naming Convention Policy](https://army.mil/netcom) (internal)

---

**Last Updated**: 2025-01-06
**Maintained By**: Initiative Labs Platform Team
