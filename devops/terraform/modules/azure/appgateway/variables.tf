# Application Gateway Module Variables

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
}

variable "cost_center" {
  description = "Cost center for tagging"
  type        = string
}

variable "gateway_subnet_id" {
  description = "ID of the gateway subnet"
  type        = string
}

# Application Gateway SKU
variable "sku_name" {
  description = "Name of the Application Gateway SKU"
  type        = string
  default     = "WAF_v2"
}

variable "sku_tier" {
  description = "Tier of the Application Gateway SKU"
  type        = string
  default     = "WAF_v2"
}

variable "capacity" {
  description = "Number of Application Gateway instances (ignored if autoscale is enabled)"
  type        = number
  default     = 2
}

# Autoscaling
variable "enable_autoscale" {
  description = "Enable autoscaling for Application Gateway"
  type        = bool
  default     = false
}

variable "autoscale_min_capacity" {
  description = "Minimum number of instances when autoscaling"
  type        = number
  default     = 1
}

variable "autoscale_max_capacity" {
  description = "Maximum number of instances when autoscaling"
  type        = number
  default     = 10
}

# Availability zones
variable "availability_zones" {
  description = "Availability zones for zone redundancy"
  type        = list(string)
  default     = null
}

# WAF Configuration
variable "waf_enabled" {
  description = "Enable WAF"
  type        = bool
  default     = true
}

variable "waf_mode" {
  description = "WAF mode (Detection or Prevention)"
  type        = string
  default     = "Prevention"
}

variable "waf_rule_set_version" {
  description = "OWASP rule set version"
  type        = string
  default     = "3.2"
}

variable "waf_file_upload_limit_mb" {
  description = "File upload limit in MB"
  type        = number
  default     = 100
}

variable "waf_max_request_body_size_kb" {
  description = "Maximum request body size in KB"
  type        = number
  default     = 128
}

# Backend configuration
variable "backend_fqdns" {
  description = "List of backend FQDNs"
  type        = list(string)
  default     = []
}
