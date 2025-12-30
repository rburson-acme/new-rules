# AKS Stack Variables

variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "srvthreds"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
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
  description = "Private DNS zone ID"
  type        = string
  default     = ""
}

# Default Node Pool
variable "default_node_pool_node_count" {
  description = "Number of nodes"
  type        = number
  default     = 2
}

variable "default_node_pool_vm_size" {
  description = "VM size"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "default_node_pool_enable_auto_scaling" {
  description = "Enable auto-scaling"
  type        = bool
  default     = false
}

variable "default_node_pool_min_count" {
  description = "Minimum node count"
  type        = number
  default     = 1
}

variable "default_node_pool_max_count" {
  description = "Maximum node count"
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
  description = "OS disk type"
  type        = string
  default     = "Managed"
}

variable "default_node_pool_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = null
}

# Network Configuration
variable "network_plugin" {
  description = "Network plugin"
  type        = string
  default     = "azure"
}

variable "network_policy" {
  description = "Network policy"
  type        = string
  default     = "azure"
}

variable "dns_service_ip" {
  description = "DNS service IP"
  type        = string
  default     = ""
}

variable "service_cidr" {
  description = "Service CIDR"
  type        = string
  default     = ""
}

variable "outbound_type" {
  description = "Outbound type"
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
  description = "Enable Azure RBAC"
  type        = bool
  default     = true
}

variable "admin_group_object_ids" {
  description = "Admin group object IDs"
  type        = list(string)
  default     = []
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
  description = "Enable OMS agent"
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
  description = "Auto-upgrade channel"
  type        = string
  default     = "none"
}

variable "maintenance_window" {
  description = "Maintenance window"
  type = object({
    allowed = list(object({
      day   = string
      hours = list(number)
    }))
  })
  default = null
}

# Workload Identity
variable "enable_workload_identity" {
  description = "Enable Workload Identity for pod-level Azure authentication"
  type        = bool
  default     = true
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
