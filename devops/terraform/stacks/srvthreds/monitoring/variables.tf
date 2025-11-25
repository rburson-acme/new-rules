# Monitoring Stack Variables

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

# Log Analytics
variable "log_analytics_sku" {
  description = "SKU for Log Analytics workspace"
  type        = string
}

variable "log_analytics_retention_days" {
  description = "Retention period in days for Log Analytics"
  type        = number
}

variable "log_analytics_daily_quota_gb" {
  description = "Daily ingestion quota in GB (-1 for unlimited)"
  type        = number
}

# Application Insights
variable "application_insights_type" {
  description = "Application type for Application Insights"
  type        = string
}

variable "application_insights_retention_days" {
  description = "Retention period in days for Application Insights"
  type        = number
}

variable "application_insights_sampling_percentage" {
  description = "Sampling percentage for Application Insights (0-100)"
  type        = number
}

variable "disable_ip_masking" {
  description = "Disable IP masking in Application Insights"
  type        = bool
}

# Action Groups
variable "create_action_group" {
  description = "Create an action group for alerts"
  type        = bool
}

variable "alert_email_receivers" {
  description = "Email receivers for alerts"
  type = list(object({
    name          = string
    email_address = string
  }))
}
