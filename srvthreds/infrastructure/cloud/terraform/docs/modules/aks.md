# Azure Kubernetes Service (AKS) Module

Terraform module for creating a secure, production-ready Azure Kubernetes Service cluster with private networking, managed identities, and Azure AD integration.

## Overview

This module creates an AKS cluster following security best practices:

- **Private cluster** by default (API server not exposed to internet)
- **System-assigned managed identity** (no service principals)
- **Azure AD RBAC integration** for Kubernetes authorization
- **Azure CNI networking** with network policies
- **ACR integration** via kubelet identity
- **Key Vault secrets provider** for secret management
- **Azure Monitor integration** for logging and metrics
- **Auto-scaling node pools** with availability zone support
- **Automated maintenance windows** and upgrade channels

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              AKS Subnet (10.0.2.0/24)                   │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        AKS Private Cluster                        │  │ │
│  │  │  ┌──────────────┐  ┌──────────────┐              │  │ │
│  │  │  │ Default Pool │  │ Worker Pool  │              │  │ │
│  │  │  │  (System)    │  │  (User)      │              │  │ │
│  │  │  │              │  │              │              │  │ │
│  │  │  │ • 2-5 nodes  │  │ • Auto-scale │              │  │ │
│  │  │  │ • Zone 1,2,3 │  │ • GPU/CPU    │              │  │ │
│  │  │  └──────────────┘  └──────────────┘              │  │ │
│  │  │                                                    │  │ │
│  │  │  System-Assigned Managed Identity                 │  │ │
│  │  │  ↓                                                 │  │ │
│  │  │  • AcrPull on Container Registry                  │  │ │
│  │  │  • Key Vault Secrets User                         │  │ │
│  │  │  • Network Contributor (subnet)                   │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Private DNS Zone: privatelink.eastus.azmk8s.io             │
│  Private Endpoint: API Server                               │
└─────────────────────────────────────────────────────────────┘

External Integrations:
  ├─ Azure Container Registry (ACR)
  ├─ Azure Key Vault (Secrets Provider)
  ├─ Log Analytics Workspace (Monitoring)
  └─ Azure AD (RBAC)
```

## Usage

### Basic Development Cluster

```hcl
module "aks" {
  source = "../../modules/azure/aks"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Networking
  aks_subnet_id   = module.networking.subnet_ids["aks"]
  dns_service_ip  = "10.0.0.10"
  service_cidr    = "10.0.0.0/16"

  # Basic configuration
  kubernetes_version  = "1.28"
  sku_tier            = "Free"

  # Default node pool
  default_node_pool_vm_size     = "Standard_D2s_v3"
  default_node_pool_node_count  = 2

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Production Cluster with Auto-Scaling

```hcl
module "aks" {
  source = "../../modules/azure/aks"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Networking
  aks_subnet_id       = module.networking.subnet_ids["aks"]
  dns_service_ip      = "10.1.0.10"
  service_cidr        = "10.1.0.0/16"
  network_plugin      = "azure"
  network_policy      = "azure"

  # Private cluster
  private_cluster_enabled = true
  private_dns_zone_id     = azurerm_private_dns_zone.aks.id

  # Production SKU
  kubernetes_version = "1.28"
  sku_tier           = "Standard"

  # Default node pool (system workloads)
  default_node_pool_vm_size            = "Standard_D4s_v3"
  default_node_pool_node_count         = 3
  default_node_pool_enable_auto_scaling = true
  default_node_pool_min_count          = 3
  default_node_pool_max_count          = 10
  default_node_pool_zones              = ["1", "2", "3"]
  default_node_pool_max_pods           = 50
  default_node_pool_os_disk_size_gb    = 256
  default_node_pool_os_disk_type       = "Ephemeral"

  # Additional node pools (user workloads)
  additional_node_pools = [
    {
      name                = "workers"
      vm_size             = "Standard_D8s_v3"
      node_count          = 3
      enable_auto_scaling = true
      min_count           = 3
      max_count           = 20
      max_pods            = 50
      os_disk_size_gb     = 256
      os_disk_type        = "Ephemeral"
      os_type             = "Linux"
      zones               = ["1", "2", "3"]
      node_labels = {
        workload = "general"
      }
      node_taints = []
    },
    {
      name                = "gpu"
      vm_size             = "Standard_NC6s_v3"
      node_count          = 0
      enable_auto_scaling = true
      min_count           = 0
      max_count           = 5
      max_pods            = 30
      os_disk_size_gb     = 512
      os_disk_type        = "Managed"
      os_type             = "Linux"
      zones               = ["1", "2", "3"]
      node_labels = {
        workload = "gpu"
      }
      node_taints = ["gpu=true:NoSchedule"]
    }
  ]

  # Azure AD RBAC
  enable_azure_ad_rbac    = true
  enable_azure_rbac       = true
  admin_group_object_ids  = [
    "12345678-1234-1234-1234-123456789012"  # Platform Admins group
  ]

  # ACR Integration
  acr_id = module.acr.id

  # Key Vault integration
  enable_key_vault_secrets_provider      = true
  key_vault_secrets_rotation_enabled     = true
  key_vault_secrets_rotation_interval    = "2m"

  # Monitoring
  enable_oms_agent            = true
  log_analytics_workspace_id  = module.monitoring.workspace_id

  # Security
  enable_azure_policy = true

  # Maintenance
  automatic_channel_upgrade = "stable"
  maintenance_window = {
    allowed = [
      {
        day   = "Sunday"
        hours = [2, 3, 4, 5]
      }
    ]
  }

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

### Multi-Region High Availability

```hcl
# Primary region cluster
module "aks_east" {
  source = "../../modules/azure/aks"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-east-rg"

  # Configuration...
}

# Secondary region cluster
module "aks_west" {
  source = "../../modules/azure/aks"

  environment         = "prod"
  location            = "westus2"
  resource_group_name = "srvthreds-prod-west-rg"

  # Mirror primary region configuration...
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `aks_subnet_id` | Subnet ID for AKS nodes | `string` | n/a | yes |
| `kubernetes_version` | Kubernetes version | `string` | `"1.28"` | no |
| `sku_tier` | SKU tier (Free or Standard) | `string` | `"Free"` | no |
| `private_cluster_enabled` | Enable private cluster | `bool` | `true` | no |
| `private_dns_zone_id` | Private DNS zone ID for private cluster | `string` | `""` | no |
| `default_node_pool_node_count` | Number of nodes in default pool | `number` | `2` | no |
| `default_node_pool_vm_size` | VM size for default node pool | `string` | `"Standard_D2s_v3"` | no |
| `default_node_pool_enable_auto_scaling` | Enable auto-scaling for default node pool | `bool` | `false` | no |
| `default_node_pool_min_count` | Minimum node count for auto-scaling | `number` | `1` | no |
| `default_node_pool_max_count` | Maximum node count for auto-scaling | `number` | `5` | no |
| `default_node_pool_max_pods` | Maximum pods per node | `number` | `30` | no |
| `default_node_pool_os_disk_size_gb` | OS disk size in GB | `number` | `128` | no |
| `default_node_pool_os_disk_type` | OS disk type (Managed, Ephemeral) | `string` | `"Managed"` | no |
| `default_node_pool_zones` | Availability zones for default node pool | `list(string)` | `null` | no |
| `network_plugin` | Network plugin (azure or kubenet) | `string` | `"azure"` | no |
| `network_policy` | Network policy (azure, calico, or null) | `string` | `"azure"` | no |
| `dns_service_ip` | DNS service IP address | `string` | `"10.0.0.10"` | no |
| `service_cidr` | Service CIDR | `string` | `"10.0.0.0/16"` | no |
| `outbound_type` | Outbound type (loadBalancer or userDefinedRouting) | `string` | `"loadBalancer"` | no |
| `enable_azure_ad_rbac` | Enable Azure AD RBAC | `bool` | `true` | no |
| `enable_azure_rbac` | Enable Azure RBAC for Kubernetes authorization | `bool` | `true` | no |
| `admin_group_object_ids` | Azure AD admin group object IDs | `list(string)` | `[]` | no |
| `acr_id` | Azure Container Registry ID for AcrPull role assignment | `string` | `""` | no |
| `enable_key_vault_secrets_provider` | Enable Key Vault secrets provider | `bool` | `true` | no |
| `key_vault_secrets_rotation_enabled` | Enable secret rotation | `bool` | `true` | no |
| `key_vault_secrets_rotation_interval` | Secret rotation interval | `string` | `"2m"` | no |
| `enable_oms_agent` | Enable OMS agent (Azure Monitor) | `bool` | `false` | no |
| `log_analytics_workspace_id` | Log Analytics workspace ID | `string` | `""` | no |
| `enable_http_application_routing` | Enable HTTP application routing | `bool` | `false` | no |
| `enable_azure_policy` | Enable Azure Policy | `bool` | `false` | no |
| `automatic_channel_upgrade` | Auto-upgrade channel (none, patch, stable, rapid, node-image) | `string` | `"none"` | no |
| `maintenance_window` | Maintenance window configuration | `object` | `null` | no |
| `additional_node_pools` | Additional node pools configuration | `list(object)` | `[]` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `aks_id` | The ID of the AKS cluster |
| `aks_name` | The name of the AKS cluster |
| `aks_fqdn` | The FQDN of the AKS cluster |
| `aks_private_fqdn` | The private FQDN of the AKS cluster |
| `kube_config` | Kubernetes configuration (sensitive) |
| `kube_config_admin` | Admin Kubernetes configuration (sensitive) |
| `kubelet_identity_object_id` | Object ID of the kubelet managed identity |
| `kubelet_identity_client_id` | Client ID of the kubelet managed identity |
| `node_resource_group` | The resource group containing AKS nodes |
| `oidc_issuer_url` | The OIDC issuer URL |
| `key_vault_secrets_provider_identity` | Key Vault secrets provider identity details |

## Security

### Private Cluster

Private clusters prevent public access to the Kubernetes API server:

```hcl
private_cluster_enabled = true
private_dns_zone_id     = azurerm_private_dns_zone.aks.id
```

Access options:
1. **Azure Bastion** or **Jump Box** in the same VNet
2. **VPN Gateway** for remote access
3. **ExpressRoute** for on-premises connectivity
4. **Azure CLI with run-command** for emergency access

### Managed Identity

The cluster uses system-assigned managed identity (no secrets to rotate):

```bash
# View cluster identity
az aks show --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg \
  --query identity

# View kubelet identity (for ACR pull)
az aks show --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg \
  --query identityProfile.kubeletidentity
```

### Azure AD RBAC

Integrate with Azure AD for Kubernetes authorization:

```hcl
enable_azure_ad_rbac   = true
enable_azure_rbac      = true
admin_group_object_ids = ["group-id-here"]
```

Grant cluster access:

```bash
# Assign Azure Kubernetes Service RBAC Cluster Admin
az role assignment create \
  --role "Azure Kubernetes Service RBAC Cluster Admin" \
  --assignee user@domain.com \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerService/managedClusters/{cluster}
```

### Network Policies

Enable network policies to control pod-to-pod communication:

```hcl
network_plugin = "azure"
network_policy = "azure"  # or "calico"
```

Example network policy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

### Azure Policy

Enable Azure Policy for compliance enforcement:

```hcl
enable_azure_policy = true
```

Recommended policies:
- Enforce HTTPS ingress
- Require resource limits
- Block privileged containers
- Enforce read-only root filesystem

## Node Pool Management

### Default Node Pool (System)

Dedicated to system workloads (kube-system, monitoring):

```hcl
default_node_pool_vm_size   = "Standard_D4s_v3"
default_node_pool_max_pods  = 50
default_node_pool_zones     = ["1", "2", "3"]
```

### Additional Node Pools (User)

For application workloads:

```hcl
additional_node_pools = [
  {
    name       = "workers"
    vm_size    = "Standard_D8s_v3"
    min_count  = 3
    max_count  = 20
    node_labels = { workload = "general" }
    node_taints = []
  }
]
```

### GPU Node Pools

For ML/AI workloads:

```hcl
additional_node_pools = [
  {
    name       = "gpu"
    vm_size    = "Standard_NC6s_v3"  # NVIDIA Tesla V100
    min_count  = 0
    max_count  = 5
    node_labels = { workload = "gpu" }
    node_taints = ["gpu=true:NoSchedule"]
  }
]
```

## Monitoring

### Azure Monitor Integration

```hcl
enable_oms_agent            = true
log_analytics_workspace_id  = module.monitoring.workspace_id
```

View logs:

```bash
# Container logs
az monitor log-analytics query \
  --workspace {workspace-id} \
  --analytics-query "ContainerLog | where TimeGenerated > ago(1h)"

# Kubernetes events
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

### Metrics

Key metrics to monitor:
- Node CPU/memory utilization
- Pod count vs capacity
- Disk I/O and latency
- Network throughput
- API server response times

## Maintenance

### Upgrade Strategy

1. **Automatic upgrades** (production):
```hcl
automatic_channel_upgrade = "stable"
```

2. **Manual upgrades** (development):
```hcl
automatic_channel_upgrade = "none"
```

3. **Maintenance windows**:
```hcl
maintenance_window = {
  allowed = [{
    day   = "Sunday"
    hours = [2, 3, 4, 5]
  }]
}
```

### Upgrade Process

```bash
# Check available versions
az aks get-upgrades --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg

# Upgrade cluster
az aks upgrade --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg \
  --kubernetes-version 1.28.5
```

## Troubleshooting

### Cannot Connect to Cluster

**Private cluster access**:

```bash
# Option 1: Use az aks command invoke
az aks command invoke --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg \
  --command "kubectl get nodes"

# Option 2: Connect from jump box in same VNet
az aks get-credentials --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg
kubectl get nodes
```

### Pods Cannot Pull Images

**Check ACR integration**:

```bash
# Verify kubelet identity has AcrPull role
az role assignment list --assignee {kubelet-identity-object-id} --scope {acr-id}

# Manually assign if missing
az role assignment create \
  --role AcrPull \
  --assignee {kubelet-identity-object-id} \
  --scope {acr-id}
```

### Node Pool Scaling Issues

**Check auto-scaler logs**:

```bash
kubectl logs -n kube-system -l app=cluster-autoscaler
```

**Check quota limits**:

```bash
az vm list-usage --location eastus --query "[?name.value=='standardDSv3Family']"
```

### Key Vault Secrets Not Mounting

**Verify secrets provider identity**:

```bash
# Check identity permissions
az role assignment list \
  --assignee {kv-secrets-provider-identity} \
  --scope {key-vault-id}

# Test secret access
kubectl exec -it {pod} -- ls /mnt/secrets-store/
```

### High API Server Latency

**Check API server metrics**:

```bash
kubectl top nodes
kubectl get --raw /metrics | grep apiserver_request_duration
```

**Scale control plane** (upgrade to Standard SKU if on Free tier):

```hcl
sku_tier = "Standard"
```

## Cost Optimization

### Development Environment

```hcl
sku_tier                       = "Free"
default_node_pool_vm_size      = "Standard_B2s"
default_node_pool_node_count   = 1
enable_oms_agent               = false
automatic_channel_upgrade      = "node-image"  # Security patches only
```

### Production Environment

```hcl
sku_tier                       = "Standard"  # 99.95% SLA
default_node_pool_zones        = ["1", "2", "3"]  # Multi-AZ
default_node_pool_os_disk_type = "Ephemeral"  # Cheaper than Managed
enable_auto_scaling            = true  # Scale to zero when idle
```

### Reserved Instances

Save up to 72% with 3-year reservations for base capacity.

## References

- [AKS Best Practices](https://learn.microsoft.com/en-us/azure/aks/best-practices)
- [AKS Security Baseline](https://learn.microsoft.com/en-us/security/benchmark/azure/baselines/aks-security-baseline)
- [AKS Private Clusters](https://learn.microsoft.com/en-us/azure/aks/private-clusters)
- [Azure CNI Networking](https://learn.microsoft.com/en-us/azure/aks/configure-azure-cni)
- [Managed Identity with AKS](https://learn.microsoft.com/en-us/azure/aks/use-managed-identity)
- [Azure AD RBAC for AKS](https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac)
- [Key Vault Provider for Secrets Store CSI Driver](https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver)
- [Azure Monitor for Containers](https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-overview)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
