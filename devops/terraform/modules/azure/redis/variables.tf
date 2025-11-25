# Redis Module Variables

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

# Redis Configuration
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
  description = "Size of Redis cache (0-6 for C/P family)"
  type        = number
  default     = 0
}

variable "redis_version" {
  description = "Redis version (4 or 6)"
  type        = string
  default     = "6"
}

variable "minimum_tls_version" {
  description = "Minimum TLS version (1.0, 1.1, 1.2)"
  type        = string
  default     = "1.2"
}

variable "enable_authentication" {
  description = "Enable Redis authentication"
  type        = bool
  default     = true
}

variable "enable_non_ssl_port" {
  description = "Enable non-SSL port (6379)"
  type        = bool
  default     = false
}

# Memory Management
variable "maxmemory_reserved" {
  description = "Memory reserved for non-cache operations (MB)"
  type        = number
  default     = null
}

variable "maxmemory_delta" {
  description = "Memory delta reserved for non-cache operations (MB)"
  type        = number
  default     = null
}

variable "maxmemory_policy" {
  description = "Eviction policy (volatile-lru, allkeys-lru, etc.)"
  type        = string
  default     = "volatile-lru"
}

variable "maxfragmentationmemory_reserved" {
  description = "Memory reserved for fragmentation (MB)"
  type        = number
  default     = null
}

# Backup Configuration (Premium only)
variable "aof_backup_enabled" {
  description = "Enable AOF persistence (Premium only)"
  type        = bool
  default     = false
}

variable "aof_storage_connection_string_0" {
  description = "Storage connection string for AOF backup primary"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aof_storage_connection_string_1" {
  description = "Storage connection string for AOF backup secondary"
  type        = string
  default     = ""
  sensitive   = true
}

variable "rdb_backup_enabled" {
  description = "Enable RDB backup (Premium only)"
  type        = bool
  default     = false
}

variable "rdb_backup_frequency" {
  description = "RDB backup frequency in minutes (15, 30, 60, 360, 720, 1440)"
  type        = number
  default     = 60
}

variable "rdb_backup_max_snapshot_count" {
  description = "Maximum number of RDB snapshots to retain"
  type        = number
  default     = 1
}

variable "rdb_storage_connection_string" {
  description = "Storage connection string for RDB backup"
  type        = string
  default     = ""
  sensitive   = true
}

# Notifications
variable "notify_keyspace_events" {
  description = "Keyspace notifications configuration"
  type        = string
  default     = ""
}

# Network Configuration
variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

variable "subnet_id" {
  description = "Subnet ID for VNet injection (Premium only)"
  type        = string
  default     = ""
}

# Private Endpoint Configuration
variable "enable_private_endpoint" {
  description = "Enable private endpoint for Redis"
  type        = bool
  default     = false
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "vnet_id" {
  description = "VNet ID for private DNS zone linking"
  type        = string
  default     = ""
}

# High Availability (Premium only)
variable "shard_count" {
  description = "Number of shards for clustering (Premium only, 1-10)"
  type        = number
  default     = 0
}

variable "replicas_per_master" {
  description = "Number of replicas per master (Premium only)"
  type        = number
  default     = null
}

variable "replicas_per_primary" {
  description = "Number of replicas per primary (Premium only)"
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

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# Firewall Rules
variable "firewall_rules" {
  description = "Map of firewall rules to create"
  type = map(object({
    start_ip = string
    end_ip   = string
  }))
  default = {}
}
