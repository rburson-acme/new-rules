terraform {
  required_version = ">= 1.5.0"

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
    key                  = "stacks/acr/dev.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

locals {
  # Army naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))
  region   = "E"

  # Resource group name (created by networking stack)
  rg_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-RG"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    ManagedBy   = "Terraform"
    Stack       = "acr"
  }
}

# Reference networking stack outputs
# Uses shared backend configuration from shared-backend-config.tf
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Azure Container Registry with private endpoint
module "acr" {
  source = "../../modules/azure/acr"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name

  # ACR Configuration
  sku                           = var.sku
  public_network_access_enabled = var.public_network_access_enabled
  zone_redundancy_enabled       = var.zone_redundancy_enabled
  encryption_enabled            = var.encryption_enabled
  retention_days                = var.retention_days
  trust_policy_enabled          = var.trust_policy_enabled

  # Private Endpoint Configuration
  enable_private_endpoint     = var.enable_private_endpoint
  private_endpoint_subnet_id  = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
  vnet_id                     = data.terraform_remote_state.networking.outputs.vnet_id

  tags = local.common_tags
}
