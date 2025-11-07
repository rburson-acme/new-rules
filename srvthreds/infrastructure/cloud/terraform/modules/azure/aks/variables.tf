# AKS Module Variables

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod"
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

# AKS Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "sku_tier" {
  description = "SKU tier (Free or Standard)"
  type        = string
  default     = "Free"
}

variable "private_cluster_enabled" {
  description = "Enable private cluster"
  type        = bool
  default     = true
}

variable "private_dns_zone_id" {
  description = "Private DNS zone ID for private cluster"
  type        = string
  default     = ""
}

# Default Node Pool
variable "default_node_pool_node_count" {
  description = "Number of nodes in default pool"
  type        = number
  default     = 2
}

variable "default_node_pool_vm_size" {
  description = "VM size for default node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "default_node_pool_enable_auto_scaling" {
  description = "Enable auto-scaling for default node pool"
  type        = bool
  default     = false
}

variable "default_node_pool_min_count" {
  description = "Minimum node count for auto-scaling"
  type        = number
  default     = 1
}

variable "default_node_pool_max_count" {
  description = "Maximum node count for auto-scaling"
  type        = number
  default     = 5
}

variable "default_node_pool_max_pods" {
  description = "Maximum pods per node"
  type        = number
  default     = 30
}

variable "default_node_pool_os_disk_size_gb" {
  description = "OS disk size in GB"
  type        = number
  default     = 128
}

variable "default_node_pool_os_disk_type" {
  description = "OS disk type (Managed, Ephemeral)"
  type        = string
  default     = "Managed"
}

variable "default_node_pool_zones" {
  description = "Availability zones for default node pool"
  type        = list(string)
  default     = null
}

# Network Configuration
variable "aks_subnet_id" {
  description = "Subnet ID for AKS nodes"
  type        = string
}

variable "network_plugin" {
  description = "Network plugin (azure or kubenet)"
  type        = string
  default     = "azure"
}

variable "network_policy" {
  description = "Network policy (azure, calico, or null)"
  type        = string
  default     = "azure"
}

variable "dns_service_ip" {
  description = "DNS service IP address"
  type        = string
  default     = "10.0.0.10"
}

variable "service_cidr" {
  description = "Service CIDR"
  type        = string
  default     = "10.0.0.0/16"
}

variable "outbound_type" {
  description = "Outbound type (loadBalancer or userDefinedRouting)"
  type        = string
  default     = "loadBalancer"
}

# Azure AD RBAC
variable "enable_azure_ad_rbac" {
  description = "Enable Azure AD RBAC"
  type        = bool
  default     = true
}

variable "enable_azure_rbac" {
  description = "Enable Azure RBAC for Kubernetes authorization"
  type        = bool
  default     = true
}

variable "admin_group_object_ids" {
  description = "Azure AD admin group object IDs"
  type        = list(string)
  default     = []
}

# ACR Integration
variable "acr_id" {
  description = "Azure Container Registry ID for AcrPull role assignment"
  type        = string
  default     = ""
}

# Add-ons
variable "enable_key_vault_secrets_provider" {
  description = "Enable Key Vault secrets provider"
  type        = bool
  default     = true
}

variable "key_vault_secrets_rotation_enabled" {
  description = "Enable secret rotation"
  type        = bool
  default     = true
}

variable "key_vault_secrets_rotation_interval" {
  description = "Secret rotation interval"
  type        = string
  default     = "2m"
}

variable "enable_oms_agent" {
  description = "Enable OMS agent (Azure Monitor)"
  type        = bool
  default     = false
}

variable "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID"
  type        = string
  default     = ""
}

variable "enable_http_application_routing" {
  description = "Enable HTTP application routing"
  type        = bool
  default     = false
}

variable "enable_azure_policy" {
  description = "Enable Azure Policy"
  type        = bool
  default     = false
}

# Maintenance
variable "automatic_channel_upgrade" {
  description = "Auto-upgrade channel (none, patch, stable, rapid, node-image)"
  type        = string
  default     = "none"
}

variable "maintenance_window" {
  description = "Maintenance window configuration"
  type = object({
    allowed = list(object({
      day   = string
      hours = list(number)
    }))
  })
  default = null
}

# Additional Node Pools
variable "additional_node_pools" {
  description = "Additional node pools"
  type = list(object({
    name                = string
    vm_size             = string
    node_count          = number
    enable_auto_scaling = bool
    min_count           = number
    max_count           = number
    max_pods            = number
    os_disk_size_gb     = number
    os_disk_type        = string
    os_type             = string
    zones               = list(string)
    node_labels         = map(string)
    node_taints         = list(string)
  }))
  default = []
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
