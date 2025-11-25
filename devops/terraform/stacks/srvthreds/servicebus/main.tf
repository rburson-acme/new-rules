# Service Bus Stack - Azure Service Bus for Messaging
# Deploys Service Bus namespace with queues for SrvThreds event-driven architecture

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
    key                  = "stacks/servicebus/dev.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# Local variables
locals {
  # Army NETCOM naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = var.environment == "dev" ? "D" : var.environment == "test" ? "T" : "P"
  region   = "E" # East US

  rg_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-RG"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    ManagedBy   = "Terraform"
    Stack       = "servicebus"
  }
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Reference Key Vault from remote state
data "terraform_remote_state" "keyvault" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "keyvault", var.environment)
  })
}

# Service Bus Module
module "servicebus" {
  source = "../../../modules/azure/servicebus"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name

  # SKU Configuration
  sku            = var.sku
  capacity       = var.capacity
  zone_redundant = var.zone_redundant

  # Security Configuration
  minimum_tls_version           = var.minimum_tls_version
  local_auth_enabled            = var.local_auth_enabled
  public_network_access_enabled = var.public_network_access_enabled

  # Queues
  queues = var.queues

  # Topics and Subscriptions
  topics        = var.topics
  subscriptions = var.subscriptions

  # Private Endpoint
  enable_private_endpoint    = var.enable_private_endpoint
  private_endpoint_subnet_id = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
  vnet_id                    = data.terraform_remote_state.networking.outputs.vnet_id

  tags = local.common_tags
}

# Store Service Bus connection string in Key Vault
# This will be injected into RABBITMQ_HOST environment variable for compatibility
resource "azurerm_key_vault_secret" "servicebus_connection_string" {
  name         = "rabbitmq-connection-string"
  value        = module.servicebus.servicebus_primary_connection_string
  key_vault_id = data.terraform_remote_state.keyvault.outputs.key_vault_id

  depends_on = [module.servicebus]
}
