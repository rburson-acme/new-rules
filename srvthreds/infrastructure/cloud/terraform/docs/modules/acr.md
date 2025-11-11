# Azure Container Registry (ACR) Module

Terraform module for creating a secure Azure Container Registry with private endpoint support, managed identity authentication, and advanced security features.

## Overview

This module creates an Azure Container Registry (ACR) following security best practices:

- **No admin credentials** - Uses managed identity authentication only
- **Private endpoint support** - Network isolation via private link
- **Content trust** - Image signing and verification (Premium)
- **Retention policies** - Automatic cleanup of untagged images (Premium)
- **Zone redundancy** - Multi-zone replication (Premium)
- **Encryption at rest** - Customer-managed keys supported (Premium)
- **Network restrictions** - IP allowlisting and firewall rules (Premium)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Private Endpoint Subnet (10.0.1.0/24)              │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │        Private Endpoint                           │  │ │
│  │  │        (privatelink.azurecr.io)                   │  │ │
│  │  │                                                    │  │ │
│  │  │  Private IP: 10.0.1.4                             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                    ↓                                    │ │
│  │            Private DNS Zone                             │ │
│  │    cazsrvthredsdeacr.privatelink.azurecr.io            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                         ↓
              ┌──────────────────────┐
              │  Azure Container     │
              │  Registry (ACR)      │
              │                      │
              │  • Premium SKU       │
              │  • Zone Redundant    │
              │  • Geo-Replication   │
              │  • Content Trust     │
              │  • Retention Policy  │
              └──────────────────────┘
                         ↑
              ┌──────────────────────┐
              │  AKS Cluster         │
              │  Kubelet Identity    │
              │  (AcrPull role)      │
              └──────────────────────┘
```

## Usage

### Basic Development Registry

```hcl
module "acr" {
  source = "../../modules/azure/acr"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"

  # Basic SKU for development
  sku = "Basic"

  # Allow public access for development
  public_network_access_enabled = true
  enable_private_endpoint       = false

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Production Registry with Private Endpoint

```hcl
module "acr" {
  source = "../../modules/azure/acr"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  # Premium SKU for production features
  sku = "Premium"

  # Private endpoint configuration
  enable_private_endpoint      = true
  public_network_access_enabled = false
  private_endpoint_subnet_id   = module.networking.subnet_ids["private_endpoints"]
  vnet_id                      = module.networking.vnet_id

  # Security features (Premium only)
  zone_redundancy_enabled = true
  trust_policy_enabled    = true
  retention_days          = 30

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

### Geo-Replicated Registry

```hcl
module "acr" {
  source = "../../modules/azure/acr"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  sku                     = "Premium"
  zone_redundancy_enabled = true

  # Private endpoint in primary region
  enable_private_endpoint     = true
  private_endpoint_subnet_id  = module.networking_east.subnet_ids["private_endpoints"]
  vnet_id                     = module.networking_east.vnet_id

  tags = {
    Project = "SrvThreds"
  }
}

# Add geo-replication to secondary region
resource "azurerm_container_registry_replication" "west" {
  name                = "westus2"
  container_registry_name = module.acr.acr_name
  resource_group_name     = "srvthreds-prod-rg"
  location                = "westus2"
  zone_redundancy_enabled = true

  tags = {
    Project = "SrvThreds"
  }
}
```

### With AKS Integration

```hcl
module "acr" {
  source = "../../modules/azure/acr"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  sku                           = "Premium"
  enable_private_endpoint       = true
  public_network_access_enabled = false
  private_endpoint_subnet_id    = module.networking.subnet_ids["private_endpoints"]
  vnet_id                       = module.networking.vnet_id

  tags = { Project = "SrvThreds" }
}

module "aks" {
  source = "../../modules/azure/aks"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  aks_subnet_id       = module.networking.subnet_ids["aks"]

  # ACR integration (grants AcrPull to kubelet identity)
  acr_id = module.acr.acr_id

  # ... other AKS configuration ...
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region for resources | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `sku` | SKU for ACR (Basic, Standard, Premium) | `string` | `"Standard"` | no |
| `public_network_access_enabled` | Enable public network access (disable for private endpoint only) | `bool` | `false` | no |
| `zone_redundancy_enabled` | Enable zone redundancy (Premium SKU only) | `bool` | `false` | no |
| `encryption_enabled` | Enable encryption (Premium SKU only) | `bool` | `false` | no |
| `retention_days` | Number of days to retain untagged manifests (0 to disable, Premium SKU only) | `number` | `7` | no |
| `trust_policy_enabled` | Enable content trust policy (Premium SKU only) | `bool` | `false` | no |
| `enable_private_endpoint` | Create a private endpoint for ACR | `bool` | `true` | no |
| `private_endpoint_subnet_id` | Subnet ID for private endpoint | `string` | `""` | no |
| `vnet_id` | Virtual network ID for private DNS zone | `string` | `""` | no |
| `tags` | Additional tags for resources | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| `acr_id` | ID of the container registry |
| `acr_name` | Name of the container registry |
| `acr_login_server` | Login server URL for the container registry |
| `private_endpoint_id` | ID of the private endpoint |
| `private_ip_addresses` | Private IP addresses of the endpoint |
| `private_dns_zone_id` | ID of the private DNS zone |

## Security

### Managed Identity Authentication

ACR admin credentials are disabled. Use managed identities instead:

```bash
# AKS kubelet identity automatically gets AcrPull role
# For other services, assign roles explicitly:
az role assignment create \
  --role AcrPull \
  --assignee {managed-identity-object-id} \
  --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/{acr}
```

### Private Endpoint Access

With private endpoint enabled, ACR is accessible only from VNet:

```hcl
enable_private_endpoint        = true
public_network_access_enabled  = false
private_endpoint_subnet_id     = module.networking.subnet_ids["private_endpoints"]
vnet_id                        = module.networking.vnet_id
```

Test private access:

```bash
# From within VNet (jump box or AKS pod)
nslookup cazsrvthredspeacr.azurecr.io
# Should resolve to private IP (10.0.1.x)

# Login using managed identity
az acr login --name cazsrvthredspeacr
```

### Content Trust

Enable Docker Content Trust for image signing (Premium only):

```hcl
trust_policy_enabled = true
```

Sign and verify images:

```bash
# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Tag and push (automatically signs)
docker tag myapp:latest cazsrvthredspeacr.azurecr.io/myapp:v1.0.0
docker push cazsrvthredspeacr.azurecr.io/myapp:v1.0.0

# Pull only signed images
docker pull cazsrvthredspeacr.azurecr.io/myapp:v1.0.0
```

### Retention Policies

Automatically cleanup untagged manifests (Premium only):

```hcl
retention_days = 30  # Delete untagged images after 30 days
```

View retention policy:

```bash
az acr config retention show --registry cazsrvthredspeacr
```

### Network Security

Restrict access by IP (Premium only):

```bash
# Add firewall rule
az acr network-rule add \
  --name cazsrvthredspeacr \
  --ip-address 203.0.113.0/24

# Default deny
az acr update \
  --name cazsrvthredspeacr \
  --default-action Deny
```

## Image Management

### Push Images

```bash
# Login to ACR
az acr login --name cazsrvthredspeacr

# Build and push
docker build -t myapp:latest .
docker tag myapp:latest cazsrvthredspeacr.azurecr.io/myapp:v1.0.0
docker push cazsrvthredspeacr.azurecr.io/myapp:v1.0.0
```

### ACR Tasks (Build in Cloud)

```bash
# Build image in ACR (no local Docker required)
az acr build \
  --registry cazsrvthredspeacr \
  --image myapp:v1.0.0 \
  --file Dockerfile \
  .
```

### List Images

```bash
# List repositories
az acr repository list --name cazsrvthredspeacr

# List tags
az acr repository show-tags --name cazsrvthredspeacr --repository myapp

# Show manifest
az acr repository show --name cazsrvthredspeacr --image myapp:v1.0.0
```

### Scan Images for Vulnerabilities

```bash
# Enable Defender for Containers (scans on push)
az security pricing create \
  --name ContainerRegistry \
  --tier Standard

# View scan results
az acr repository show --name cazsrvthredspeacr --image myapp:v1.0.0 \
  --query "{vulnerabilities: additionalAttributes.vulnerabilities}"
```

## SKU Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| **Storage** | 10 GB | 100 GB | 500 GB |
| **Throughput** | Low | Medium | High |
| **Private Endpoint** | ❌ | ❌ | ✅ |
| **Zone Redundancy** | ❌ | ❌ | ✅ |
| **Geo-Replication** | ❌ | ❌ | ✅ |
| **Content Trust** | ❌ | ❌ | ✅ |
| **Retention Policy** | ❌ | ❌ | ✅ |
| **Network Rules** | ❌ | ❌ | ✅ |
| **CMK Encryption** | ❌ | ❌ | ✅ |
| **Use Case** | Dev/Test | Standard Workloads | Production |

## Monitoring

### Metrics to Monitor

```bash
# Push/pull operations
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/cazsrvthredspeacr \
  --metric TotalPullCount,TotalPushCount

# Storage usage
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerRegistry/registries/cazsrvthredspeacr \
  --metric StorageUsed
```

### Diagnostic Logs

Enable diagnostic logging to Log Analytics:

```hcl
resource "azurerm_monitor_diagnostic_setting" "acr" {
  name                       = "acr-diagnostics"
  target_resource_id         = module.acr.acr_id
  log_analytics_workspace_id = module.monitoring.workspace_id

  enabled_log {
    category = "ContainerRegistryRepositoryEvents"
  }

  enabled_log {
    category = "ContainerRegistryLoginEvents"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Troubleshooting

### Cannot Pull Images from AKS

**Check kubelet identity role assignment**:

```bash
# Get kubelet identity
KUBELET_ID=$(az aks show --name CAZ-SRVTHREDS-P-E-AKS --resource-group srvthreds-prod-rg \
  --query identityProfile.kubeletidentity.objectId -o tsv)

# Check AcrPull role
az role assignment list --assignee $KUBELET_ID --scope {acr-id}

# Assign if missing
az role assignment create --role AcrPull --assignee $KUBELET_ID --scope {acr-id}
```

**Test from pod**:

```bash
kubectl run test --image=cazsrvthredspeacr.azurecr.io/myapp:v1.0.0 --rm -it --restart=Never -- sh
```

### Cannot Access Private ACR

**Check DNS resolution**:

```bash
# From within VNet
nslookup cazsrvthredspeacr.azurecr.io
# Should return private IP (10.0.1.x)

# If returns public IP, check private DNS zone link
az network private-dns link vnet list \
  --resource-group srvthreds-prod-rg \
  --zone-name privatelink.azurecr.io
```

**Check network connectivity**:

```bash
# Test from jump box
nc -zv 10.0.1.4 443
```

### Retention Policy Not Working

**Verify SKU**:

```bash
# Retention requires Premium SKU
az acr show --name cazsrvthredspeacr --query sku.name
```

**Check policy configuration**:

```bash
az acr config retention show --registry cazsrvthredspeacr
```

### Image Push Fails

**Check storage quota**:

```bash
# View storage usage
az acr show-usage --name cazsrvthredspeacr

# Upgrade SKU if needed
az acr update --name cazsrvthredspeacr --sku Premium
```

### Authentication Errors

**Login issues**:

```bash
# Ensure logged in with correct identity
az account show

# Clear credentials
docker logout cazsrvthredspeacr.azurecr.io

# Re-login
az acr login --name cazsrvthredspeacr
```

## Cost Optimization

### Development Environment

```hcl
sku                            = "Basic"
public_network_access_enabled  = true
enable_private_endpoint        = false
retention_days                 = 7
```

Estimated cost: ~$5/month

### Production Environment

```hcl
sku                     = "Premium"
zone_redundancy_enabled = true
retention_days          = 30
```

Estimated cost: ~$500/month (includes 500GB storage)

### Cost Reduction Tips

1. **Use retention policies** to automatically delete unused images
2. **Compress images** using multi-stage builds
3. **Share registries** across environments (use repositories for isolation)
4. **Monitor storage** and clean up regularly

## Best Practices

1. **Never enable admin credentials** - Use managed identities
2. **Use Premium SKU for production** - Security and reliability features
3. **Enable private endpoints** - Network isolation
4. **Implement retention policies** - Automatic cleanup
5. **Enable content trust** - Verify image signatures
6. **Tag images with versions** - Never use `latest` in production
7. **Scan images for vulnerabilities** - Use Defender for Containers
8. **Monitor pull/push metrics** - Detect anomalies
9. **Use geo-replication** - Reduce latency for global deployments
10. **Implement CI/CD integration** - Automate image builds

## References

- [ACR Best Practices](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-best-practices)
- [ACR Authentication with Managed Identity](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity)
- [ACR Private Link](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link)
- [Content Trust in ACR](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust)
- [ACR Geo-Replication](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication)
- [ACR Retention Policy](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy)
- [ACR Tasks](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview)
- [Defender for Containers](https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-introduction)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
