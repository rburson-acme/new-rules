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
    key                  = "stacks/networking/dev.tfstate"
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

locals {
  # Army naming convention components
  caz        = "CAZ"
  app_name   = "SRVTHREDS"
  env_code   = upper(substr(var.environment, 0, 1))
  region     = "E"

  # Army naming convention: CAZ-APPNAME-ENV-REGION-FUNCTION
  resource_group_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-RG"

  # Backend configuration for remote state references
  # NOTE: Networking stack defines this inline (not via symlink) because:
  # 1. It's the foundation stack - no dependencies on other stacks
  # 2. It doesn't reference any remote state
  # 3. Other stacks reference networking's outputs, not vice versa
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
  }

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Owner       = "Platform Team"
    Stack       = "networking"
  }
}

# Data source to check if resource group exists
data "azurerm_resource_group" "main" {
  count = var.create_resource_group ? 0 : 1
  name  = local.resource_group_name
}

# Create resource group only if it doesn't exist
resource "azurerm_resource_group" "main" {
  count    = var.create_resource_group ? 1 : 0
  name     = local.resource_group_name
  location = var.location
  tags     = local.common_tags
}

# Use the resource group (either created or existing)
locals {
  rg_name = var.create_resource_group ? azurerm_resource_group.main[0].name : data.azurerm_resource_group.main[0].name
}

# Networking Module
module "networking" {
  source = "../../../../../terraform/modules/azure/networking"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name
  vnet_address_space  = var.vnet_address_space

  gateway_subnet_prefix          = var.gateway_subnet_prefix
  aks_subnet_prefix              = var.aks_subnet_prefix
  private_endpoint_subnet_prefix = var.private_endpoint_subnet_prefix
  data_subnet_prefix             = var.data_subnet_prefix
  support_subnet_prefix          = var.support_subnet_prefix

  enable_ddos_protection = var.enable_ddos_protection
  enable_vnet_encryption = var.enable_vnet_encryption

  tags = local.common_tags
}

