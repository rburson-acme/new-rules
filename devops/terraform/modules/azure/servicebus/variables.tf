# Service Bus Module Variables

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

# Service Bus Configuration
variable "sku" {
  description = "SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium"
  }
}

variable "capacity" {
  description = "Messaging units for Premium SKU (1, 2, 4, 8, 16)"
  type        = number
  default     = 1
}

variable "zone_redundant" {
  description = "Enable zone redundancy (Premium only)"
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "Minimum TLS version (1.0, 1.1, 1.2)"
  type        = string
  default     = "1.2"
}

variable "local_auth_enabled" {
  description = "Enable local (SAS key) authentication"
  type        = bool
  default     = true
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

# Queues Configuration
variable "queues" {
  description = "List of queues to create"
  type = list(object({
    name                          = string
    max_message_size_kb           = optional(number, 256)
    max_size_mb                   = optional(number, 1024)
    default_message_ttl           = optional(string, "P14D")
    dead_lettering_on_expiration  = optional(bool, false)
    max_delivery_count            = optional(number, 10)
    requires_session              = optional(bool, false)
    requires_duplicate_detection  = optional(bool, false)
    duplicate_detection_window    = optional(string, "PT10M")
    lock_duration                 = optional(string, "PT1M")
    enable_batched_operations     = optional(bool, true)
    enable_partitioning           = optional(bool, false)
    enable_express                = optional(bool, false)
    forward_to                    = optional(string, "")
    forward_dead_lettered_to      = optional(string, "")
  }))
  default = []
}

# Topics Configuration
variable "topics" {
  description = "List of topics to create"
  type = list(object({
    name                          = string
    max_message_size_kb           = optional(number, 256)
    max_size_mb                   = optional(number, 1024)
    default_message_ttl           = optional(string, "P14D")
    requires_duplicate_detection  = optional(bool, false)
    duplicate_detection_window    = optional(string, "PT10M")
    enable_batched_operations     = optional(bool, true)
    enable_partitioning           = optional(bool, false)
    enable_express                = optional(bool, false)
    support_ordering              = optional(bool, false)
  }))
  default = []
}

# Subscriptions Configuration
variable "subscriptions" {
  description = "List of topic subscriptions to create"
  type = list(object({
    name                              = string
    topic_name                        = string
    max_delivery_count                = optional(number, 10)
    default_message_ttl               = optional(string, "P14D")
    lock_duration                     = optional(string, "PT1M")
    dead_lettering_on_expiration      = optional(bool, false)
    dead_lettering_on_filter_error    = optional(bool, false)
    requires_session                  = optional(bool, false)
    forward_to                        = optional(string, "")
    forward_dead_lettered_to          = optional(string, "")
    enable_batched_operations         = optional(bool, true)
  }))
  default = []
}

# Private Endpoint Configuration
variable "enable_private_endpoint" {
  description = "Enable private endpoint for Service Bus"
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

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}
