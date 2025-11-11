# Azure Networking Module

Terraform module for creating Azure networking infrastructure following Army NETCOM naming conventions and security best practices.

## Overview

This module creates a complete Azure networking environment with:
- Virtual Network (VNet) with configurable address space
- Multiple subnets with Network Security Groups (NSGs)
- Private DNS zones for Azure services
- VNet encryption and DDoS protection
- Network flow logs to Log Analytics

## Architecture

```
Azure Virtual Network (10.0.0.0/16)
├── Gateway Subnet (10.0.1.0/24)
│   └── NSG: Allow HTTPS, Deny all else
├── App Integration Subnet (10.0.2.0/24)
│   └── NSG: Allow from Gateway, Allow to Private Endpoints
├── Private Endpoint Subnet (10.0.3.0/24)
│   └── NSG: Allow from App Integration, Deny outbound
└── Database Subnet (10.0.4.0/24)
    └── NSG: Allow from App Integration via PE, Deny all else
```

## Usage

### Basic Example

```hcl
module "networking" {
  source = "../../modules/azure/networking"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  vnet_address_space = "10.0.0.0/16"

  subnets = {
    gateway = {
      address_prefix = "10.0.1.0/24"
      service_endpoints = []
    }
    app_integration = {
      address_prefix = "10.0.2.0/24"
      service_endpoints = ["Microsoft.KeyVault", "Microsoft.Storage"]
    }
    private_endpoint = {
      address_prefix = "10.0.3.0/24"
      service_endpoints = []
    }
    database = {
      address_prefix = "10.0.4.0/24"
      service_endpoints = []
    }
  }

  tags = {
    Project = "SrvThreds"
    CostCenter = "Engineering"
  }
}
```

### Production Example with All Features

```hcl
module "networking" {
  source = "../../modules/azure/networking"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  vnet_address_space = "10.0.0.0/16"
  enable_vnet_encryption = true
  enable_ddos_protection = true

  subnets = {
    gateway = {
      address_prefix = "10.0.1.0/24"
      service_endpoints = []
    }
    app_integration = {
      address_prefix = "10.0.2.0/24"
      service_endpoints = [
        "Microsoft.KeyVault",
        "Microsoft.Storage",
        "Microsoft.ContainerRegistry"
      ]
    }
    private_endpoint = {
      address_prefix = "10.0.3.0/24"
      service_endpoints = []
    }
    database = {
      address_prefix = "10.0.4.0/24"
      service_endpoints = []
    }
  }

  # Private DNS zones for Azure services
  private_dns_zones = [
    "privatelink.azurecr.io",
    "privatelink.vaultcore.azure.net",
    "privatelink.mongo.cosmos.azure.com",
    "privatelink.redis.cache.windows.net"
  ]

  # Network flow logs
  enable_network_watcher = true
  log_analytics_workspace_id = module.monitoring.workspace_id

  tags = {
    Project = "SrvThreds"
    Environment = "Production"
    CostCenter = "Production"
    ManagedBy = "Terraform"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Resource group name | `string` | n/a | yes |
| `vnet_address_space` | VNet address space in CIDR notation | `string` | `"10.0.0.0/16"` | no |
| `subnets` | Map of subnets to create | `map(object)` | n/a | yes |
| `enable_vnet_encryption` | Enable VNet encryption | `bool` | `false` | no |
| `enable_ddos_protection` | Enable DDoS Protection Standard | `bool` | `false` | no |
| `private_dns_zones` | List of private DNS zones to create | `list(string)` | `[]` | no |
| `enable_network_watcher` | Enable Network Watcher and flow logs | `bool` | `true` | no |
| `log_analytics_workspace_id` | Log Analytics workspace for flow logs | `string` | `null` | no |
| `tags` | Tags to apply to all resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `vnet_id` | Virtual Network resource ID |
| `vnet_name` | Virtual Network name |
| `vnet_address_space` | VNet address space |
| `subnet_ids` | Map of subnet names to resource IDs |
| `nsg_ids` | Map of NSG names to resource IDs |
| `private_dns_zone_ids` | Map of private DNS zone names to IDs |
| `network_watcher_id` | Network Watcher resource ID |

## Network Security

### NSG Rules

Each subnet has specific NSG rules following least-privilege principles:

**Gateway Subnet:**
- Inbound: Allow HTTPS (443), Allow HTTP (80) redirecting to HTTPS
- Outbound: Allow to App Integration subnet

**App Integration Subnet:**
- Inbound: Allow from Gateway subnet
- Outbound: Allow to Private Endpoint subnet, Allow to Internet (controlled)

**Private Endpoint Subnet:**
- Inbound: Allow from App Integration subnet
- Outbound: Deny all (private endpoints don't initiate outbound)

**Database Subnet:**
- Inbound: Allow from Private Endpoints only
- Outbound: Deny all

### VNet Encryption

When enabled (`enable_vnet_encryption = true`), encrypts all traffic between VMs in the VNet:
- Uses MACsec encryption
- No performance impact
- Transparent to applications
- Recommended for production environments

### DDoS Protection

When enabled (`enable_ddos_protection = true`):
- Azure DDoS Protection Standard
- ~$3,000/month cost
- Recommended only for production
- Provides advanced mitigation and monitoring

## Private DNS Zones

Private DNS zones enable name resolution for private endpoints:

```hcl
private_dns_zones = [
  "privatelink.azurecr.io",              # Container Registry
  "privatelink.vaultcore.azure.net",     # Key Vault
  "privatelink.mongo.cosmos.azure.com",  # Cosmos DB
  "privatelink.redis.cache.windows.net"  # Redis Cache
]
```

The module automatically:
- Creates the private DNS zones
- Links them to the VNet
- Configures auto-registration where applicable

## Network Flow Logs

When Network Watcher is enabled:
- Flow logs sent to Log Analytics
- 90-day retention
- Traffic analytics enabled
- Used for security monitoring and troubleshooting

## Subnet Design

### Subnet Sizing Guide

| Subnet | Recommended Size | Max Resources | Use Case |
|--------|------------------|---------------|----------|
| Gateway | /24 (251 hosts) | ~200 | Application Gateway, Load Balancers |
| App Integration | /23 (507 hosts) | ~400 | AKS nodes, App Services |
| Private Endpoint | /24 (251 hosts) | ~200 | Private endpoints for PaaS services |
| Database | /25 (123 hosts) | ~100 | Future dedicated database VMs |

### Azure Reserved IPs

Azure reserves 5 IPs in each subnet:
- `.0` - Network address
- `.1` - Default gateway
- `.2` - Azure DNS
- `.3` - Azure DNS
- `.255` - Broadcast address

## Examples

### Dev Environment (Minimal)

```hcl
module "networking" {
  source = "../../modules/azure/networking"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"
  vnet_address_space  = "10.0.0.0/16"

  subnets = {
    default = {
      address_prefix = "10.0.1.0/24"
      service_endpoints = []
    }
  }

  # Minimal features for cost savings
  enable_vnet_encryption = false
  enable_ddos_protection = false
  enable_network_watcher = true
}
```

### Production Environment (Full)

```hcl
module "networking" {
  source = "../../modules/azure/networking"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  vnet_address_space  = "10.0.0.0/16"

  subnets = {
    gateway = { address_prefix = "10.0.1.0/24", service_endpoints = [] }
    app_integration = {
      address_prefix = "10.0.2.0/23",
      service_endpoints = [
        "Microsoft.KeyVault",
        "Microsoft.Storage",
        "Microsoft.ContainerRegistry"
      ]
    }
    private_endpoint = { address_prefix = "10.0.4.0/24", service_endpoints = [] }
    database = { address_prefix = "10.0.5.0/24", service_endpoints = [] }
  }

  # Full security features
  enable_vnet_encryption = true
  enable_ddos_protection = true
  enable_network_watcher = true

  # All private DNS zones
  private_dns_zones = [
    "privatelink.azurecr.io",
    "privatelink.vaultcore.azure.net",
    "privatelink.mongo.cosmos.azure.com",
    "privatelink.redis.cache.windows.net",
    "privatelink.servicebus.windows.net"
  ]

  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
}
```

## Best Practices

1. **Subnet Sizing**: Plan for growth - subnets can't be resized, only replaced
2. **NSG Rules**: Start with deny-all, add only required rules
3. **Service Endpoints**: Only enable where needed to reduce attack surface
4. **Private DNS**: Create zones before private endpoints
5. **Network Watcher**: Always enable for production troubleshooting
6. **VNet Encryption**: Enable for production compliance requirements
7. **DDoS Protection**: Evaluate cost vs. benefit (~$3k/month)

## Troubleshooting

### Subnet Address Conflicts

```bash
# Check existing address spaces
az network vnet list --query "[].{name:name, addressSpace:addressSpace}" -o table

# Verify no overlaps with on-premises networks
```

### NSG Rule Issues

```bash
# List effective NSG rules for a NIC
az network nic show-effective-nsg \
  --name <nic-name> \
  --resource-group <rg-name>

# View NSG flow logs
az network watcher flow-log show \
  --name <flow-log-name> \
  --resource-group NetworkWatcherRG
```

### Private DNS Resolution

```bash
# Test DNS resolution from a VM
nslookup mykeyvault.vault.azure.net

# Should resolve to private IP (10.x.x.x), not public IP
```

## Related Modules

- [AKS Module](../aks/README.md) - Uses `app_integration` subnet
- [Private Endpoint Module](../private-endpoint/README.md) - Uses `private_endpoint` subnet
- [Application Gateway Module](../appgateway/README.md) - Uses `gateway` subnet

## References

- [Azure Virtual Network Documentation](https://docs.microsoft.com/en-us/azure/virtual-network/)
- [Network Security Groups](https://docs.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview)
- [Private DNS Zones](https://docs.microsoft.com/en-us/azure/dns/private-dns-overview)
- [VNet Encryption](https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-encryption-overview)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider:** ~> 3.0
