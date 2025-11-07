# Azure Monitoring Module
# Creates Log Analytics workspace and Application Insights for observability

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Naming convention: CAZ-SRVTHREDS-{ENV}-E-{FUNCTION}
  log_analytics_name = upper("${var.environment == "dev" ? "caz-srvthreds-d-e-log" : var.environment == "test" ? "caz-srvthreds-t-e-log" : "caz-srvthreds-p-e-log"}")
  app_insights_name  = upper("${var.environment == "dev" ? "caz-srvthreds-d-e-appi" : var.environment == "test" ? "caz-srvthreds-t-e-appi" : "caz-srvthreds-p-e-appi"}")

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Module      = "monitoring"
    Stack       = "monitoring"
  }
}

# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = local.log_analytics_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.log_analytics_sku
  retention_in_days   = var.log_analytics_retention_days

  # Daily quota
  daily_quota_gb = var.log_analytics_daily_quota_gb

  tags = local.common_tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = local.app_insights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.main.id
  application_type    = var.application_insights_type

  # Retention
  retention_in_days = var.application_insights_retention_days

  # Sampling
  sampling_percentage = var.application_insights_sampling_percentage

  # Disable IP masking for better diagnostics (can be enabled for compliance)
  disable_ip_masking = var.disable_ip_masking

  tags = local.common_tags
}

# Action Group for alerts (optional)
resource "azurerm_monitor_action_group" "main" {
  count               = var.create_action_group ? 1 : 0
  name                = "${local.log_analytics_name}-ag"
  resource_group_name = var.resource_group_name
  short_name          = substr(var.project_name, 0, 12)

  # Email receivers
  dynamic "email_receiver" {
    for_each = var.alert_email_receivers
    content {
      name          = email_receiver.value.name
      email_address = email_receiver.value.email_address
    }
  }

  tags = local.common_tags
}
