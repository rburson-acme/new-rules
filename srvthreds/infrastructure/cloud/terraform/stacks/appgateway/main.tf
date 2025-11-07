# Application Gateway Stack
# Deploys Application Gateway v2 with WAF

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
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/appgateway/${var.environment}.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# Reference networking stack for subnet and resource group
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/networking/${var.environment}.tfstate"
  }
}

# Application Gateway module
module "appgateway" {
  source = "../../modules/azure/appgateway"

  environment         = var.environment
  location            = var.location
  resource_group_name = data.terraform_remote_state.networking.outputs.resource_group_name
  project_name        = var.project_name
  cost_center         = var.cost_center

  # Subnet
  gateway_subnet_id = data.terraform_remote_state.networking.outputs.gateway_subnet_id

  # SKU and capacity
  sku_name            = var.sku_name
  sku_tier            = var.sku_tier
  capacity            = var.capacity
  enable_autoscale    = var.enable_autoscale
  autoscale_min_capacity = var.autoscale_min_capacity
  autoscale_max_capacity = var.autoscale_max_capacity

  # Availability zones
  availability_zones = var.availability_zones

  # WAF
  waf_enabled                  = var.waf_enabled
  waf_mode                     = var.waf_mode
  waf_rule_set_version         = var.waf_rule_set_version
  waf_file_upload_limit_mb     = var.waf_file_upload_limit_mb
  waf_max_request_body_size_kb = var.waf_max_request_body_size_kb

  # Backend
  backend_fqdns = var.backend_fqdns
}
