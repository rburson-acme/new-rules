# Azure RBAC Module

Centralized Role-Based Access Control (RBAC) management for Azure resources following security best practices.

## Overview

This module provides a unified approach to managing Azure RBAC assignments across all infrastructure resources. It implements:

- **Least Privilege Access**: Granular roles scoped to specific resources
- **Managed Identity First**: Prefer managed identities over service principals
- **Separation of Duties**: Different roles for different responsibilities
- **Break-Glass Access**: Emergency admin access patterns
- **Audit Trail**: All assignments tracked in Terraform state

## Supported Resources

- Azure Kubernetes Service (AKS)
- Azure Container Registry (ACR)
- Azure Key Vault
- Azure Storage Accounts
- Azure Cosmos DB
- Resource Groups
- Virtual Networks
- Log Analytics Workspaces

## Usage

### Basic Example

```hcl
module "rbac" {
  source = "../../modules/azure/rbac"

  # Resource IDs
  resource_group_id = azurerm_resource_group.main.id
  aks_cluster_id    = azurerm_kubernetes_cluster.main.id
  acr_id            = azurerm_container_registry.main.id
  key_vault_id      = azurerm_key_vault.main.id

  # AKS Access
  aks_admin_group_ids = [
    data.azurerm_client_config.current.object_id  # Emergency admin access
  ]

  aks_user_group_ids = [
    azuread_group.developers.object_id
  ]

  # ACR Access
  acr_pull_principal_ids = [
    azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  ]

  # Key Vault Access
  kv_secrets_user_principal_ids = [
    azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  ]
}
```

### Complete Example with All Resources

```hcl
module "rbac" {
  source = "../../modules/azure/rbac"

  # ========================================
  # Resource IDs
  # ========================================

  resource_group_id            = azurerm_resource_group.main.id
  aks_cluster_id               = module.aks.cluster_id
  acr_id                       = module.acr.id
  key_vault_id                 = module.keyvault.id
  storage_account_id           = module.storage.id
  cosmosdb_account_id          = module.cosmosdb.id
  cosmosdb_account_name        = module.cosmosdb.name
  cosmosdb_resource_group_name = azurerm_resource_group.main.name
  log_analytics_workspace_id   = module.monitoring.workspace_id
  vnet_id                      = module.networking.vnet_id

  # ========================================
  # AKS RBAC
  # ========================================

  # Break-glass admin access (use sparingly)
  aks_admin_group_ids = [
    data.azurerm_client_config.current.object_id
  ]

  # Developer access (read-only cluster access)
  aks_user_group_ids = [
    azuread_group.developers.object_id
  ]

  # Azure RBAC admins (for namespace-level RBAC)
  aks_rbac_admin_group_ids = [
    azuread_group.platform_team.object_id
  ]

  enable_aks_azure_rbac = true

  # ========================================
  # Container Registry RBAC
  # ========================================

  # CI/CD pipelines (push images)
  acr_push_principal_ids = [
    azuread_service_principal.github_actions.object_id
  ]

  # AKS and applications (pull images)
  acr_pull_principal_ids = [
    module.aks.kubelet_identity_object_id,
    azurerm_user_assigned_identity.app_identity.principal_id
  ]

  # ========================================
  # Key Vault RBAC
  # ========================================

  # Administrators (manage secrets)
  kv_secrets_officer_principal_ids = [
    azuread_group.platform_team.object_id
  ]

  # Applications (read secrets)
  kv_secrets_user_principal_ids = [
    module.aks.kubelet_identity_object_id,
    azurerm_user_assigned_identity.app_identity.principal_id
  ]

  # Certificate management
  kv_cert_officer_principal_ids = [
    azuread_group.platform_team.object_id
  ]

  # Encryption key management
  kv_crypto_officer_principal_ids = [
    azuread_group.security_team.object_id
  ]

  # ========================================
  # Storage Account RBAC
  # ========================================

  # Applications (read/write blobs)
  storage_blob_contributor_principal_ids = [
    azurerm_user_assigned_identity.app_identity.principal_id
  ]

  # Backup/monitoring (read-only)
  storage_blob_reader_principal_ids = [
    azuread_group.ops_team.object_id
  ]

  # ========================================
  # Cosmos DB RBAC
  # ========================================

  # Monitoring (read account metadata)
  cosmos_account_reader_principal_ids = [
    azuread_group.ops_team.object_id
  ]

  # Applications (read/write data)
  cosmos_data_contributor_principal_ids = [
    azurerm_user_assigned_identity.app_identity.principal_id
  ]

  # ========================================
  # Resource Group RBAC
  # ========================================

  # Administrators (manage all resources)
  rg_contributor_principal_ids = [
    azuread_group.platform_team.object_id
  ]

  # Auditors (view all resources)
  rg_reader_principal_ids = [
    azuread_group.auditors.object_id
  ]

  # ========================================
  # Monitoring RBAC
  # ========================================

  # Configure monitoring
  monitoring_contributor_principal_ids = [
    azuread_group.ops_team.object_id
  ]

  # View monitoring data
  monitoring_reader_principal_ids = [
    azuread_group.developers.object_id
  ]

  # Manage Log Analytics
  log_analytics_contributor_principal_ids = [
    azuread_group.platform_team.object_id
  ]

  # ========================================
  # Network RBAC
  # ========================================

  # Network management
  network_contributor_principal_ids = [
    azuread_group.network_team.object_id
  ]
}
```

## Azure RBAC Roles Reference

### AKS Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Azure Kubernetes Service Cluster Admin Role** | Cluster | Break-glass admin access, full cluster control |
| **Azure Kubernetes Service Cluster User Role** | Cluster | Developer access, requires kubectl RBAC |
| **Azure Kubernetes Service RBAC Admin** | Cluster/Namespace | Manage Kubernetes RBAC with Azure AD |

### Container Registry Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **AcrPush** | Registry | CI/CD pipelines, build systems |
| **AcrPull** | Registry | AKS kubelet, application managed identities |
| **AcrDelete** | Registry | Cleanup automation (use sparingly) |

### Key Vault Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Key Vault Secrets Officer** | Vault | Create, read, update, delete secrets |
| **Key Vault Secrets User** | Vault | Read secrets only (applications) |
| **Key Vault Certificates Officer** | Vault | Manage certificates |
| **Key Vault Crypto Officer** | Vault | Manage encryption keys |
| **Key Vault Reader** | Vault | Read metadata only |

### Storage Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Storage Blob Data Contributor** | Account/Container | Read, write, delete blobs |
| **Storage Blob Data Reader** | Account/Container | Read blobs only |
| **Storage Blob Data Owner** | Account/Container | Full control including ACLs |

### Cosmos DB Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Cosmos DB Account Reader Role** | Account | View account metadata, metrics |
| **Cosmos DB Built-in Data Contributor** | Account/Database | Read/write data via data plane |
| **Cosmos DB Built-in Data Reader** | Account/Database | Read data only |

### Resource Group Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Contributor** | Resource Group | Manage all resources except access |
| **Reader** | Resource Group | View all resources |
| **Owner** | Resource Group | Full control including access management |

### Monitoring Roles

| Role | Scope | Use Case |
|------|-------|----------|
| **Monitoring Contributor** | Subscription/RG | Configure monitoring and alerting |
| **Monitoring Reader** | Subscription/RG | View metrics and logs |
| **Log Analytics Contributor** | Workspace | Manage Log Analytics workspace |
| **Log Analytics Reader** | Workspace | View Log Analytics data |

## Best Practices

### 1. Use Managed Identities

**DO:**
```hcl
# Use system-assigned managed identity
resource "azurerm_kubernetes_cluster" "main" {
  identity {
    type = "SystemAssigned"
  }
}

# Grant access via RBAC
module "rbac" {
  acr_pull_principal_ids = [
    azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  ]
}
```

**DON'T:**
```hcl
# Don't use access keys or connection strings
# Avoid storing credentials in application configuration
```

### 2. Implement Least Privilege

**DO:**
```hcl
# Grant minimal required permissions
kv_secrets_user_principal_ids = [
  azurerm_user_assigned_identity.app_identity.principal_id
]
```

**DON'T:**
```hcl
# Don't grant broad permissions
rg_contributor_principal_ids = [
  azurerm_user_assigned_identity.app_identity.principal_id  # Too much access!
]
```

### 3. Separate Admin and Application Access

**DO:**
```hcl
# Admins have officer/contributor roles
kv_secrets_officer_principal_ids = [azuread_group.admins.object_id]

# Applications have user/reader roles
kv_secrets_user_principal_ids = [app_managed_identity.principal_id]
```

### 4. Use Azure AD Groups

**DO:**
```hcl
# Manage users via AD groups
aks_user_group_ids = [
  azuread_group.developers.object_id,
  azuread_group.devops.object_id
]
```

**DON'T:**
```hcl
# Don't assign individual user accounts
aks_user_group_ids = [
  "user1-object-id",  # Hard to manage
  "user2-object-id"
]
```

### 5. Document Break-Glass Access

```hcl
# Break-glass admin access - use only in emergencies
# Access should be monitored and audited
aks_admin_group_ids = [
  azuread_group.platform_team.object_id  # Documented in runbook
]
```

### 6. Scope Assignments Appropriately

**DO:**
```hcl
# Scope to specific resource
module "rbac" {
  key_vault_id = azurerm_key_vault.app_kv.id
  kv_secrets_user_principal_ids = [app_identity.principal_id]
}
```

**DON'T:**
```hcl
# Don't scope at subscription level unless necessary
# Avoid over-broad assignments
```

## Security Considerations

### 1. Managed Identity vs Service Principal

| Aspect | Managed Identity | Service Principal |
|--------|------------------|-------------------|
| **Credentials** | Managed by Azure | Manual rotation required |
| **Lifecycle** | Tied to resource | Manual management |
| **Security** | Higher | Lower (secret exposure risk) |
| **Cost** | Free | Free |
| **Use Case** | Azure resources | CI/CD, external apps |

**Recommendation**: Always use managed identities for Azure resources. Only use service principals for external systems that cannot use managed identities.

### 2. Role Assignment Lifecycle

```hcl
# Terraform manages the entire lifecycle
# Removing from config = removing access
# No manual Azure Portal changes needed
```

### 3. Audit and Compliance

```bash
# View all role assignments
az role assignment list --scope <resource-id>

# Monitor role assignment changes
az monitor activity-log list \
  --resource-group <rg-name> \
  --query "[?contains(operationName.value, 'Microsoft.Authorization/roleAssignments')]"
```

### 4. Emergency Access Patterns

**Break-Glass Accounts:**
- Stored in Key Vault
- Monitored by alerts
- Documented in runbooks
- Regular access reviews

**Example Alert:**
```hcl
resource "azurerm_monitor_activity_log_alert" "rbac_changes" {
  name                = "rbac-changes-alert"
  resource_group_name = azurerm_resource_group.main.name

  criteria {
    category = "Administrative"
    operation_name = "Microsoft.Authorization/roleAssignments/write"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
```

## Troubleshooting

### Permission Denied Errors

```bash
# Check current role assignments
az role assignment list \
  --assignee <principal-id> \
  --scope <resource-id>

# Verify principal ID matches
az ad sp show --id <principal-id>
```

### Role Assignment Conflicts

```bash
# Terraform state may be out of sync
terraform refresh

# Or import existing assignments
terraform import azurerm_role_assignment.example \
  "/subscriptions/.../providers/Microsoft.Authorization/roleAssignments/<id>"
```

### Cosmos DB RBAC Not Working

```hcl
# Ensure both Azure RBAC and Cosmos DB RBAC are configured
# Azure RBAC for control plane (account management)
# Cosmos DB RBAC for data plane (data access)

resource "azurerm_role_assignment" "cosmos_control" {
  role_definition_name = "Cosmos DB Account Reader Role"
  # ...
}

resource "azurerm_cosmosdb_sql_role_assignment" "cosmos_data" {
  role_definition_id = "${var.cosmosdb_id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  # ...
}
```

## Examples

See [../../../stacks/rbac/](../../../stacks/rbac/) for complete deployment examples.

## References

- [Azure Built-in Roles](https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [AKS Azure RBAC](https://docs.microsoft.com/en-us/azure/aks/manage-azure-rbac)
- [Key Vault RBAC](https://docs.microsoft.com/en-us/azure/key-vault/general/rbac-guide)
- [Managed Identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
- [Cosmos DB RBAC](https://docs.microsoft.com/en-us/azure/cosmos-db/how-to-setup-rbac)

---

**Last Updated**: 2025-01-11
**Module Version**: 1.0.0
**Terraform Version**: >= 1.5.0
