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
    key                  = "stacks/keyvault/dev.tfstate"
  }
}

provider "azurerm" {
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      purge_soft_delete_on_destroy = false
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

  # Backend configuration is defined in backend-config.tf (symlinked from _shared)

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Owner       = "Platform Team"
    Stack       = "keyvault"
  }
}

# Reference existing resource group created by networking stack
data "azurerm_resource_group" "main" {
  name = local.resource_group_name
}

# Get networking outputs from remote state
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Key Vault Module
module "keyvault" {
  source = "../../../modules/azure/keyvault"

  environment         = var.environment
  location            = var.location
  resource_group_name = data.azurerm_resource_group.main.name
  vnet_id             = data.terraform_remote_state.networking.outputs.vnet_id
  subnet_id           = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id

  sku_name                      = var.sku_name
  enabled_for_disk_encryption   = var.enabled_for_disk_encryption
  enable_rbac_authorization     = var.enable_rbac_authorization
  purge_protection_enabled      = var.purge_protection_enabled
  public_network_access_enabled = var.public_network_access_enabled

  tags = local.common_tags
}

# Get current client config for Terraform service principal
data "azurerm_client_config" "current" {}

# Grant Terraform service principal Key Vault Secrets Officer role
# This allows Terraform to create/update secrets in Key Vault
resource "azurerm_role_assignment" "terraform_secrets_officer" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
  description          = "Allow Terraform to manage secrets in Key Vault"
}

