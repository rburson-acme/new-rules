# Service Bus Stack Variables

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

# Service Bus Configuration
variable "sku" {
  description = "SKU name (Basic, Standard, Premium)"
  type        = string
  default     = "Basic"
}

variable "capacity" {
  description = "Messaging units for Premium SKU"
  type        = number
  default     = 1
}

variable "zone_redundant" {
  description = "Enable zone redundancy (Premium only)"
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "1.2"
}

variable "local_auth_enabled" {
  description = "Enable local authentication"
  type        = bool
  default     = true
}

variable "public_network_access_enabled" {
  description = "Enable public network access"
  type        = bool
  default     = true
}

# Queues
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

# Topics
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

# Subscriptions
variable "subscriptions" {
  description = "List of topic subscriptions"
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

# Private Endpoint
variable "enable_private_endpoint" {
  description = "Enable private endpoint"
  type        = bool
  default     = false
}
