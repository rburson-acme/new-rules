# Redis Stack - Azure Cache for Redis
# Deploys Redis cache for SrvThreds caching and session management

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
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
    key                  = "stacks/redis/${var.environment}.tfstate"
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
    Stack       = "redis"
  }
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Redis Module
module "redis" {
  source = "../../modules/azure/redis"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name

  # SKU Configuration
  sku_name = var.sku_name
  family   = var.family
  capacity = var.capacity

  # Redis Configuration
  redis_version              = var.redis_version
  minimum_tls_version        = var.minimum_tls_version
  enable_authentication      = var.enable_authentication
  enable_non_ssl_port        = var.enable_non_ssl_port

  # Memory Management
  maxmemory_policy = var.maxmemory_policy

  # Backup Configuration
  rdb_backup_enabled            = var.rdb_backup_enabled
  rdb_backup_frequency          = var.rdb_backup_frequency
  rdb_backup_max_snapshot_count = var.rdb_backup_max_snapshot_count
  rdb_storage_connection_string = var.rdb_storage_connection_string

  # Network Configuration
  public_network_access_enabled = var.public_network_access_enabled

  # Private Endpoint
  enable_private_endpoint    = var.enable_private_endpoint
  private_endpoint_subnet_id = data.terraform_remote_state.networking.outputs.private_endpoint_subnet_id
  vnet_id                    = data.terraform_remote_state.networking.outputs.vnet_id

  # High Availability (Premium)
  shard_count          = var.shard_count
  replicas_per_primary = var.replicas_per_primary
  zones                = var.zones

  # Patch Schedule
  patch_schedule = var.patch_schedule

  tags = local.common_tags
}
