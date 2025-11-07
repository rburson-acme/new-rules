# Redis Stack Variables

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

# Redis SKU Configuration
variable "sku_name" {
  description = "SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "family" {
  description = "SKU family (C for Basic/Standard, P for Premium)"
  type        = string
  default     = "C"
}

variable "capacity" {
  description = "Size of Redis cache (0-6)"
  type        = number
  default     = 0
}

# Redis Configuration
variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "6"
}

variable "minimum_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "1.2"
}

variable "enable_authentication" {
  description = "Enable Redis authentication"
  type        = bool
  default     = true
}

variable "enable_non_ssl_port" {
  description = "Enable non-SSL port"
  type        = bool
  default     = false
}

variable "maxmemory_policy" {
  description = "Eviction policy"
  type        = string
  default     = "volatile-lru"
}

# Backup Configuration
variable "rdb_backup_enabled" {
  description = "Enable RDB backup (Premium only)"
  type        = bool
  default     = false
}

variable "rdb_backup_frequency" {
  description = "RDB backup frequency in minutes"
  type        = number
  default     = 60
}

variable "rdb_backup_max_snapshot_count" {
  description = "Maximum RDB snapshots to retain"
  type        = number
  default     = 1
}

variable "rdb_storage_connection_string" {
  description = "Storage connection string for RDB backup"
  type        = string
  default     = ""
  sensitive   = true
}

# Network Configuration
variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

# Private Endpoint
variable "enable_private_endpoint" {
  description = "Enable private endpoint"
  type        = bool
  default     = false
}

# High Availability
variable "shard_count" {
  description = "Number of shards (Premium only)"
  type        = number
  default     = 0
}

variable "replicas_per_primary" {
  description = "Replicas per primary (Premium only)"
  type        = number
  default     = null
}

variable "zones" {
  description = "Availability zones (Premium only)"
  type        = list(string)
  default     = null
}

# Patch Schedule
variable "patch_schedule" {
  description = "Maintenance patch schedule"
  type = list(object({
    day_of_week        = string
    start_hour_utc     = number
    maintenance_window = string
  }))
  default = []
}
