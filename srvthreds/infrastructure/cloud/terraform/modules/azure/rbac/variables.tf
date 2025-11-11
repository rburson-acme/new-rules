# Variables for RBAC Module

# ============================================================================
# Resource IDs
# ============================================================================

variable "resource_group_id" {
  description = "Resource group ID for RBAC assignments"
  type        = string
  default     = null
}

variable "aks_cluster_id" {
  description = "AKS cluster ID for RBAC assignments"
  type        = string
  default     = null
}

variable "acr_id" {
  description = "Azure Container Registry ID for RBAC assignments"
  type        = string
  default     = null
}

variable "key_vault_id" {
  description = "Key Vault ID for RBAC assignments"
  type        = string
  default     = null
}

variable "storage_account_id" {
  description = "Storage Account ID for RBAC assignments"
  type        = string
  default     = null
}

variable "cosmosdb_account_id" {
  description = "Cosmos DB account ID for RBAC assignments"
  type        = string
  default     = null
}

variable "cosmosdb_account_name" {
  description = "Cosmos DB account name (required for Cosmos DB RBAC)"
  type        = string
  default     = null
}

variable "cosmosdb_resource_group_name" {
  description = "Cosmos DB resource group name (required for Cosmos DB RBAC)"
  type        = string
  default     = null
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID for RBAC assignments"
  type        = string
  default     = null
}

variable "vnet_id" {
  description = "Virtual Network ID for RBAC assignments"
  type        = string
  default     = null
}

# ============================================================================
# AKS RBAC Principal IDs
# ============================================================================

variable "aks_admin_group_ids" {
  description = "Azure AD group IDs for AKS admin access (break-glass only)"
  type        = list(string)
  default     = []
}

variable "aks_user_group_ids" {
  description = "Azure AD group IDs for AKS user access (developers)"
  type        = list(string)
  default     = []
}

variable "aks_rbac_admin_group_ids" {
  description = "Azure AD group IDs for Azure RBAC admin on AKS"
  type        = list(string)
  default     = []
}

variable "enable_aks_azure_rbac" {
  description = "Enable Azure RBAC for AKS"
  type        = bool
  default     = true
}

# ============================================================================
# Container Registry RBAC Principal IDs
# ============================================================================

variable "acr_push_principal_ids" {
  description = "Principal IDs for ACR push access (CI/CD service principals)"
  type        = list(string)
  default     = []
}

variable "acr_pull_principal_ids" {
  description = "Principal IDs for ACR pull access (managed identities)"
  type        = list(string)
  default     = []
}

# ============================================================================
# Key Vault RBAC Principal IDs
# ============================================================================

variable "kv_secrets_officer_principal_ids" {
  description = "Principal IDs for Key Vault Secrets Officer role"
  type        = list(string)
  default     = []
}

variable "kv_secrets_user_principal_ids" {
  description = "Principal IDs for Key Vault Secrets User role (applications)"
  type        = list(string)
  default     = []
}

variable "kv_cert_officer_principal_ids" {
  description = "Principal IDs for Key Vault Certificates Officer role"
  type        = list(string)
  default     = []
}

variable "kv_crypto_officer_principal_ids" {
  description = "Principal IDs for Key Vault Crypto Officer role"
  type        = list(string)
  default     = []
}

# ============================================================================
# Storage Account RBAC Principal IDs
# ============================================================================

variable "storage_blob_contributor_principal_ids" {
  description = "Principal IDs for Storage Blob Data Contributor role"
  type        = list(string)
  default     = []
}

variable "storage_blob_reader_principal_ids" {
  description = "Principal IDs for Storage Blob Data Reader role"
  type        = list(string)
  default     = []
}

# ============================================================================
# CosmosDB RBAC Principal IDs
# ============================================================================

variable "cosmos_account_reader_principal_ids" {
  description = "Principal IDs for Cosmos DB Account Reader role"
  type        = list(string)
  default     = []
}

variable "cosmos_data_contributor_principal_ids" {
  description = "Principal IDs for Cosmos DB Data Contributor role (application access)"
  type        = list(string)
  default     = []
}

# ============================================================================
# Resource Group RBAC Principal IDs
# ============================================================================

variable "rg_contributor_principal_ids" {
  description = "Principal IDs for Resource Group Contributor role"
  type        = list(string)
  default     = []
}

variable "rg_reader_principal_ids" {
  description = "Principal IDs for Resource Group Reader role (auditors)"
  type        = list(string)
  default     = []
}

# ============================================================================
# Monitoring RBAC Principal IDs
# ============================================================================

variable "monitoring_contributor_principal_ids" {
  description = "Principal IDs for Monitoring Contributor role"
  type        = list(string)
  default     = []
}

variable "monitoring_reader_principal_ids" {
  description = "Principal IDs for Monitoring Reader role"
  type        = list(string)
  default     = []
}

variable "log_analytics_contributor_principal_ids" {
  description = "Principal IDs for Log Analytics Contributor role"
  type        = list(string)
  default     = []
}

# ============================================================================
# Network RBAC Principal IDs
# ============================================================================

variable "network_contributor_principal_ids" {
  description = "Principal IDs for Network Contributor role"
  type        = list(string)
  default     = []
}
