# Azure RBAC Module
# Provides centralized role-based access control management following Azure best practices
#
# This module implements:
# - Least privilege access principle
# - Managed identity-first approach
# - Service-specific role assignments
# - Break-glass admin access patterns

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Data source for current Azure configuration
data "azurerm_client_config" "current" {}

# ============================================================================
# AKS Cluster RBAC Assignments
# ============================================================================

# AKS Cluster Admin Role (for break-glass access only)
resource "azurerm_role_assignment" "aks_admin" {
  for_each = var.aks_cluster_id != null ? toset(var.aks_admin_group_ids) : []

  scope                = var.aks_cluster_id
  role_definition_name = "Azure Kubernetes Service Cluster Admin Role"
  principal_id         = each.value
  description          = "Break-glass admin access to AKS cluster"
}

# AKS Cluster User Role (for developers)
resource "azurerm_role_assignment" "aks_user" {
  for_each = var.aks_cluster_id != null ? toset(var.aks_user_group_ids) : []

  scope                = var.aks_cluster_id
  role_definition_name = "Azure Kubernetes Service Cluster User Role"
  principal_id         = each.value
  description          = "Developer access to AKS cluster"
}

# AKS RBAC Admin (for Azure RBAC integration)
resource "azurerm_role_assignment" "aks_rbac_admin" {
  for_each = var.aks_cluster_id != null && var.enable_aks_azure_rbac ? toset(var.aks_rbac_admin_group_ids) : []

  scope                = var.aks_cluster_id
  role_definition_name = "Azure Kubernetes Service RBAC Admin"
  principal_id         = each.value
  description          = "Azure RBAC admin for AKS cluster"
}

# ============================================================================
# Container Registry RBAC Assignments
# ============================================================================

# ACR Push (for CI/CD pipelines)
resource "azurerm_role_assignment" "acr_push" {
  for_each = var.acr_id != null ? toset(var.acr_push_principal_ids) : []

  scope                = var.acr_id
  role_definition_name = "AcrPush"
  principal_id         = each.value
  description          = "Push images to Azure Container Registry"
}

# ACR Pull (for AKS kubelet identity - handled by AKS module)
# ACR Pull for additional managed identities
resource "azurerm_role_assignment" "acr_pull" {
  for_each = var.acr_id != null ? toset(var.acr_pull_principal_ids) : []

  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = each.value
  description          = "Pull images from Azure Container Registry"
}

# ============================================================================
# Key Vault RBAC Assignments
# ============================================================================

# Key Vault Secrets Officer (for administrators)
resource "azurerm_role_assignment" "kv_secrets_officer" {
  for_each = var.key_vault_id != null ? toset(var.kv_secrets_officer_principal_ids) : []

  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = each.value
  description          = "Manage secrets in Key Vault"
}

# Key Vault Secrets User (for applications)
resource "azurerm_role_assignment" "kv_secrets_user" {
  for_each = var.key_vault_id != null ? toset(var.kv_secrets_user_principal_ids) : []

  scope                = var.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = each.value
  description          = "Read secrets from Key Vault"
}

# Key Vault Certificate Officer (for certificate management)
resource "azurerm_role_assignment" "kv_cert_officer" {
  for_each = var.key_vault_id != null ? toset(var.kv_cert_officer_principal_ids) : []

  scope                = var.key_vault_id
  role_definition_name = "Key Vault Certificates Officer"
  principal_id         = each.value
  description          = "Manage certificates in Key Vault"
}

# Key Vault Crypto Officer (for encryption keys)
resource "azurerm_role_assignment" "kv_crypto_officer" {
  for_each = var.key_vault_id != null ? toset(var.kv_crypto_officer_principal_ids) : []

  scope                = var.key_vault_id
  role_definition_name = "Key Vault Crypto Officer"
  principal_id         = each.value
  description          = "Manage encryption keys in Key Vault"
}

# ============================================================================
# Storage Account RBAC Assignments
# ============================================================================

# Storage Blob Data Contributor (for applications)
resource "azurerm_role_assignment" "storage_blob_contributor" {
  for_each = var.storage_account_id != null ? toset(var.storage_blob_contributor_principal_ids) : []

  scope                = var.storage_account_id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = each.value
  description          = "Read, write, and delete blob data"
}

# Storage Blob Data Reader (for read-only access)
resource "azurerm_role_assignment" "storage_blob_reader" {
  for_each = var.storage_account_id != null ? toset(var.storage_blob_reader_principal_ids) : []

  scope                = var.storage_account_id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = each.value
  description          = "Read blob data"
}

# ============================================================================
# CosmosDB RBAC Assignments
# ============================================================================

# Cosmos DB Account Reader (for monitoring)
resource "azurerm_role_assignment" "cosmos_account_reader" {
  for_each = var.cosmosdb_account_id != null ? toset(var.cosmos_account_reader_principal_ids) : []

  scope                = var.cosmosdb_account_id
  role_definition_name = "Cosmos DB Account Reader Role"
  principal_id         = each.value
  description          = "Read Cosmos DB account metadata"
}

# Cosmos DB Built-in Data Contributor (for application access)
# Note: This uses built-in Cosmos DB RBAC, not Azure RBAC
resource "azurerm_cosmosdb_sql_role_assignment" "cosmos_data_contributor" {
  for_each = var.cosmosdb_account_id != null && var.cosmosdb_account_name != null ? toset(var.cosmos_data_contributor_principal_ids) : []

  resource_group_name = var.cosmosdb_resource_group_name
  account_name        = var.cosmosdb_account_name
  role_definition_id  = "${var.cosmosdb_account_id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002" # Built-in Data Contributor
  principal_id        = each.value
  scope               = var.cosmosdb_account_id
}

# ============================================================================
# Resource Group RBAC Assignments
# ============================================================================

# Contributor role for resource group (for administrators)
resource "azurerm_role_assignment" "rg_contributor" {
  for_each = var.resource_group_id != null ? toset(var.rg_contributor_principal_ids) : []

  scope                = var.resource_group_id
  role_definition_name = "Contributor"
  principal_id         = each.value
  description          = "Manage resources in resource group"
}

# Reader role for resource group (for auditors/viewers)
resource "azurerm_role_assignment" "rg_reader" {
  for_each = var.resource_group_id != null ? toset(var.rg_reader_principal_ids) : []

  scope                = var.resource_group_id
  role_definition_name = "Reader"
  principal_id         = each.value
  description          = "View resources in resource group"
}

# ============================================================================
# Monitoring & Logging RBAC Assignments
# ============================================================================

# Monitoring Contributor (for configuring monitoring)
resource "azurerm_role_assignment" "monitoring_contributor" {
  for_each = var.resource_group_id != null ? toset(var.monitoring_contributor_principal_ids) : []

  scope                = var.resource_group_id
  role_definition_name = "Monitoring Contributor"
  principal_id         = each.value
  description          = "Configure monitoring and alerting"
}

# Monitoring Reader (for viewing metrics and logs)
resource "azurerm_role_assignment" "monitoring_reader" {
  for_each = var.resource_group_id != null ? toset(var.monitoring_reader_principal_ids) : []

  scope                = var.resource_group_id
  role_definition_name = "Monitoring Reader"
  principal_id         = each.value
  description          = "View monitoring data"
}

# Log Analytics Contributor (for Log Analytics workspace)
resource "azurerm_role_assignment" "log_analytics_contributor" {
  for_each = var.log_analytics_workspace_id != null ? toset(var.log_analytics_contributor_principal_ids) : []

  scope                = var.log_analytics_workspace_id
  role_definition_name = "Log Analytics Contributor"
  principal_id         = each.value
  description          = "Manage Log Analytics workspace"
}

# ============================================================================
# Network Contributor (for network management)
# ============================================================================

resource "azurerm_role_assignment" "network_contributor" {
  for_each = var.vnet_id != null ? toset(var.network_contributor_principal_ids) : []

  scope                = var.vnet_id
  role_definition_name = "Network Contributor"
  principal_id         = each.value
  description          = "Manage network resources"
}
