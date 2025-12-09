# Application Gateway Stack Variables

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
  description = "Azure region"
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

# Application Gateway SKU
variable "sku_name" {
  description = "Name of the Application Gateway SKU"
  type        = string
}

variable "sku_tier" {
  description = "Tier of the Application Gateway SKU"
  type        = string
}

variable "capacity" {
  description = "Number of Application Gateway instances"
  type        = number
}

# Autoscaling
variable "enable_autoscale" {
  description = "Enable autoscaling for Application Gateway"
  type        = bool
}

variable "autoscale_min_capacity" {
  description = "Minimum number of instances when autoscaling"
  type        = number
}

variable "autoscale_max_capacity" {
  description = "Maximum number of instances when autoscaling"
  type        = number
}

# Availability zones
variable "availability_zones" {
  description = "Availability zones for zone redundancy"
  type        = list(string)
}

# WAF Configuration
variable "waf_enabled" {
  description = "Enable WAF"
  type        = bool
}

variable "waf_mode" {
  description = "WAF mode (Detection or Prevention)"
  type        = string
}

variable "waf_rule_set_version" {
  description = "OWASP rule set version"
  type        = string
}

variable "waf_file_upload_limit_mb" {
  description = "File upload limit in MB"
  type        = number
}

variable "waf_max_request_body_size_kb" {
  description = "Maximum request body size in KB"
  type        = number
}

# Backend configuration
variable "backend_fqdns" {
  description = "List of backend FQDNs"
  type        = list(string)
}
