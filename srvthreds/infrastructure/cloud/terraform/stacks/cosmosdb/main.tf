# CosmosDB Stack - MongoDB API Database
# Deploys Cosmos DB with MongoDB API for SrvThreds application data

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
    key                  = "stacks/cosmosdb/dev.tfstate"
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
    Stack       = "cosmosdb"
  }
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# CosmosDB Module
module "cosmosdb" {
  source = "../../modules/azure/cosmosdb"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name

  database_name        = var.database_name
  mongo_server_version = var.mongo_server_version

  # Consistency and replication
  consistency_level         = var.consistency_level
  zone_redundant            = var.zone_redundant
  failover_locations        = var.failover_locations
  enable_automatic_failover = var.enable_automatic_failover

  # Throughput configuration
  enable_serverless    = var.enable_serverless
  database_throughput  = var.database_throughput
  enable_autoscale     = var.enable_autoscale
  max_throughput       = var.max_throughput

  # Backup configuration
  backup_type                = var.backup_type
  backup_interval_minutes    = var.backup_interval_minutes
  backup_retention_hours     = var.backup_retention_hours
  backup_storage_redundancy  = var.backup_storage_redundancy

  # Network configuration
  public_network_access_enabled = var.public_network_access_enabled
  enable_virtual_network_filter = var.enable_virtual_network_filter
  ip_range_filter               = var.ip_range_filter

  # Private endpoint
  enable_private_endpoint    = var.enable_private_endpoint
  private_endpoint_subnet_id = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
  vnet_id                    = data.terraform_remote_state.networking.outputs.vnet_id

  # Additional features
  enable_analytical_storage = var.enable_analytical_storage
  disable_local_auth        = var.disable_local_auth
  enable_free_tier          = var.enable_free_tier

  tags = local.common_tags
}

# Reference Key Vault from remote state
data "terraform_remote_state" "keyvault" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "keyvault", var.environment)
  })
}

# Store MongoDB connection string in Key Vault
# This will be injected into MONGO_HOST environment variable
resource "azurerm_key_vault_secret" "mongo_connection_string" {
  name         = "mongo-connection-string"
  value        = module.cosmosdb.cosmosdb_primary_connection_string
  key_vault_id = data.terraform_remote_state.keyvault.outputs.key_vault_id

  depends_on = [module.cosmosdb]
}