# Azure RBAC Best Practices Guide - SrvThreds

Complete guide for implementing Role-Based Access Control (RBAC) in Azure following enterprise security standards.

## Table of Contents

- [Overview](#overview)
- [Core Principles](#core-principles)
- [Role Assignment Strategy](#role-assignment-strategy)
- [Managed Identities](#managed-identities)
- [Service-Specific RBAC](#service-specific-rbac)
- [Azure AD Integration](#azure-ad-integration)
- [Monitoring and Auditing](#monitoring-and-auditing)
- [Emergency Access](#emergency-access)
- [Compliance and Governance](#compliance-and-governance)

## Overview

Azure RBAC provides fine-grained access management for Azure resources. This guide implements a security-first approach that:

- Minimizes the attack surface
- Enforces least privilege access
- Supports compliance requirements (FedRAMP, ITAR, CJIS)
- Enables audit trails for all access

### Key Concepts

- **Principal**: Who gets access (user, group, service principal, managed identity)
- **Role Definition**: What actions are allowed (built-in or custom roles)
- **Scope**: Where the role applies (subscription, resource group, resource)
- **Role Assignment**: Binding of principal + role + scope

## Core Principles

### 1. Least Privilege Access

Grant the minimum permissions required for the task.

**Implementation:**

```hcl
# ✅ GOOD: Specific role for specific task
resource "azurerm_role_assignment" "app_kv_access" {
  scope                = azurerm_key_vault.app_secrets.id
  role_definition_name = "Key Vault Secrets User"  # Read-only
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# ❌ BAD: Over-privileged access
resource "azurerm_role_assignment" "app_access" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Contributor"  # Too broad!
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

### 2. Prefer Managed Identities Over Service Principals

Managed identities eliminate credential management burden.

**Implementation:**

```hcl
# ✅ GOOD: System-assigned managed identity
resource "azurerm_kubernetes_cluster" "main" {
  name                = "srvthreds-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  dns_prefix          = "srvthreds"

  identity {
    type = "SystemAssigned"
  }
}

# Grant ACR pull access to AKS kubelet identity
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# ❌ BAD: Service principal with manual secret rotation
resource "azurerm_kubernetes_cluster" "main" {
  service_principal {
    client_id     = var.client_id      # Manual secret management
    client_secret = var.client_secret  # Security risk
  }
}
```

### 3. Scope Assignments to Smallest Necessary Boundary

Assign roles at the resource level, not subscription level.

**Implementation:**

```hcl
# ✅ GOOD: Scoped to specific resource
resource "azurerm_role_assignment" "cosmos_access" {
  scope                = azurerm_cosmosdb_account.app_db.id  # Specific resource
  role_definition_name = "Cosmos DB Account Reader Role"
  principal_id         = azuread_group.ops.object_id
}

# ❌ BAD: Subscription-level assignment
resource "azurerm_role_assignment" "broad_access" {
  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  role_definition_name = "Reader"  # Too broad
  principal_id         = azuread_group.ops.object_id
}
```

### 4. Use Azure AD Groups Instead of Individual Users

Simplify access management through groups.

**Implementation:**

```hcl
# ✅ GOOD: Assign via AD groups
data "azuread_group" "developers" {
  display_name = "SrvThreds-Developers"
}

data "azuread_group" "platform_team" {
  display_name = "SrvThreds-Platform-Team"
}

module "rbac" {
  source = "../../modules/azure/rbac"

  aks_user_group_ids = [
    data.azuread_group.developers.object_id
  ]

  aks_admin_group_ids = [
    data.azuread_group.platform_team.object_id
  ]
}

# ❌ BAD: Individual user assignments
module "rbac" {
  aks_user_group_ids = [
    "user-1-object-id",  # Hard to manage
    "user-2-object-id",  # No audit trail
    "user-3-object-id"   # Difficult to review
  ]
}
```

### 5. Separate Duties and Implement Defense in Depth

Different roles for different responsibilities.

**Implementation:**

```hcl
module "rbac" {
  source = "../../modules/azure/rbac"

  # Platform team: Infrastructure management
  rg_contributor_principal_ids = [
    data.azuread_group.platform_team.object_id
  ]

  # Developers: Application deployment only
  aks_user_group_ids = [
    data.azuread_group.developers.object_id
  ]

  # Security team: Secrets and encryption management
  kv_crypto_officer_principal_ids = [
    data.azuread_group.security_team.object_id
  ]

  # Auditors: Read-only access
  rg_reader_principal_ids = [
    data.azuread_group.auditors.object_id
  ]
}
```

## Role Assignment Strategy

### Recommended Azure AD Group Structure

Create the following groups for SrvThreds:

| Group Name | Purpose | Example Roles |
|------------|---------|---------------|
| `SrvThreds-Platform-Team` | Infrastructure management | Contributor (RG), AKS Admin |
| `SrvThreds-Developers` | Application development | AKS User, ACR Pull |
| `SrvThreds-DevOps` | CI/CD and deployments | ACR Push, AKS User |
| `SrvThreds-Security-Team` | Security and compliance | Key Vault Crypto Officer, Security Admin |
| `SrvThreds-Ops-Team` | Operations and monitoring | Monitoring Contributor, Log Analytics Reader |
| `SrvThreds-Auditors` | Compliance and audit | Reader (RG), Monitoring Reader |

### Role Assignment Matrix

#### Development Environment

| Resource | Platform Team | Developers | DevOps | Security Team | Ops Team | Auditors |
|----------|---------------|------------|--------|---------------|----------|----------|
| Resource Group | Contributor | - | - | - | Reader | Reader |
| AKS Cluster | Admin | User | User | - | User | - |
| ACR | Push | Pull | Push | - | Reader | Reader |
| Key Vault | Secrets Officer | Secrets User | Secrets User | Crypto Officer | Reader | Reader |
| Cosmos DB | Account Reader | - | - | - | Account Reader | Account Reader |
| Storage | Blob Contributor | Blob Reader | Blob Contributor | - | Blob Reader | Blob Reader |
| Log Analytics | Contributor | Reader | Reader | Reader | Contributor | Reader |

#### Production Environment

| Resource | Platform Team | Developers | DevOps | Security Team | Ops Team | Auditors |
|----------|---------------|------------|--------|---------------|----------|----------|
| Resource Group | - | - | - | - | Reader | Reader |
| AKS Cluster | Admin (break-glass) | - | - | - | User | - |
| ACR | - | - | Push (CI/CD) | - | Reader | Reader |
| Key Vault | - | - | - | Crypto Officer | Reader | Reader |
| Cosmos DB | - | - | - | - | Account Reader | Account Reader |
| Storage | - | - | - | - | Blob Reader | Blob Reader |
| Log Analytics | - | - | - | Reader | Contributor | Reader |

**Notes:**
- Production has minimal direct access - most changes via CI/CD
- Platform Team has break-glass admin access only
- All changes must go through pull requests and automated deployments

## Managed Identities

### Types of Managed Identities

#### System-Assigned Managed Identity

**When to Use:**
- Single resource needs access to other Azure resources
- Identity lifecycle tied to resource lifecycle
- Simplest option for most scenarios

**Example:**

```hcl
# AKS cluster with system-assigned identity
resource "azurerm_kubernetes_cluster" "main" {
  name                = "srvthreds-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  dns_prefix          = "srvthreds"

  identity {
    type = "SystemAssigned"
  }
}

# Use the identity's object_id for role assignments
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}
```

#### User-Assigned Managed Identity

**When to Use:**
- Multiple resources need the same identity
- Identity lifecycle independent of resources
- Need to pre-create identity and assign permissions

**Example:**

```hcl
# Create user-assigned identity
resource "azurerm_user_assigned_identity" "app_identity" {
  name                = "srvthreds-app-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

# Assign permissions to the identity
resource "azurerm_role_assignment" "identity_kv_access" {
  scope                = azurerm_key_vault.app_secrets.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}

resource "azurerm_role_assignment" "identity_cosmos_access" {
  scope                = azurerm_cosmosdb_account.app_db.id
  role_definition_name = "Cosmos DB Account Reader Role"
  principal_id         = azurerm_user_assigned_identity.app_identity.principal_id
}

# Use identity in multiple resources
resource "azurerm_linux_virtual_machine" "app" {
  # ... other configuration ...

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.app_identity.id]
  }
}
```

### Managed Identity Best Practices

1. **Prefer System-Assigned for Single Resources**
2. **Use User-Assigned for Shared Access**
3. **Never Store Identity Credentials**
4. **Grant Minimal Required Permissions**
5. **Monitor Identity Usage**

## Service-Specific RBAC

### Azure Kubernetes Service (AKS)

#### Azure AD Integration

```hcl
resource "azurerm_kubernetes_cluster" "main" {
  name                = "srvthreds-aks"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  dns_prefix          = "srvthreds"

  # Enable Azure AD integration with Azure RBAC
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled     = true
    admin_group_object_ids = [
      data.azuread_group.platform_team.object_id
    ]
  }

  identity {
    type = "SystemAssigned"
  }
}
```

#### AKS Role Assignments

```hcl
# Platform team - full cluster admin (emergency only)
resource "azurerm_role_assignment" "aks_admin" {
  scope                = azurerm_kubernetes_cluster.main.id
  role_definition_name = "Azure Kubernetes Service Cluster Admin Role"
  principal_id         = data.azuread_group.platform_team.object_id
}

# Developers - cluster user (requires kubectl RBAC)
resource "azurerm_role_assignment" "aks_user" {
  scope                = azurerm_kubernetes_cluster.main.id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = data.azuread_group.developers.object_id
}

# Azure RBAC for namespace-level permissions
resource "azurerm_role_assignment" "aks_rbac_writer" {
  scope                = "${azurerm_kubernetes_cluster.main.id}/namespaces/srvthreds"
  role_definition_name = "Azure Kubernetes Service RBAC Writer"
  principal_id         = data.azuread_group.developers.object_id
}
```

#### Kubernetes RBAC Integration

```yaml
# Create Kubernetes role binding for Azure AD group
apiVersion: rbac.authorization.k8s.io/v1
kind:RoleBinding
metadata:
  name: developers-edit
  namespace: srvthreds
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: edit
subjects:
- apiGroup: rbac.authorization.k8s.io
  kind: Group
  name: "<azure-ad-group-object-id>"
```

### Azure Container Registry (ACR)

```hcl
# CI/CD pipeline - push images
resource "azurerm_role_assignment" "acr_push_ci" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPush"
  principal_id         = azuread_service_principal.github_actions.object_id
}

# AKS kubelet - pull images
resource "azurerm_role_assignment" "acr_pull_aks" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# Developers - pull images for local testing
resource "azurerm_role_assignment" "acr_pull_dev" {
  scope                = azurerm_container_registry.main.id
  role_definition_name = "AcrPull"
  principal_id         = data.azuread_group.developers.object_id
}
```

### Azure Key Vault

#### Enable RBAC Authorization

```hcl
resource "azurerm_key_vault" "main" {
  name                       = "srvthreds-kv"
  resource_group_name        = azurerm_resource_group.main.name
  location                   = azurerm_resource_group.main.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "premium"

  # Enable RBAC instead of access policies
  enable_rbac_authorization = true

  # Disable public access
  public_network_access_enabled = false

  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
  }
}
```

#### Key Vault Role Assignments

```hcl
# Platform team - manage secrets
resource "azurerm_role_assignment" "kv_secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azuread_group.platform_team.object_id
}

# Application identity - read secrets
resource "azurerm_role_assignment" "kv_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Security team - manage encryption keys
resource "azurerm_role_assignment" "kv_crypto_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = data.azuread_group.security_team.object_id
}

# Certificate management
resource "azurerm_role_assignment" "kv_cert_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = data.azuread_group.platform_team.object_id
}
```

#### AKS Secrets Store CSI Driver Integration

```hcl
# Enable Secrets Store CSI Driver in AKS
resource "azurerm_kubernetes_cluster" "main" {
  # ... other configuration ...

  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }
}

# Grant AKS access to Key Vault
resource "azurerm_role_assignment" "aks_kv_access" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].object_id
}
```

### Cosmos DB

Cosmos DB uses both Azure RBAC (control plane) and Cosmos DB RBAC (data plane).

#### Control Plane Access

```hcl
# Operations team - view account metadata and metrics
resource "azurerm_role_assignment" "cosmos_reader" {
  scope                = azurerm_cosmosdb_account.main.id
  role_definition_name = "Cosmos DB Account Reader Role"
  principal_id         = data.azuread_group.ops_team.object_id
}
```

#### Data Plane Access

```hcl
# Application identity - read/write data
resource "azurerm_cosmosdb_sql_role_assignment" "app_data_access" {
  resource_group_name = azurerm_resource_group.main.name
  account_name        = azurerm_cosmosdb_account.main.name
  role_definition_id  = "${azurerm_cosmosdb_account.main.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = azurerm_user_assigned_identity.app.principal_id
  scope               = azurerm_cosmosdb_account.main.id
}
```

### Storage Accounts

```hcl
# Application - read/write blobs
resource "azurerm_role_assignment" "storage_blob_contributor" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# Monitoring - read-only access
resource "azurerm_role_assignment" "storage_blob_reader" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = data.azuread_group.ops_team.object_id
}

# Backup system - full control
resource "azurerm_role_assignment" "storage_blob_owner" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Owner"
  principal_id         = azurerm_user_assigned_identity.backup.principal_id
}
```

## Azure AD Integration

### Creating Azure AD Groups

```bash
# Create platform team group
az ad group create \
  --display-name "SrvThreds-Platform-Team" \
  --mail-nickname "srvthreds-platform" \
  --description "Infrastructure and platform management"

# Create developers group
az ad group create \
  --display-name "SrvThreds-Developers" \
  --mail-nickname "srvthreds-dev" \
  --description "Application developers"

# Add members to group
az ad group member add \
  --group "SrvThreds-Platform-Team" \
  --member-id "<user-object-id>"
```

### Reference Groups in Terraform

```hcl
# Data sources for AD groups
data "azuread_group" "platform_team" {
  display_name = "SrvThreds-Platform-Team"
}

data "azuread_group" "developers" {
  display_name = "SrvThreds-Developers"
}

data "azuread_group" "security_team" {
  display_name = "SrvThreds-Security-Team"
}

# Use in RBAC module
module "rbac" {
  source = "../../modules/azure/rbac"

  aks_admin_group_ids = [
    data.azuread_group.platform_team.object_id
  ]

  aks_user_group_ids = [
    data.azuread_group.developers.object_id
  ]

  kv_crypto_officer_principal_ids = [
    data.azuread_group.security_team.object_id
  ]
}
```

## Monitoring and Auditing

### Enable Activity Logging

```hcl
resource "azurerm_monitor_diagnostic_setting" "subscription" {
  name                       = "subscription-activity-logs"
  target_resource_id         = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }

  enabled_log {
    category = "Alert"
  }

  enabled_log {
    category = "Policy"
  }
}
```

### Alert on RBAC Changes

```hcl
resource "azurerm_monitor_activity_log_alert" "rbac_changes" {
  name                = "rbac-assignment-changes"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_resource_group.main.id]

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Authorization/roleAssignments/write"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}

resource "azurerm_monitor_activity_log_alert" "rbac_deletions" {
  name                = "rbac-assignment-deletions"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [azurerm_resource_group.main.id]

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Authorization/roleAssignments/delete"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
```

### Query RBAC Activity

```bash
# List all role assignments for a resource
az role assignment list \
  --scope "/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/srvthreds-prod-rg"

# List role assignment changes in last 24 hours
az monitor activity-log list \
  --resource-group srvthreds-prod-rg \
  --start-time $(date -u -d '24 hours ago' '+%Y-%m-%dT%H:%M:%SZ') \
  --query "[?contains(operationName.value, 'Microsoft.Authorization/roleAssignments')]"

# View who has what access
az role assignment list \
  --all \
  --assignee "<user-or-group-object-id>"
```

### Log Analytics Queries

```kusto
// RBAC changes in last 7 days
AzureActivity
| where TimeGenerated > ago(7d)
| where OperationNameValue contains "Microsoft.Authorization/roleAssignments"
| project TimeGenerated, Caller, OperationNameValue, ActivityStatusValue, Properties
| order by TimeGenerated desc

// Failed authorization attempts
AzureActivity
| where TimeGenerated > ago(24h)
| where ActivityStatusValue == "Failure"
| where Authorization contains "deny"
| project TimeGenerated, Caller, OperationNameValue, Properties
| order by TimeGenerated desc

// Managed identity usage
AzureDiagnostics
| where ResourceType == "MANAGEDIDENTITY"
| summarize count() by identity_claim_aud_s, TimeGenerated
| order by TimeGenerated desc
```

## Emergency Access

### Break-Glass Accounts

**Setup:**

```hcl
# Store break-glass credentials in Key Vault
resource "azurerm_key_vault_secret" "breakglass_credentials" {
  name         = "breakglass-admin-credentials"
  value        = jsonencode({
    username = "breakglass-admin@domain.com"
    # Password stored separately, accessed only in emergency
  })
  key_vault_id = azurerm_key_vault.security.id

  tags = {
    Purpose = "Emergency Access"
    Alert   = "true"
  }
}

# Break-glass admin group (minimal members)
data "azuread_group" "breakglass" {
  display_name = "SrvThreds-BreakGlass-Admins"
}

# Grant emergency access
resource "azurerm_role_assignment" "breakglass_subscription" {
  scope                = "/subscriptions/${data.azurerm_subscription.current.subscription_id}"
  role_definition_name = "Contributor"
  principal_id         = data.azuread_group.breakglass.object_id

  # Conditional access should be bypassed for this group
}
```

**Usage Protocol:**

1. **Trigger Incident**: Security incident requires immediate access
2. **Notify Team**: Alert security team via defined channels
3. **Access Credentials**: Retrieve from secure vault (requires 2-person rule)
4. **Perform Action**: Complete emergency task with minimal changes
5. **Document**: Record all actions taken
6. **Review**: Post-incident review within 24 hours
7. **Rotate**: Change break-glass credentials immediately after use

### Alert on Break-Glass Usage

```hcl
resource "azurerm_monitor_activity_log_alert" "breakglass_usage" {
  name                = "breakglass-account-used"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = ["/subscriptions/${data.azurerm_subscription.current.subscription_id}"]

  criteria {
    category = "Administrative"
    caller   = "breakglass-admin@domain.com"
  }

  action {
    action_group_id = azurerm_monitor_action_group.critical_security.id
  }

  description = "CRITICAL: Break-glass account has been used"
}
```

## Compliance and Governance

### Azure Policy Integration

```hcl
# Require RBAC on Key Vaults
resource "azurerm_subscription_policy_assignment" "keyvault_rbac" {
  name                 = "require-keyvault-rbac"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/12d4fa5e-1f9f-4c21-97a9-b99b3c6611b5"

  parameters = jsonencode({
    effect = {
      value = "Deny"
    }
  })
}

# Require managed identities for resources
resource "azurerm_subscription_policy_assignment" "managed_identity" {
  name                 = "require-managed-identity"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/f0debc84-981e-4a0a-8c43-08d2ef29ad84"

  parameters = jsonencode({
    effect = {
      value = "Audit"  # Start with audit, move to Deny in production
    }
  })
}
```

### Access Reviews

```bash
# Quarterly access review script
#!/bin/bash

RESOURCE_GROUP="srvthreds-prod-rg"
OUTPUT_FILE="access-review-$(date +%Y-%m-%d).json"

# Export all role assignments
az role assignment list \
  --all \
  --query "[?scope contains @, '$RESOURCE_GROUP']" \
  --output json > "$OUTPUT_FILE"

# Generate report
echo "Access Review Generated: $OUTPUT_FILE"
echo "Total Assignments: $(jq length $OUTPUT_FILE)"
echo ""
echo "By Principal Type:"
jq 'group_by(.principalType) | map({type: .[0].principalType, count: length})' $OUTPUT_FILE
```

### Compliance Checklist

#### FedRAMP Requirements

- [ ] All access uses Azure AD authentication
- [ ] Managed identities for service-to-service authentication
- [ ] No long-lived credentials (service principal secrets > 90 days)
- [ ] RBAC enabled on all Azure resources
- [ ] Audit logging enabled for all role changes
- [ ] Access reviews conducted quarterly
- [ ] Break-glass procedures documented and tested
- [ ] Privileged access managed through PIM (future)

#### ITAR Requirements

- [ ] All identities are US persons
- [ ] Foreign national access prohibited
- [ ] Audit trail for all access to controlled data
- [ ] Geographic restrictions on data access
- [ ] Export control compliance verified

#### CJIS Requirements

- [ ] Background checks for privileged access
- [ ] Multi-factor authentication required
- [ ] Session timeouts enforced
- [ ] Audit logs retained for 7 years
- [ ] Encryption for data at rest and in transit

## Troubleshooting

### Common Issues

#### Permission Denied

```bash
# Check your current role assignments
az role assignment list \
  --assignee $(az ad signed-in-user show --query id -o tsv) \
  --all

# Check effective permissions
az role assignment list \
  --scope <resource-id> \
  --include-inherited
```

#### Role Assignment Not Taking Effect

```bash
# Role assignments can take up to 5 minutes to propagate
# Force refresh by logging out and back in
az logout
az login

# For managed identities, restart the resource
az aks stop --name <aks-name> --resource-group <rg-name>
az aks start --name <aks-name> --resource-group <rg-name>
```

#### Managed Identity Not Working

```bash
# Verify managed identity exists
az identity show --ids <identity-resource-id>

# Check role assignments for the identity
az role assignment list \
  --assignee <managed-identity-principal-id> \
  --all

# Test from within the resource (e.g., AKS pod)
curl 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' \
  -H Metadata:true
```

## References

- [Azure Built-in Roles](https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [Azure RBAC Best Practices](https://docs.microsoft.com/en-us/azure/role-based-access-control/best-practices)
- [Managed Identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [AKS Azure RBAC](https://docs.microsoft.com/en-us/azure/aks/manage-azure-rbac)
- [Key Vault RBAC Migration](https://docs.microsoft.com/en-us/azure/key-vault/general/rbac-migration)
- [Cosmos DB RBAC](https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac)
- [FedRAMP Requirements](https://www.fedramp.gov/assets/resources/documents/FedRAMP_Security_Controls_Baseline.xlsx)

## Implementation

For implementation details, see:
- [RBAC Terraform Module](../../cloud/terraform/modules/azure/rbac/)
- [Security Requirements](./AZURE-SECURITY-REQUIREMENTS.md)
- [Progressive Security Model](../PROGRESSIVE-SECURITY-MODEL.md)

---

**Last Updated**: 2025-01-11
**Document Version**: 1.0.0
**Compliance**: FedRAMP, ITAR, CJIS
