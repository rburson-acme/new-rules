# CosmosDB Module Variables

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

variable "database_name" {
  description = "Name of the MongoDB database"
  type        = string
  default     = "srvthreds"
}

# CosmosDB Configuration
variable "mongo_server_version" {
  description = "MongoDB server version (3.2, 3.6, 4.0, 4.2)"
  type        = string
  default     = "4.2"
}

variable "consistency_level" {
  description = "Consistency level (BoundedStaleness, Eventual, Session, Strong, ConsistentPrefix)"
  type        = string
  default     = "Session"
}

variable "max_staleness_interval" {
  description = "Max staleness interval in seconds (for BoundedStaleness)"
  type        = number
  default     = 5
}

variable "max_staleness_prefix" {
  description = "Max staleness prefix (for BoundedStaleness)"
  type        = number
  default     = 100
}

variable "zone_redundant" {
  description = "Enable zone redundancy for primary region"
  type        = bool
  default     = false
}

variable "failover_locations" {
  description = "Additional geo-locations for multi-region setup"
  type = list(object({
    location       = string
    priority       = number
    zone_redundant = bool
  }))
  default = []
}

variable "enable_serverless" {
  description = "Enable serverless mode (no throughput provisioning)"
  type        = bool
  default     = false
}

variable "database_throughput" {
  description = "Database-level throughput (RU/s) - ignored if serverless or autoscale enabled"
  type        = number
  default     = 400
}

variable "enable_autoscale" {
  description = "Enable autoscale for throughput"
  type        = bool
  default     = false
}

variable "max_throughput" {
  description = "Maximum throughput when autoscale is enabled"
  type        = number
  default     = 4000
}

# Backup Configuration
variable "backup_type" {
  description = "Backup type (Periodic or Continuous)"
  type        = string
  default     = "Periodic"
}

variable "backup_interval_minutes" {
  description = "Backup interval in minutes (60-1440 for Periodic)"
  type        = number
  default     = 240
}

variable "backup_retention_hours" {
  description = "Backup retention in hours (8-720 for Periodic)"
  type        = number
  default     = 24
}

variable "backup_storage_redundancy" {
  description = "Backup storage redundancy (Geo, Local, Zone)"
  type        = string
  default     = "Local"
}

# Network Configuration
variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = false
}

variable "enable_virtual_network_filter" {
  description = "Enable virtual network filter"
  type        = bool
  default     = false
}

variable "virtual_network_rule_ids" {
  description = "List of subnet IDs for VNet rules"
  type        = list(string)
  default     = []
}

variable "ip_range_filter" {
  description = "List of IP addresses or CIDR blocks to allow"
  type        = list(string)
  default     = []
}

# Private Endpoint Configuration
variable "enable_private_endpoint" {
  description = "Enable private endpoint for CosmosDB"
  type        = bool
  default     = true
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

# Additional Features
variable "enable_analytical_storage" {
  description = "Enable analytical storage (synapse link)"
  type        = bool
  default     = false
}

variable "disable_local_auth" {
  description = "Disable local (key-based) authentication"
  type        = bool
  default     = false
}

variable "enable_automatic_failover" {
  description = "Enable automatic failover for multi-region"
  type        = bool
  default     = false
}

variable "enable_free_tier" {
  description = "Enable free tier (one per subscription)"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
