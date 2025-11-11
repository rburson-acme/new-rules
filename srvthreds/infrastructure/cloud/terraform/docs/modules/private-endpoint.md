# Azure Private Endpoint Module

Reusable Terraform module for creating Azure Private Endpoints with automatic private DNS zone configuration.

## Overview

This module provides a standardized way to create private endpoints for Azure PaaS services:

- **Private Endpoint** - Network interface with private IP
- **Private DNS Zone** - Automatic DNS resolution configuration
- **VNet DNS Link** - Connects private DNS zone to virtual network
- **Automatic IP assignment** - From subnet IP range
- **Multiple resource support** - Works with ACR, Key Vault, Storage, Cosmos DB, etc.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      Virtual Network                      │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │     Private Endpoint Subnet (10.0.1.0/24)          │  │
│  │                                                     │  │
│  │  ┌──────────────────────────────────────────────┐  │  │
│  │  │    Private Endpoint                           │  │  │
│  │  │    ({resource-name}-pe)                       │  │  │
│  │  │                                               │  │  │
│  │  │    Private IP: 10.0.1.4                       │  │  │
│  │  │    Network Interface ID: {nic-id}             │  │  │
│  │  └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │    Private DNS Zone                                 │  │
│  │    (privatelink.{service}.azure.net)                │  │
│  │                                                     │  │
│  │    A Record:                                        │  │
│  │    {resource-name} → 10.0.1.4                       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                          ↓
               ┌─────────────────────┐
               │  Azure PaaS Service  │
               │  (ACR, Key Vault,    │
               │   Storage, etc.)     │
               └─────────────────────┘
```

## Usage

### ACR Private Endpoint

```hcl
module "acr_private_endpoint" {
  source = "../../modules/azure/private-endpoint"

  location                       = "eastus"
  resource_group_name            = "srvthreds-prod-rg"
  private_endpoint_name          = "cazsrvthredspeacr"  # Will become cazsrvthredspeacr-pe
  subnet_id                      = module.networking.subnet_ids["private_endpoints"]
  private_connection_resource_id = azurerm_container_registry.main.id
  subresource_names              = ["registry"]
  private_dns_zone_name          = "privatelink.azurecr.io"
  vnet_id                        = module.networking.vnet_id

  tags = {
    Project = "SrvThreds"
  }
}
```

### Key Vault Private Endpoint

```hcl
module "keyvault_private_endpoint" {
  source = "../../modules/azure/private-endpoint"

  location                       = "eastus"
  resource_group_name            = "srvthreds-prod-rg"
  private_endpoint_name          = module.keyvault.key_vault_name
  subnet_id                      = module.networking.subnet_ids["private_endpoints"]
  private_connection_resource_id = module.keyvault.key_vault_id
  subresource_names              = ["vault"]
  private_dns_zone_name          = "privatelink.vaultcore.azure.net"
  vnet_id                        = module.networking.vnet_id

  tags = {
    Project = "SrvThreds"
  }
}
```

### Storage Account Private Endpoint

```hcl
module "storage_private_endpoint" {
  source = "../../modules/azure/private-endpoint"

  location                       = "eastus"
  resource_group_name            = "srvthreds-prod-rg"
  private_endpoint_name          = azurerm_storage_account.main.name
  subnet_id                      = module.networking.subnet_ids["private_endpoints"]
  private_connection_resource_id = azurerm_storage_account.main.id
  subresource_names              = ["blob"]  # or ["file"], ["table"], ["queue"]
  private_dns_zone_name          = "privatelink.blob.core.windows.net"
  vnet_id                        = module.networking.vnet_id

  tags = {
    Project = "SrvThreds"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `location` | Azure region for the private endpoint | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `private_endpoint_name` | Name of the private endpoint (will be suffixed with -pe) | `string` | n/a | yes |
| `subnet_id` | ID of the subnet where private endpoint will be created | `string` | n/a | yes |
| `private_connection_resource_id` | ID of the resource to create private endpoint for | `string` | n/a | yes |
| `subresource_names` | List of subresource names (groupIds) for the private endpoint | `list(string)` | n/a | yes |
| `private_dns_zone_name` | Name of the private DNS zone | `string` | n/a | yes |
| `vnet_id` | ID of the VNet to link to private DNS zone | `string` | n/a | yes |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `private_endpoint_id` | ID of the private endpoint |
| `private_endpoint_name` | Name of the private endpoint |
| `private_dns_zone_id` | ID of the private DNS zone |
| `private_dns_zone_name` | Name of the private DNS zone |
| `private_ip_addresses` | Private IP addresses of the private endpoint |

## Supported Azure Services

### Subresource Names by Service

| Azure Service | Subresource Name(s) | Private DNS Zone |
|---------------|---------------------|------------------|
| **Container Registry (ACR)** | `registry` | `privatelink.azurecr.io` |
| **Key Vault** | `vault` | `privatelink.vaultcore.azure.net` |
| **Storage Account (Blob)** | `blob` | `privatelink.blob.core.windows.net` |
| **Storage Account (File)** | `file` | `privatelink.file.core.windows.net` |
| **Storage Account (Table)** | `table` | `privatelink.table.core.windows.net` |
| **Storage Account (Queue)** | `queue` | `privatelink.queue.core.windows.net` |
| **Cosmos DB (SQL)** | `Sql` | `privatelink.documents.azure.com` |
| **Cosmos DB (MongoDB)** | `MongoDB` | `privatelink.mongo.cosmos.azure.com` |
| **Azure Cache for Redis** | `redisCache` | `privatelink.redis.cache.windows.net` |
| **Azure SQL Database** | `sqlServer` | `privatelink.database.windows.net` |
| **Service Bus** | `namespace` | `privatelink.servicebus.windows.net` |
| **Event Hub** | `namespace` | `privatelink.servicebus.windows.net` |
| **Azure App Service** | `sites` | `privatelink.azurewebsites.net` |

## Testing Private Endpoint

### Verify DNS Resolution

```bash
# From within VNet (jump box or AKS pod)
nslookup cazsrvthredspeacr.azurecr.io
# Should return private IP (10.0.1.x)

# From outside VNet
nslookup cazsrvthredspeacr.azurecr.io
# Should return public IP or fail if public access disabled
```

### Test Connectivity

```bash
# From within VNet
nc -zv 10.0.1.4 443

# Test HTTP/HTTPS
curl -I https://cazsrvthredspeacr.azurecr.io
```

### View Private Endpoint Details

```bash
# List private endpoints
az network private-endpoint list \
  --resource-group srvthreds-prod-rg \
  --output table

# Show specific endpoint
az network private-endpoint show \
  --name cazsrvthredspeacr-pe \
  --resource-group srvthreds-prod-rg

# Show private IP
az network private-endpoint show \
  --name cazsrvthredspeacr-pe \
  --resource-group srvthreds-prod-rg \
  --query 'customDnsConfigs[0].ipAddresses[0]' -o tsv
```

## Troubleshooting

### DNS Not Resolving to Private IP

**Check private DNS zone link**:

```bash
az network private-dns link vnet list \
  --resource-group srvthreds-prod-rg \
  --zone-name privatelink.azurecr.io
```

**Check DNS zone records**:

```bash
az network private-dns record-set a list \
  --resource-group srvthreds-prod-rg \
  --zone-name privatelink.azurecr.io
```

### Cannot Connect to Private Endpoint

**Check NSG rules on subnet**:

```bash
az network nsg rule list \
  --nsg-name private-endpoints-nsg \
  --resource-group srvthreds-prod-rg \
  --output table
```

**Verify private endpoint provisioning state**:

```bash
az network private-endpoint show \
  --name cazsrvthredspeacr-pe \
  --resource-group srvthreds-prod-rg \
  --query provisioningState
```

## Best Practices

1. **Dedicated subnet** - Use separate subnet for private endpoints
2. **Consistent naming** - Use resource name as endpoint name
3. **NSG configuration** - Allow traffic from application subnets
4. **DNS zone reuse** - Share DNS zones across multiple endpoints of same type
5. **Private link center** - Monitor all private endpoints in Azure Portal
6. **Disable public access** - For production resources
7. **Document IP ranges** - Track private IP allocations

## References

- [Azure Private Link Documentation](https://learn.microsoft.com/en-us/azure/private-link/private-link-overview)
- [Private Endpoint DNS Configuration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns)
- [Private Link Pricing](https://azure.microsoft.com/en-us/pricing/details/private-link/)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
