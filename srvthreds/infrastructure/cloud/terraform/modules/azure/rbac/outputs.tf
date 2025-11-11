# Outputs for RBAC Module

output "current_client_id" {
  description = "Current Azure client configuration"
  value       = data.azurerm_client_config.current.client_id
}

output "current_tenant_id" {
  description = "Current Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

output "current_subscription_id" {
  description = "Current Azure subscription ID"
  value       = data.azurerm_client_config.current.subscription_id
}

output "aks_role_assignments" {
  description = "AKS role assignment details"
  value = {
    admin_count       = length(azurerm_role_assignment.aks_admin)
    user_count        = length(azurerm_role_assignment.aks_user)
    rbac_admin_count  = length(azurerm_role_assignment.aks_rbac_admin)
  }
}

output "acr_role_assignments" {
  description = "ACR role assignment details"
  value = {
    push_count = length(azurerm_role_assignment.acr_push)
    pull_count = length(azurerm_role_assignment.acr_pull)
  }
}

output "keyvault_role_assignments" {
  description = "Key Vault role assignment details"
  value = {
    secrets_officer_count = length(azurerm_role_assignment.kv_secrets_officer)
    secrets_user_count    = length(azurerm_role_assignment.kv_secrets_user)
    cert_officer_count    = length(azurerm_role_assignment.kv_cert_officer)
    crypto_officer_count  = length(azurerm_role_assignment.kv_crypto_officer)
  }
}

output "storage_role_assignments" {
  description = "Storage Account role assignment details"
  value = {
    blob_contributor_count = length(azurerm_role_assignment.storage_blob_contributor)
    blob_reader_count      = length(azurerm_role_assignment.storage_blob_reader)
  }
}

output "cosmosdb_role_assignments" {
  description = "Cosmos DB role assignment details"
  value = {
    account_reader_count     = length(azurerm_role_assignment.cosmos_account_reader)
    data_contributor_count   = length(azurerm_cosmosdb_sql_role_assignment.cosmos_data_contributor)
  }
}

output "resource_group_role_assignments" {
  description = "Resource Group role assignment details"
  value = {
    contributor_count = length(azurerm_role_assignment.rg_contributor)
    reader_count      = length(azurerm_role_assignment.rg_reader)
  }
}

output "monitoring_role_assignments" {
  description = "Monitoring role assignment details"
  value = {
    monitoring_contributor_count     = length(azurerm_role_assignment.monitoring_contributor)
    monitoring_reader_count          = length(azurerm_role_assignment.monitoring_reader)
    log_analytics_contributor_count  = length(azurerm_role_assignment.log_analytics_contributor)
  }
}

output "network_role_assignments" {
  description = "Network role assignment details"
  value = {
    network_contributor_count = length(azurerm_role_assignment.network_contributor)
  }
}
