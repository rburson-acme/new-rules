# CosmosDB Stack Variables

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

# Database Configuration
variable "database_name" {
  description = "Name of the MongoDB database"
  type        = string
  default     = "srvthreds"
}

variable "mongo_server_version" {
  description = "MongoDB server version"
  type        = string
  default     = "6.0"
}

# Consistency and Replication
variable "consistency_level" {
  description = "Consistency level"
  type        = string
  default     = "Session"
}

variable "zone_redundant" {
  description = "Enable zone redundancy"
  type        = bool
  default     = false
}

variable "failover_locations" {
  description = "Additional geo-locations for multi-region"
  type = list(object({
    location       = string
    priority       = number
    zone_redundant = bool
  }))
  default = []
}

variable "enable_automatic_failover" {
  description = "Enable automatic failover"
  type        = bool
  default     = false
}

# Throughput Configuration
variable "enable_serverless" {
  description = "Enable serverless mode"
  type        = bool
  default     = false
}

variable "database_throughput" {
  description = "Database-level throughput (RU/s)"
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
  description = "Backup interval in minutes"
  type        = number
  default     = 240
}

variable "backup_retention_hours" {
  description = "Backup retention in hours"
  type        = number
  default     = 24
}

variable "backup_storage_redundancy" {
  description = "Backup storage redundancy"
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

variable "ip_range_filter" {
  description = "List of IP addresses or CIDR blocks to allow"
  type        = list(string)
  default     = []
}

# Private Endpoint
variable "enable_private_endpoint" {
  description = "Enable private endpoint"
  type        = bool
  default     = true
}

# Additional Features
variable "enable_analytical_storage" {
  description = "Enable analytical storage"
  type        = bool
  default     = false
}

variable "disable_local_auth" {
  description = "Disable local authentication"
  type        = bool
  default     = false
}

variable "enable_free_tier" {
  description = "Enable free tier"
  type        = bool
  default     = false
}
