# Monitoring Stack
# Deploys Log Analytics and Application Insights for observability

terraform {
  required_version = ">= 1.5"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
    key                  = "stacks/monitoring/dev.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# Reference networking stack for resource group
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}

# Monitoring module
module "monitoring" {
  source = "../../../modules/azure/monitoring"

  environment         = var.environment
  location            = var.location
  resource_group_name = data.terraform_remote_state.networking.outputs.resource_group_name
  project_name        = var.project_name
  cost_center         = var.cost_center

  # Log Analytics
  log_analytics_sku              = var.log_analytics_sku
  log_analytics_retention_days   = var.log_analytics_retention_days
  log_analytics_daily_quota_gb   = var.log_analytics_daily_quota_gb

  # Application Insights
  application_insights_type                = var.application_insights_type
  application_insights_retention_days      = var.application_insights_retention_days
  application_insights_sampling_percentage = var.application_insights_sampling_percentage
  disable_ip_masking                       = var.disable_ip_masking

  # Action Groups
  create_action_group    = var.create_action_group
  alert_email_receivers  = var.alert_email_receivers
}
