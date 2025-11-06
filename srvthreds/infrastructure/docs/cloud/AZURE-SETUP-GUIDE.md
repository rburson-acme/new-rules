# Azure Subscription Setup Guide - Initiative Labs LLC

This guide documents the setup and best practices for managing the Initiative Labs Azure subscription used for hosting SrvThreds and related infrastructure.

## Current State Analysis

### Subscription Details ✅ UPDATED
- **Name**: Azure subscription 1 (action item: rename to "Initiative Labs Production")
- **ID**: f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed
- **Type**: Pay-as-you-go
- **Tenant**: reshsevenetysevengmail.onmicrosoft.com (migrated from alaninitiativelabs.onmicrosoft.com)
- **Tenant ID**: 0fbd63ce-fee7-4264-ae5d-4e9d725a9417
- **Domain**: initiative.io (to be configured as custom domain)
- **Status**: Active and migrated to clean tenant

### What's Currently Set Up
- Pay-as-you-go subscription (appropriate for startups)
- One owner account via Entra ID:
  - alan@initiativelabs.com (external user)
- One resource group: "DomainServices" in East US (currently empty)
- Basic tagging started (type, reason tags)
- Successfully migrated from old tenant to new tenant with desired naming

### Future State (Government Cloud Migration)
- **Target**: Azure Government Cloud (US Gov Virginia)
- **Timeline**: TBD based on compliance requirements
- **Security Model**: See [AZURE-SECURITY-REQUIREMENTS.md](AZURE-SECURITY-REQUIREMENTS.md) for detailed architecture

## Critical Gaps Identified

### 1. Identity & Access Management
- **Issue**: Both users are external accounts (#EXT#) - guest accounts instead of native Entra ID accounts
- **Recommendation**: Consider setting up native accounts in Entra ID tenant with initiative.io domain
- **Issue**: Both users have Owner role at subscription level (excessive privilege)
- **Fix**: Implement least-privilege access with specific roles

### 2. Security & Governance
- **Missing**: Microsoft Defender for Cloud (not enabled)
- **Missing**: Azure Policy assignments for governance
- **Missing**: Diagnostic/activity log collection
- **Missing**: Resource locks to prevent accidental deletion

### 3. Cost Management
- **Missing**: Budget alerts and cost thresholds
- **Missing**: Comprehensive tagging strategy for cost allocation

### 4. Networking
- **Missing**: Network architecture/VNets for Kubernetes and other resources
- **Missing**: Network security groups and firewall rules

### 5. Subscription Organization
- **Missing**: Management groups (optional for single subscription, useful for scaling)
- **Issue**: Subscription name is default "Azure subscription 1"

## Recommended Setup Pattern

### Phase 1: Foundation (Critical - Do First)

#### 1.1 Rename Subscription
```bash
az account subscription rename --name "Initiative Labs Production"
```

#### 1.2 Set Up Cost Management
```bash
# Create monthly budget with alerts
az consumption budget create \
  --budget-name "monthly-budget" \
  --amount 500 \
  --time-grain "Monthly" \
  --start-date $(date -u +%Y-%m-01T00:00:00Z) \
  --end-date 2026-12-31T23:59:59Z \
  --category "Cost"

# Set up cost alerts at 50%, 80%, 100%
az consumption budget update \
  --budget-name "monthly-budget" \
  --notifications '{"75": {"enabled": true, "operator": "GreaterThan", "threshold": 75, "contactEmails": ["alan@initiativelab.com"]}, "85": {"enabled": true, "operator": "GreaterThan", "threshold": 85, "contactEmails": ["alan@initiativelab.com"]}, "100": {"enabled": true, "operator": "GreaterThan", "threshold": 100, "contactEmails": ["alan@initiativelab.com"]}}'
```

#### 1.3 Enable Microsoft Defender for Cloud
```bash
# Enable free tier for basic security
az security pricing create -n VirtualMachines --tier Free
az security pricing create -n StorageAccounts --tier Free
az security pricing create -n Containers --tier Free
az security pricing create -n KeyVaults --tier Free
az security pricing create -n SqlServers --tier Free
az security pricing create -n AppServices --tier Free

# Enable security contacts
az security contact create \
  --email "alan@initiativelabs.com" \
  --name "default" \
  --alert-notifications "On" \
  --alerts-admins "On"
```

#### 1.4 Set Up Activity Log Collection
```bash
# Create Log Analytics workspace first
az monitor log-analytics workspace create \
  --resource-group initiative-prod-monitoring-rg \
  --workspace-name initiative-logs \
  --location eastus

# Configure activity log diagnostic settings
WORKSPACE_ID=$(az monitor log-analytics workspace show \
  --resource-group initiative-prod-monitoring-rg \
  --workspace-name initiative-logs \
  --query id -o tsv)

az monitor diagnostic-settings subscription create \
  --name "subscription-activity-logs" \
  --location eastus \
  --workspace "${WORKSPACE_ID}" \
  --logs '[
    {"category": "Administrative", "enabled": true},
    {"category": "Security", "enabled": true},
    {"category": "ServiceHealth", "enabled": true},
    {"category": "Alert", "enabled": true},
    {"category": "Policy", "enabled": true}
  ]'
```

### Phase 2: Resource Organization

#### 2.1 Recommended Resource Group Structure

Create one resource group per environment containing all resources for that environment:

```bash
# Development environment
az group create --name initiative-dev-rg --location eastus --tags environment=development managed_by=terraform cost_center=engineering

# Test/Staging environment
az group create --name initiative-test-rg --location eastus --tags environment=test managed_by=terraform cost_center=engineering

# Production environment
az group create --name initiative-prod-rg --location eastus --tags environment=production managed_by=terraform cost_center=production

# Terraform state and automation (shared across all environments)
az group create --name initiative-terraform-rg --location eastus --tags environment=shared managed_by=manual cost_center=infrastructure
```

**Note**: Each environment has a single resource group containing all resources (VNet, AKS, databases, Key Vault, etc.) for easier management and cost tracking.

#### 2.2 Naming Convention Standards

Follow Azure naming best practices:

| Resource Type | Pattern | Example |
|--------------|---------|---------|
| Resource Groups | `{org}-{env}-rg` | `initiative-prod-rg` |
| Virtual Networks | `{org}-{env}-vnet` | `initiative-prod-vnet` |
| Subnets | `{purpose}-subnet` | `aks-subnet`, `data-subnet` |
| Storage Accounts | `{org}{env}{purpose}sa` (no hyphens) | `initprodtfstatesa` |
| Key Vaults | `{org}-{env}-kv` | `initiative-prod-kv` |
| AKS Clusters | `{org}-{env}-aks` | `initiative-prod-aks` |
| CosmosDB | `{org}-{env}-cosmos` | `initiative-prod-cosmos` |
| Redis Cache | `{org}-{env}-redis` | `initiative-prod-redis` |

### Phase 3: Terraform State Management

#### 3.1 Create State Storage Backend

```hcl
# File: infrastructure/terraform/bootstrap/main.tf

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource group for Terraform state
resource "azurerm_resource_group" "terraform" {
  name     = "initiative-prod-terraform-rg"
  location = "eastus"

  tags = {
    organization = "Initiative Labs LLC"
    environment  = "production"
    managed_by   = "terraform"
    cost_center  = "infrastructure"
    purpose      = "terraform-state"
  }
}

# Storage account for Terraform state
resource "azurerm_storage_account" "tfstate" {
  name                     = "initprodtfstatesa"
  resource_group_name      = azurerm_resource_group.terraform.name
  location                 = azurerm_resource_group.terraform.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant for safety

  min_tls_version          = "TLS1_2"
  enable_https_traffic_only = true

  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = {
    organization = "Initiative Labs LLC"
    environment  = "production"
    managed_by   = "terraform"
    cost_center  = "infrastructure"
    purpose      = "terraform-state"
  }
}

# Container for state files
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

# Lock to prevent accidental deletion
resource "azurerm_management_lock" "tfstate" {
  name       = "tfstate-lock"
  scope      = azurerm_storage_account.tfstate.id
  lock_level = "CanNotDelete"
  notes      = "Prevents accidental deletion of Terraform state storage"
}

# Output for backend configuration
output "backend_config" {
  value = {
    resource_group_name  = azurerm_resource_group.terraform.name
    storage_account_name = azurerm_storage_account.tfstate.name
    container_name       = azurerm_storage_container.tfstate.name
  }
}
```

#### 3.2 Backend Configuration Template

```hcl
# File: infrastructure/terraform/backend.tf

terraform {
  backend "azurerm" {
    resource_group_name  = "initiative-prod-terraform-rg"
    storage_account_name = "initprodtfstatesa"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### Phase 4: Tagging Strategy

#### 4.1 Standard Tags

Implement these tags across all resources:

```hcl
# File: infrastructure/terraform/locals.tf

locals {
  common_tags = {
    organization = "Initiative Labs LLC"
    managed_by   = "terraform"
    environment  = var.environment
    cost_center  = var.cost_center
    owner        = "platform-team"
    repository   = "github.com/initiative-labs/srvthreds"
  }
}
```

#### 4.2 Tag Definitions

| Tag | Purpose | Values |
|-----|---------|--------|
| `organization` | Company name | "Initiative Labs LLC" |
| `managed_by` | How resource is managed | "terraform", "manual", "azure-portal" |
| `environment` | Deployment environment | "production", "staging", "development" |
| `cost_center` | Billing allocation | "infrastructure", "compute", "data", "security" |
| `owner` | Responsible team | "platform-team", "data-team" |
| `repository` | Source code location | GitHub repo URL |
| `purpose` | Resource function | Specific to resource type |

### Phase 5: Azure Policy (Governance)

#### 5.1 Essential Policies

Create policy assignments for governance:

```bash
# Require tags on resource groups
az policy assignment create \
  --name "require-tags-rg" \
  --policy "96670d01-0a4d-4649-9c89-2d3abc0a5025" \
  --params '{
    "tagName": {"value": "environment"},
    "tagValue": {"value": ["production", "staging", "development"]}
  }'

# Allowed locations (cost optimization)
az policy assignment create \
  --name "allowed-locations" \
  --policy "e56962a6-4747-49cd-b67b-bf8b01975c4c" \
  --params '{
    "listOfAllowedLocations": {"value": ["eastus", "eastus2", "centralus"]}
  }'

# Require encryption for storage accounts
az policy assignment create \
  --name "require-storage-encryption" \
  --policy "404c3081-a854-4457-ae30-26a93ef643f9"

# Require HTTPS for web apps
az policy assignment create \
  --name "require-https-webapps" \
  --policy "a4af4a39-4135-47fb-b175-47fbdf85311d"
```

#### 5.2 Custom Policy for Tagging

```json
{
  "properties": {
    "displayName": "Require Initiative Labs standard tags",
    "policyType": "Custom",
    "mode": "All",
    "description": "Enforces required tags for Initiative Labs resources",
    "metadata": {
      "category": "Tags"
    },
    "parameters": {},
    "policyRule": {
      "if": {
        "anyOf": [
          {
            "field": "tags['organization']",
            "exists": "false"
          },
          {
            "field": "tags['managed_by']",
            "exists": "false"
          },
          {
            "field": "tags['environment']",
            "exists": "false"
          },
          {
            "field": "tags['cost_center']",
            "exists": "false"
          }
        ]
      },
      "then": {
        "effect": "deny"
      }
    }
  }
}
```

### Phase 6: RBAC Best Practices

#### 6.1 Role Assignment Strategy

Replace broad Owner roles with least-privilege access:

**Current State (Not Recommended):**
- alan@initiativelabs.com: Owner (subscription)
- rob@initiativelabs.com: Owner (subscription)

**Recommended State:**

```bash
# Create custom role for Terraform service principal
az role definition create --role-definition '{
  "Name": "Terraform Automation",
  "Description": "Custom role for Terraform automation",
  "Actions": [
    "*/read",
    "Microsoft.Resources/subscriptions/resourceGroups/*",
    "Microsoft.Compute/*",
    "Microsoft.Network/*",
    "Microsoft.Storage/*",
    "Microsoft.ContainerService/*",
    "Microsoft.KeyVault/*",
    "Microsoft.Sql/*",
    "Microsoft.DocumentDB/*"
  ],
  "NotActions": [],
  "AssignableScopes": ["/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"]
}'

# Assign specific roles to users
# Platform administrators - broad access but not Owner
az role assignment create \
  --assignee "alan@initiativelabs.com" \
  --role "Contributor" \
  --scope "/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"

az role assignment create \
  --assignee "alan@initiativelabs.com" \
  --role "User Access Administrator" \
  --scope "/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"

# Developer access - scoped to specific resource groups
az role assignment create \
  --assignee "rob@initiativelabs.com" \
  --role "Contributor" \
  --resource-group "initiative-prod-aks-rg"

# Read-only access for monitoring
az role assignment create \
  --assignee "rob@initiativelabs.com" \
  --role "Reader" \
  --scope "/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
```

#### 6.2 Service Principal for Terraform

Create a dedicated service principal for Terraform operations:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "terraform-automation-sp" \
  --role "Contributor" \
  --scopes "/subscriptions/f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"

# Store credentials in Key Vault (after Key Vault is created)
az keyvault secret set \
  --vault-name "initiative-prod-secrets-kv" \
  --name "terraform-sp-client-id" \
  --value "<CLIENT_ID>"

az keyvault secret set \
  --vault-name "initiative-prod-secrets-kv" \
  --name "terraform-sp-client-secret" \
  --value "<CLIENT_SECRET>"
```

#### 6.3 Break-Glass Account

Keep one Owner account for emergency access:
- Store credentials securely in a physical safe or password manager
- Use only for emergency situations
- Enable MFA
- Monitor usage with alerts

### Phase 7: Network Architecture

#### 7.1 Hub-Spoke Network Design

```hcl
# Hub VNet - shared services
resource "azurerm_virtual_network" "hub" {
  name                = "initiative-prod-hub-vnet"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.network.name
  address_space       = ["10.0.0.0/16"]

  tags = local.common_tags
}

# Spoke VNet - AKS workloads
resource "azurerm_virtual_network" "aks" {
  name                = "initiative-prod-aks-vnet"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.network.name
  address_space       = ["10.1.0.0/16"]

  tags = local.common_tags
}

# AKS subnet
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.aks.name
  address_prefixes     = ["10.1.0.0/20"]
}

# Data subnet (private endpoints)
resource "azurerm_subnet" "data" {
  name                 = "data-subnet"
  resource_group_name  = azurerm_resource_group.network.name
  virtual_network_name = azurerm_virtual_network.aks.name
  address_prefixes     = ["10.1.16.0/24"]

  private_endpoint_network_policies_enabled = false
}

# VNet peering
resource "azurerm_virtual_network_peering" "hub_to_aks" {
  name                      = "hub-to-aks"
  resource_group_name       = azurerm_resource_group.network.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.aks.id
}

resource "azurerm_virtual_network_peering" "aks_to_hub" {
  name                      = "aks-to-hub"
  resource_group_name       = azurerm_resource_group.network.name
  virtual_network_name      = azurerm_virtual_network.aks.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id
}
```

#### 7.2 Network Security Groups

```hcl
# AKS NSG
resource "azurerm_network_security_group" "aks" {
  name                = "initiative-prod-aks-nsg"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.network.name

  security_rule {
    name                       = "allow-https-inbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  tags = local.common_tags
}
```

### Phase 8: Security Hardening

#### 8.1 Key Vault Setup

```hcl
resource "azurerm_key_vault" "main" {
  name                = "initiative-prod-kv"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.security.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enabled_for_deployment          = false
  enabled_for_disk_encryption     = true
  enabled_for_template_deployment = false
  enable_rbac_authorization       = true

  purge_protection_enabled   = true
  soft_delete_retention_days = 90

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = []  # Add your IPs here
  }

  tags = local.common_tags
}
```

#### 8.2 Enable Advanced Threat Protection

```bash
# Enable Defender for Cloud (standard tier for production)
az security pricing create -n VirtualMachines --tier Standard
az security pricing create -n Containers --tier Standard
az security pricing create -n KeyVaults --tier Standard
```

## Implementation Checklist

### Immediate Actions (Week 1)
- [ ] Rename subscription to "Initiative Labs Production"
- [ ] Set up monthly budget ($500) with alerts
- [ ] Enable Microsoft Defender for Cloud (free tier)
- [ ] Create Log Analytics workspace
- [ ] Configure activity log collection
- [ ] Set up security contact email

### Foundation Setup (Week 2)
- [ ] Create resource groups following naming convention
- [ ] Set up Terraform state storage account
- [ ] Create service principal for Terraform
- [ ] Store credentials in Key Vault
- [ ] Configure backend for Terraform

### Governance & Security (Week 3)
- [ ] Implement tagging strategy across existing resources
- [ ] Create and assign Azure Policies
- [ ] Review and adjust RBAC assignments
- [ ] Set up resource locks on critical resources
- [ ] Enable diagnostic settings on all resources

### Network & Infrastructure (Week 4)
- [ ] Design and implement VNet architecture
- [ ] Configure NSGs and security rules
- [ ] Set up private endpoints for data services
- [ ] Configure Azure Firewall (if needed)
- [ ] Implement network monitoring

### Ongoing Maintenance
- [ ] Review cost reports monthly
- [ ] Review security recommendations weekly
- [ ] Update policies as needed
- [ ] Audit RBAC assignments quarterly
- [ ] Review and rotate service principal credentials every 90 days

## Additional Resources

### Azure Documentation
- [Azure Landing Zones](https://docs.microsoft.com/en-us/azure/cloud-adoption-framework/ready/landing-zone/)
- [Azure Well-Architected Framework](https://docs.microsoft.com/en-us/azure/architecture/framework/)
- [Azure Naming Conventions](https://docs.microsoft.com/en-us/azure/cloud-adoption-framework/ready/azure-best-practices/naming-and-tagging)

### Terraform Resources
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

### Security Best Practices
- [Azure Security Baseline](https://docs.microsoft.com/en-us/security/benchmark/azure/)
- [CIS Azure Foundations Benchmark](https://www.cisecurity.org/benchmark/azure)

## Contact

For questions about this setup:
- **Platform Team**: alan@initiativelabs.com, rob@initiativelabs.com
- **Repository**: github.com/initiative-labs/srvthreds

---

Last Updated: 2025-10-31
Maintained by: Initiative Labs Platform Team
