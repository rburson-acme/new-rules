# Azure Security Requirements - Initiative Labs

This document outlines the security architecture requirements for SrvThreds infrastructure deployment on Azure, with a forward-looking design for migration to Azure Government Cloud.

## Executive Summary

The infrastructure must support a **phased migration path**:
1. **Phase 1**: Commercial Azure (Current) - `initiativelabs.onmicrosoft.com`
2. **Phase 2**: Azure Government Cloud (Future) - US Gov Virginia region with strict security controls

All infrastructure will be built with **government cloud security requirements from day one**, ensuring a smooth migration when the time comes.

---

## Critical Security Requirements

### 1. Private Networking (Mandatory)

**Requirement**: All Azure resources must be accessible ONLY through private endpoints within a VNet.

**Government Cloud Mandate**:
- **No public endpoints** for databases, storage, container registries, or Key Vault
- All traffic must flow through private network connections
- Internet-facing resources limited to Application Gateway/Load Balancer with WAF

**Implementation**:
- Private DNS Zones for service discovery
- Private Endpoints for all PaaS services
- Network Security Groups (NSGs) on every subnet
- Service Endpoints disabled in favor of Private Endpoints

### 2. Network Segmentation

**Requirement**: Strict subnet segmentation with defined traffic flow patterns.

**Subnet Architecture** (based on catalyst-infrastructure bicep):

| Subnet | Purpose | Services | NSG Rules |
|--------|---------|----------|-----------|
| **Gateway Subnet** | Public-facing entry | Application Gateway, WAF | Inbound: 443, 80<br>Outbound: To App Integration subnet |
| **App Integration Subnet** | Application hosting | AKS node pools, App Service | Inbound: From Gateway<br>Outbound: To Private Endpoint subnet |
| **Private Endpoint Subnet** | PaaS service access | Private Endpoints (DB, Storage, ACR, KV) | Inbound: From App Integration<br>Outbound: Blocked |
| **Database Subnet** | Data tier isolation | PostgreSQL/CosmosDB Flex Server | Inbound: From App Integration via PE<br>Outbound: Blocked |
| **Support Subnet** | Operational tools | Azure Container Instances (migrations, jobs) | Inbound: From App Integration<br>Outbound: To Private Endpoint subnet |

### 3. Zero Trust Architecture

**Requirement**: Assume breach, verify explicitly, use least privilege access.

**Implementation**:
- **Managed Identities** for all service-to-service authentication (no keys/secrets)
- **Azure RBAC** with granular role assignments
- **Private Endpoints** eliminate public attack surface
- **Network Security Groups** enforce microsegmentation
- **Application Gateway WAF** protects internet-facing entry points
- **Deny by default** - explicitly allow only required traffic

### 4. Data Protection

**Requirement**: Encrypt data at rest and in transit, secure secrets management.

**Implementation**:
- **TLS 1.2+** for all connections
- **VNet encryption** enabled (`encryption.enabled: true`)
- **Storage Account encryption** with customer-managed keys (future)
- **Azure Key Vault** for all certificates and secrets
- **Private Endpoint** for Key Vault access
- **Disk encryption** for AKS node pools
- **Database encryption** at rest (transparent data encryption)

### 5. Identity and Access Management

**Requirement**: Centralized identity management with role-based access control.

**Implementation**:
- **User Assigned Managed Identities** for resources
- **Azure AD/Entra ID** for all authentication
- **No service principals** with long-lived secrets
- **RBAC roles** scoped to resource groups
- **Conditional Access** policies (future)
- **Privileged Identity Management** for admin access (future)

---

## Architecture Comparison

### Catalyst Infrastructure (Government Cloud Ready)

```
Internet → Application Gateway (WAF)
            ↓
        App Service (VNet Integration)
            ↓
        Private Endpoint Subnet
            ↓
        ├─ PostgreSQL (Private Endpoint)
        ├─ Storage Account (Private Endpoint)
        ├─ Container Registry (Private Endpoint)
        └─ Key Vault (Private Endpoint)
```

### SrvThreds Requirements (AKS-based)

```
Internet → Application Gateway (WAF)
            ↓
        AKS Private Cluster (VNet Integration)
            ↓
        Private Endpoint Subnet
            ↓
        ├─ CosmosDB/MongoDB (Private Endpoint)
        ├─ Redis Cache (Private Endpoint)
        ├─ Storage Account (Private Endpoint)
        ├─ Container Registry (Private Endpoint)
        ├─ Service Bus/RabbitMQ (Private Endpoint)
        └─ Key Vault (Private Endpoint)
```

---

## Key Differences: Commercial vs Government Cloud

| Aspect | Commercial Azure | Azure Government Cloud |
|--------|------------------|------------------------|
| **Region** | East US, West US | US Gov Virginia, US Gov Texas |
| **Public Endpoints** | Allowed (not recommended) | **Prohibited by policy** |
| **Private Endpoints** | Recommended | **Mandatory** |
| **Compliance** | Standard Azure compliance | FedRAMP, ITAR, CJIS, IRS 1075 |
| **Network Isolation** | Best practice | **Enforced requirement** |
| **Managed Identities** | Recommended | **Required for service access** |
| **Audit Logging** | Optional | **Mandatory to Azure Monitor** |
| **Resource Naming** | Flexible | Often follows naming conventions (e.g., CAZ-CPIC-D-E-*) |

---

## Terraform Module Design Principles

### 1. Cloud-Agnostic Core, Cloud-Specific Modules

**Pattern**:
```
infrastructure/terraform/
├── modules/
│   ├── common/              # Cloud-agnostic interfaces
│   │   ├── networking/      # Generic VNet/subnet definitions
│   │   ├── kubernetes/      # Generic K8s cluster interface
│   │   └── database/        # Generic database interface
│   ├── azure/               # Azure-specific implementations
│   │   ├── networking/      # VNet, subnets, NSGs, Private Endpoints
│   │   ├── aks/             # AKS with private cluster configuration
│   │   ├── cosmosdb/        # CosmosDB with private endpoints
│   │   ├── redis/           # Azure Cache for Redis (private)
│   │   ├── servicebus/      # Azure Service Bus (private)
│   │   └── keyvault/        # Key Vault with private endpoints
│   └── aws/                 # Future AWS implementations
│       ├── networking/      # VPC, subnets, security groups
│       ├── eks/             # EKS cluster
│       └── ...
```

### 2. Security-First Defaults

**All modules must**:
- Default to private networking
- Require explicit opt-in for public access
- Enforce encryption at rest and in transit
- Use managed identities by default
- Include NSG/firewall rules

**Example** (terraform/modules/azure/cosmosdb/variables.tf):
```hcl
variable "public_network_access_enabled" {
  description = "Enable public network access (should be false for production)"
  type        = bool
  default     = false  # Secure by default
}

variable "enable_private_endpoint" {
  description = "Enable private endpoint for CosmosDB"
  type        = bool
  default     = true  # Secure by default
}
```

### 3. Modular Private Endpoint Pattern

Create reusable private endpoint module (adapted from bicep):

```hcl
# modules/azure/private-endpoint/main.tf
resource "azurerm_private_endpoint" "this" {
  name                = "${var.resource_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "${var.resource_name}-pe-connection"
    private_connection_resource_id = var.resource_id
    subresource_names              = var.subresource_names
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "default"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }

  tags = var.tags
}
```

### 4. Environment-Specific Overlays

```
environments/
├── commercial/          # Current Azure commercial cloud
│   ├── dev/
│   ├── staging/
│   └── prod/
└── govcloud/            # Future Azure Government cloud
    ├── dev/
    └── prod/
```

---

## Phased Implementation Plan

### Phase 1: Bootstrap & Foundation (Week 1)
**Goal**: Set up Terraform state management and validate subscription

**Deliverables**:
1. Terraform state storage account (with private endpoint)
2. Service principal with least-privilege RBAC
3. Subscription validation and security baseline
4. Resource group structure

**Security Controls**:
- Storage account with private endpoint only
- Resource locks on state storage
- Audit logging enabled

### Phase 2: Core Networking (Week 2)
**Goal**: Establish secure network foundation

**Deliverables**:
1. VNet with subnet segmentation
2. Network Security Groups for each subnet
3. Private DNS Zones for Azure services
4. Bastion/Jump box for admin access (optional)

**Security Controls**:
- VNet encryption enabled
- NSG deny-all default rules
- Flow logs to Log Analytics
- DDoS protection (standard tier for production)

### Phase 3: Private Endpoint Infrastructure (Week 2-3)
**Goal**: Create reusable private endpoint patterns

**Deliverables**:
1. Private endpoint Terraform module
2. Private DNS Zone integration
3. Network policies for PE subnet

**Security Controls**:
- Private DNS automatic registration
- Network policies enforced
- Service-specific subresource targeting

### Phase 4: AKS Private Cluster (Week 3-4)
**Goal**: Deploy production-ready Kubernetes

**Deliverables**:
1. AKS with private API server
2. System-assigned managed identity
3. Azure CNI networking
4. Node pool auto-scaling
5. Azure Policy add-on
6. Container Insights monitoring

**Security Controls**:
- Private cluster (no public API)
- Network policies enabled
- Pod security policies
- RBAC with Azure AD integration
- Node disk encryption
- Secrets Store CSI driver for Key Vault

### Phase 5: Data Services with Private Endpoints (Week 4-5)
**Goal**: Deploy databases and caching with zero public access

**Deliverables**:
1. Azure CosmosDB for MongoDB API (private endpoint)
2. Azure Cache for Redis (private endpoint)
3. Azure Service Bus or RabbitMQ on AKS
4. Storage Accounts for application data (private endpoint)

**Security Controls**:
- All services private endpoint only
- Managed identity access
- Encryption at rest with CMK
- Backup and disaster recovery
- Network isolation verified

### Phase 6: Application Gateway & WAF (Week 5-6)
**Goal**: Secure internet-facing entry point

**Deliverables**:
1. Application Gateway v2
2. Web Application Firewall (WAF)
3. SSL/TLS certificate management
4. Backend pool targeting AKS ingress

**Security Controls**:
- WAF OWASP Core Rule Set
- TLS 1.2+ only
- Certificate stored in Key Vault
- DDoS protection integration
- Request logging to Log Analytics

### Phase 7: Observability & Compliance (Week 6)
**Goal**: Monitoring, logging, and audit readiness

**Deliverables**:
1. Log Analytics workspace
2. Application Insights
3. Azure Monitor alerts
4. Diagnostic settings on all resources
5. Azure Policy compliance dashboard

**Security Controls**:
- Centralized logging
- Security Center integration
- Compliance reporting
- Audit log retention (90+ days)
- Alerting on security events

---

## Migration Path to Azure Government Cloud

### Prerequisites
1. Azure Government subscription provisioned
2. Data residency and compliance validation
3. Application compatibility testing in gov cloud

### Migration Steps
1. **Replicate Terraform configuration** to `govcloud/` environment
2. **Update provider regions** (e.g., `usgovvirginia`)
3. **Validate private endpoint DNS** (different endpoints in gov cloud)
4. **Deploy infrastructure** in parallel to commercial
5. **Data migration** via secure transfer
6. **Cutover** with DNS/traffic switching
7. **Decommission** commercial resources

### Government Cloud Considerations
- **Different Azure endpoints**: `*.usgovcloudapi.net` instead of `*.azure.net`
- **Limited region availability**: US Gov Virginia, US Gov Texas, US Gov Arizona
- **Terraform provider configuration**: `environment = "usgovernment"`
- **Compliance certifications**: FedRAMP High, ITAR, CJIS, IRS 1075
- **Support requirements**: US citizen support personnel

---

## Validation Checklist

Before deploying to production, validate:

### Network Security
- [ ] All PaaS services have private endpoints configured
- [ ] No resources have public IP addresses (except App Gateway)
- [ ] NSGs applied to all subnets with deny-default rules
- [ ] Private DNS zones configured for service resolution
- [ ] VNet encryption enabled
- [ ] Network flow logs enabled

### Identity & Access
- [ ] Managed identities used for all service-to-service auth
- [ ] No connection strings or keys in application code
- [ ] RBAC roles scoped to minimum required permissions
- [ ] Service principal rotation policy defined
- [ ] Azure AD integration enabled for AKS

### Data Protection
- [ ] Encryption at rest enabled for all data services
- [ ] TLS 1.2+ enforced for all connections
- [ ] Key Vault integrated with all services
- [ ] Backup policies configured
- [ ] Geo-redundancy enabled for critical data

### Monitoring & Compliance
- [ ] Diagnostic logs enabled on all resources
- [ ] Log Analytics workspace configured
- [ ] Security Center enabled
- [ ] Azure Policy compliance validated
- [ ] Alert rules configured for security events

### Government Cloud Readiness
- [ ] No public endpoints exist
- [ ] Network isolation verified
- [ ] Compliance requirements documented
- [ ] Migration runbook created
- [ ] Disaster recovery tested

---

## Reference Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS (443)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Application Gateway                           │
│                    + WAF (OWASP Rules)                          │
│                    + TLS Termination                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ Gateway Subnet (10.0.1.0/24)
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                      Azure VNet (10.0.0.0/16)                    │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │   App Integration Subnet (10.0.2.0/24)                    │  │
│  │   ┌─────────────────────────────────────────────────┐     │  │
│  │   │        AKS Private Cluster                      │     │  │
│  │   │        - Private API Server                     │     │  │
│  │   │        - Managed Identity                       │     │  │
│  │   │        - Network Policies                       │     │  │
│  │   └─────────────────────────────────────────────────┘     │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │                                      │
│                           │ Private Endpoints                    │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Private Endpoint Subnet (10.0.3.0/24)                  │  │
│  │   ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │   │ CosmosDB-PE│  │ Redis-PE   │  │  ACR-PE    │        │  │
│  │   └──────┬─────┘  └──────┬─────┘  └──────┬─────┘        │  │
│  │          │               │                │               │  │
│  └──────────┼───────────────┼────────────────┼──────────────┘  │
│             │               │                │                  │
│  ┌──────────┴───────────────┴────────────────┴──────────────┐  │
│  │   Private DNS Zones                                       │  │
│  │   - privatelink.mongo.cosmos.azure.com                    │  │
│  │   - privatelink.redis.cache.windows.net                   │  │
│  │   - privatelink.azurecr.io                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │   Database Subnet (10.0.4.0/24)                          │  │
│  │   - CosmosDB (MongoDB API)                               │  │
│  │   - Network isolation enforced                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘

                     ┌─────────────────────┐
                     │    Key Vault (PE)   │
                     │  - Certificates     │
                     │  - Secrets          │
                     │  - Managed Identity │
                     └─────────────────────┘
```

---

## Next Steps

1. **Review this document** with the team and validate requirements
2. **Validate current Azure subscription** setup (Phase 1)
3. **Create Terraform bootstrap** infrastructure (Phase 1)
4. **Begin modular implementation** following phased approach
5. **Iterate and test** each phase before proceeding
6. **Document deviations** from this plan as they occur

---

## References

- [Azure Private Link Documentation](https://docs.microsoft.com/en-us/azure/private-link/)
- [AKS Private Cluster](https://docs.microsoft.com/en-us/azure/aks/private-clusters)
- [Azure Government Documentation](https://docs.microsoft.com/en-us/azure/azure-government/)
- [Catalyst Infrastructure Bicep](~/Repos/catalyst-infrastructure/bicep/)
- [Azure Security Baseline](https://docs.microsoft.com/en-us/security/benchmark/azure/)

---

Last Updated: 2025-10-31
Maintained by: Initiative Labs Platform Team
