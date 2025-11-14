# Progressive Security Model - Initiative Labs

## Philosophy: Balance Security with Developer Productivity

This document outlines a **phased security approach** that allows rapid development and iteration while maintaining a clear path to production-grade security hardening.

### Core Principle
> **Start open for velocity, migrate to locked-down for production.**

We acknowledge that Azure's private endpoint implementation has bugs and operational overhead that can significantly slow development. Instead of fighting this during the exploratory phase, we'll design infrastructure with **security toggles** that can be progressively enabled.

---

## Security Tiers

### Tier 0: Local Development (Current State)
**Environment**: Docker Compose on local machines
**Security**: Minimal - focus on functionality
**Status**: ✅ Active

### Tier 1: Cloud Development (Initial Azure Deployment)
**Environment**: Azure Commercial Cloud - Dev/Test
**Timeline**: Now → 3-6 months
**Goal**: **Validate infrastructure patterns, debug cloud-specific issues**

**Security Posture**:
- ✅ **Enabled**: VNets, NSGs, RBAC, Managed Identities, Encryption at rest
- ⚠️  **Relaxed**: Public endpoints allowed (with IP restrictions), simplified networking
- ❌ **Disabled**: Private endpoints, strict firewall rules, VNet injection

**Rationale**:
- Developers can directly access resources for debugging
- No ACR private endpoint bugs blocking container deployments
- Faster iteration on infrastructure code
- Cost-effective (no private endpoint charges)

### Tier 2: Cloud Staging (Production-Like)
**Environment**: Azure Commercial Cloud - Staging
**Timeline**: 3-6 months after Tier 1
**Goal**: **Test production security configuration without customer data**

**Security Posture**:
- ✅ **Enabled**: Everything from Tier 1 + Private endpoints, VNet integration, strict NSG rules
- ⚠️  **Relaxed**: Some management access via Bastion/VPN
- ❌ **Disabled**: Some compliance-only controls

**Rationale**:
- Validate private endpoint configuration works
- Debug networking issues without customer impact
- Stress-test security hardening

### Tier 3: Commercial Production
**Environment**: Azure Commercial Cloud - Production
**Timeline**: 6-12 months
**Goal**: **Live customer workloads with production security**

**Security Posture**:
- ✅ **Enabled**: All security controls from Tier 2 + compliance logging, WAF strict mode
- ⚠️  **Minimal Relaxation**: Break-glass admin access only

### Tier 4: Government Cloud Production
**Environment**: Azure Government Cloud - US Gov Virginia
**Timeline**: 12+ months (driven by compliance requirements)
**Goal**: **FedRAMP/ITAR compliant deployment**

**Security Posture**:
- ✅ **Enabled**: **Everything** - zero exceptions
- ❌ **No public endpoints** - private endpoints mandatory
- ✅ **Full compliance** - FedRAMP High, ITAR, CJIS

---

## Terraform Security Toggle Pattern

### Design Principle
All modules accept a `security_tier` variable that controls feature enablement:

```hcl
variable "security_tier" {
  description = "Security tier: development, staging, production, govcloud"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production", "govcloud"], var.security_tier)
    error_message = "Security tier must be development, staging, production, or govcloud"
  }
}
```

### Example: CosmosDB Module with Security Toggles

```hcl
# modules/azure/cosmosdb/main.tf

locals {
  # Security configuration based on tier
  security_config = {
    development = {
      public_network_access_enabled = true
      enable_private_endpoint       = false
      ip_range_filter              = var.developer_ip_ranges
      enable_automatic_failover    = false
      backup_interval_minutes      = 1440  # Daily
    }
    staging = {
      public_network_access_enabled = false
      enable_private_endpoint       = true
      ip_range_filter              = []
      enable_automatic_failover    = true
      backup_interval_minutes      = 240   # Every 4 hours
    }
    production = {
      public_network_access_enabled = false
      enable_private_endpoint       = true
      ip_range_filter              = []
      enable_automatic_failover    = true
      backup_interval_minutes      = 60    # Hourly
    }
    govcloud = {
      public_network_access_enabled = false  # Enforced by policy
      enable_private_endpoint       = true   # Mandatory
      ip_range_filter              = []
      enable_automatic_failover    = true
      backup_interval_minutes      = 30     # Every 30 minutes
    }
  }

  config = local.security_config[var.security_tier]
}

resource "azurerm_cosmosdb_account" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Security tier drives this
  public_network_access_enabled = local.config.public_network_access_enabled
  ip_range_filter               = join(",", local.config.ip_range_filter)

  enable_automatic_failover = local.config.enable_automatic_failover

  # ... other configuration ...

  backup {
    type                = "Periodic"
    interval_in_minutes = local.config.backup_interval_minutes
    retention_in_hours  = var.security_tier == "govcloud" ? 720 : 168  # 30 days vs 7 days
  }
}

# Conditional private endpoint - only created for staging/production/govcloud
resource "azurerm_private_endpoint" "cosmos" {
  count = local.config.enable_private_endpoint ? 1 : 0

  name                = "${var.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_endpoint_subnet_id

  private_service_connection {
    name                           = "${var.name}-pe-connection"
    private_connection_resource_id = azurerm_cosmosdb_account.this.id
    subresource_names              = ["MongoDB"]
    is_manual_connection           = false
  }

  # Only create DNS zone in staging+ tiers
  dynamic "private_dns_zone_group" {
    for_each = var.private_dns_zone_id != null ? [1] : []
    content {
      name                 = "default"
      private_dns_zone_ids = [var.private_dns_zone_id]
    }
  }
}
```

### Example: AKS Module with Security Toggles

```hcl
# modules/azure/aks/main.tf

locals {
  security_config = {
    development = {
      private_cluster_enabled       = false  # Public API for easy access
      authorized_ip_ranges          = var.developer_ip_ranges
      network_plugin                = "kubenet"  # Simpler, fewer IPs required
      network_policy                = null
      enable_azure_policy           = false
      enable_pod_security_policy    = false
      sku_tier                      = "Free"
    }
    staging = {
      private_cluster_enabled       = true   # Private API
      authorized_ip_ranges          = []
      network_plugin                = "azure"  # Azure CNI for production-like networking
      network_policy                = "calico"
      enable_azure_policy           = true
      enable_pod_security_policy    = true
      sku_tier                      = "Standard"
    }
    production = {
      private_cluster_enabled       = true
      authorized_ip_ranges          = []
      network_plugin                = "azure"
      network_policy                = "calico"
      enable_azure_policy           = true
      enable_pod_security_policy    = true
      sku_tier                      = "Standard"
    }
    govcloud = {
      private_cluster_enabled       = true   # Mandatory
      authorized_ip_ranges          = []
      network_plugin                = "azure"
      network_policy                = "calico"
      enable_azure_policy           = true
      enable_pod_security_policy    = true
      sku_tier                      = "Standard"
    }
  }

  config = local.security_config[var.security_tier]
}

resource "azurerm_kubernetes_cluster" "this" {
  name                      = var.cluster_name
  location                  = var.location
  resource_group_name       = var.resource_group_name
  dns_prefix                = var.dns_prefix
  private_cluster_enabled   = local.config.private_cluster_enabled
  sku_tier                  = local.config.sku_tier

  # Development tier allows authorized IP access to public API
  dynamic "api_server_access_profile" {
    for_each = !local.config.private_cluster_enabled && length(local.config.authorized_ip_ranges) > 0 ? [1] : []
    content {
      authorized_ip_ranges = local.config.authorized_ip_ranges
    }
  }

  default_node_pool {
    name                = "system"
    node_count          = var.node_count
    vm_size             = var.vm_size
    vnet_subnet_id      = var.subnet_id
    enable_auto_scaling = var.security_tier != "development"  # Only enable in staging+
    min_count           = var.security_tier != "development" ? 1 : null
    max_count           = var.security_tier != "development" ? 10 : null
  }

  network_profile {
    network_plugin    = local.config.network_plugin
    network_policy    = local.config.network_policy
    load_balancer_sku = "standard"
    outbound_type     = local.config.private_cluster_enabled ? "userDefinedRouting" : "loadBalancer"
  }

  identity {
    type = "SystemAssigned"
  }

  # Azure Policy add-on for staging+
  dynamic "azure_policy_enabled" {
    for_each = local.config.enable_azure_policy ? [1] : []
    content {
      enabled = true
    }
  }
}
```

---

## Migration Path: Development → Production

### Step 1: Deploy Development Tier
```bash
cd infrastructure/terraform/environments/dev
terraform init
terraform apply -var="security_tier=development"
```

**What you get**:
- Public endpoints with IP restrictions
- Easy kubectl/database access
- Fast iteration, no private endpoint bugs
- Lower cost

### Step 2: Test Infrastructure
- Validate AKS cluster works
- Deploy SrvThreds services
- Test MongoDB, Redis, RabbitMQ connectivity
- Debug any cloud-specific issues
- **Iterate rapidly**

### Step 3: Harden to Staging
```bash
terraform apply -var="security_tier=staging"
```

**What changes**:
- Private endpoints created for all PaaS services
- AKS becomes private cluster
- Public access disabled
- VNet integration enabled

**Potential issues to debug**:
- Private DNS resolution
- ACR private endpoint + AKS connectivity
- Bastion/VPN access for management

### Step 4: Promote to Production
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform apply -var="security_tier=production"
```

**What changes**:
- Stricter logging and monitoring
- WAF in enforcement mode
- Higher backup frequency
- Auto-scaling enabled

### Step 5: Migrate to Government Cloud
```bash
cd infrastructure/terraform/environments/govcloud/prod
terraform init
terraform apply -var="security_tier=govcloud"
```

**What changes**:
- All public endpoints disabled (enforced)
- Compliance logging mandatory
- Maximum backup retention
- All security features enabled

---

## Developer Access Patterns by Tier

### Development Tier
```bash
# Direct access to AKS
az aks get-credentials --resource-group initiative-dev-aks-rg --name initiative-dev-aks
kubectl get pods

# Direct access to CosmosDB (allowed IPs)
mongosh "mongodb://initiative-dev-cosmos.mongo.cosmos.azure.com:10255/?ssl=true"

# Direct access to ACR
az acr login --name initiativedevacr
docker push initiativedevacr.azurecr.io/srvthreds:latest
```

### Staging/Production Tier
```bash
# Access via Bastion VM or VPN
az network bastion ssh --resource-group initiative-staging-network-rg \
  --name initiative-bastion --target-resource-id <vm-id>

# From bastion/VPN, connect to private resources
kubectl get pods  # Via private API endpoint
mongosh "mongodb://initiative-staging-cosmos.privatelink.mongo.cosmos.azure.com:10255/?ssl=true"
```

### Government Cloud Tier
```bash
# All access via jump box in government cloud
# No direct access from commercial internet
# Strict audit logging of all sessions
```

---

## Cost Comparison by Tier

| Resource | Development | Staging | Production | Gov Cloud |
|----------|-------------|---------|------------|-----------|
| **Private Endpoints** | $0 | ~$50/mo | ~$50/mo | ~$50/mo |
| **VPN Gateway** | $0 | $140/mo | $140/mo | $140/mo |
| **Bastion Host** | $0 | $140/mo | $140/mo | $140/mo |
| **AKS SKU** | Free | Standard $73/mo | Standard $73/mo | Standard $73/mo |
| **Data Transfer** | Low | Medium | High | High |
| **Total Networking Overhead** | **~$0/mo** | **~$400/mo** | **~$400/mo** | **~$400/mo** |

**Savings in development**: ~$400/month while validating infrastructure

---

## IP Allowlisting Strategy (Development Tier)

### Developer IP Management

```hcl
# environments/dev/terraform.tfvars
developer_ip_ranges = [
  "203.0.113.10/32",     # Alan's home IP
  "203.0.113.20/32",     # Rob's home IP
  "203.0.113.0/24",      # Office network
  "198.51.100.0/24",     # VPN exit IPs
]
```

### Applied to Resources

```hcl
# CosmosDB
ip_range_filter = var.developer_ip_ranges

# AKS API Server
api_server_access_profile {
  authorized_ip_ranges = var.developer_ip_ranges
}

# Storage Account
network_rules {
  default_action             = "Deny"
  ip_rules                   = var.developer_ip_ranges
  virtual_network_subnet_ids = []
}

# Key Vault
network_acls {
  default_action = "Deny"
  ip_rules       = var.developer_ip_ranges
  bypass         = "AzureServices"
}
```

---

## Known Azure Issues & Workarounds

### Issue 1: ACR Private Endpoint + Networking Changes
**Problem**: Modifying ACR networking after private endpoint is created breaks App Service pulls
**Your Documented Bug**: See catalyst-infrastructure bicep deployment notes

**Workaround for Development Tier**:
- Don't use private endpoints for ACR initially
- Use IP allowlisting instead
- Transition to private endpoint in staging tier
- Test thoroughly before production

### Issue 2: Private Endpoint DNS Propagation
**Problem**: Private DNS zones take time to propagate, causing intermittent connection failures

**Workaround**:
- Use `depends_on` in Terraform for proper ordering
- Add retry logic in application connection strings
- Validate DNS resolution before deploying apps

### Issue 3: Bastion Performance
**Problem**: Azure Bastion can be slow for frequent developer access

**Workaround for Staging**:
- Consider VPN Gateway instead for better developer experience
- Use Bastion only for break-glass production access
- Keep development tier with direct access

---

## Security Checklist by Tier

### Development Tier Checklist
- [ ] VNet and subnets created
- [ ] NSGs applied (allow from developer IPs)
- [ ] Managed identities enabled
- [ ] RBAC configured
- [ ] Encryption at rest enabled
- [ ] TLS 1.2+ enforced
- [ ] IP allowlisting configured
- [ ] Audit logging enabled (basic)

### Staging Tier Checklist
All development checks, plus:
- [ ] Private endpoints created for all PaaS
- [ ] Private DNS zones configured
- [ ] VNet integration tested
- [ ] Bastion or VPN deployed
- [ ] ACR private endpoint validated
- [ ] Application connectivity tested
- [ ] Monitoring and alerting configured

### Production Tier Checklist
All staging checks, plus:
- [ ] WAF enabled and tuned
- [ ] Auto-scaling configured
- [ ] Backup policies validated
- [ ] Disaster recovery tested
- [ ] Security Center recommendations addressed
- [ ] Compliance reporting enabled
- [ ] Runbooks documented

### Government Cloud Tier Checklist
All production checks, plus:
- [ ] No public endpoints exist
- [ ] FedRAMP compliance validated
- [ ] ITAR controls implemented
- [ ] CJIS compliance verified
- [ ] Audit log retention 90+ days
- [ ] Break-glass procedures tested
- [ ] Security assessment completed

---

## Recommended Timeline

```
Month 1-2:  Development Tier
            ├─ Terraform bootstrap
            ├─ Core networking (VNet, NSGs)
            ├─ AKS with public API
            ├─ CosmosDB with IP allowlist
            ├─ Redis with IP allowlist
            └─ Deploy SrvThreds, iterate rapidly

Month 3-4:  Staging Tier Migration
            ├─ Create staging environment
            ├─ Enable private endpoints
            ├─ Deploy Bastion/VPN
            ├─ Test private networking
            └─ Debug connectivity issues

Month 5-6:  Production Deployment
            ├─ Harden security configuration
            ├─ Enable WAF
            ├─ Configure auto-scaling
            ├─ Deploy production workloads
            └─ Monitor and optimize

Month 12+:  Government Cloud Migration
            ├─ Compliance validation
            ├─ Parallel gov cloud deployment
            ├─ Data migration
            └─ Cutover
```

---

## Summary: Why This Approach Works

### ✅ Advantages
1. **Faster initial development** - No fighting Azure private endpoint bugs
2. **Cost-effective exploration** - Save $400+/month during validation
3. **Learn cloud patterns** - Understand Azure behavior before locking down
4. **Clear migration path** - Security tiers provide roadmap
5. **Terraform-driven** - Infrastructure as code enables easy tier transitions
6. **Documented workarounds** - Known issues addressed with pragmatic solutions

### ⚠️  Considerations
1. **Development tier is not production-ready** - Never use for customer data
2. **IP management overhead** - Must maintain developer IP allowlists
3. **Migration testing required** - Staging tier may reveal unexpected issues
4. **Security debt tracked** - Clear documentation of what needs hardening

### 🎯 Success Criteria
- ✅ Developers can iterate quickly in development tier
- ✅ Staging tier successfully runs with production security
- ✅ Migration from dev → staging → prod is scripted and tested
- ✅ Government cloud requirements are met in final tier

---

Last Updated: 2025-10-31
Maintained by: Initiative Labs Platform Team
