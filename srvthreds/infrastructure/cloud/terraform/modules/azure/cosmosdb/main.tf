# CosmosDB with MongoDB API Module
# Creates a Cosmos DB account configured for MongoDB API with optional private endpoint

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Generate CosmosDB account name following Army NETCOM naming convention
  # Format: CAZ-SRVTHREDS-{ENV}-E-COSMOS
  # Must be globally unique, lowercase, max 44 chars
  cosmos_name = lower(replace("${var.environment == "dev" ? "CAZ-SRVTHREDS-D-E-COSMOS" : var.environment == "test" ? "CAZ-SRVTHREDS-T-E-COSMOS" : "CAZ-SRVTHREDS-P-E-COSMOS"}", "-", ""))

  common_tags = merge(
    var.tags,
    {
      Module      = "cosmosdb"
      Environment = var.environment
    }
  )
}

# Cosmos DB Account with MongoDB API
resource "azurerm_cosmosdb_account" "main" {
  name                = local.cosmos_name
  location            = var.location
  resource_group_name = var.resource_group_name
  offer_type          = "Standard"
  kind                = "MongoDB"

  # MongoDB version
  mongo_server_version = var.mongo_server_version

  # Consistency policy
  consistency_policy {
    consistency_level       = var.consistency_level
    max_interval_in_seconds = var.consistency_level == "BoundedStaleness" ? var.max_staleness_interval : null
    max_staleness_prefix    = var.consistency_level == "BoundedStaleness" ? var.max_staleness_prefix : null
  }

  # Geo-replication configuration
  geo_location {
    location          = var.location
    failover_priority = 0
    zone_redundant    = var.zone_redundant
  }

  # Additional geo locations for multi-region
  dynamic "geo_location" {
    for_each = var.failover_locations
    content {
      location          = geo_location.value.location
      failover_priority = geo_location.value.priority
      zone_redundant    = geo_location.value.zone_redundant
    }
  }

  # Capabilities for MongoDB API
  capabilities {
    name = "EnableMongo"
  }

  dynamic "capabilities" {
    for_each = var.enable_serverless ? ["EnableServerless"] : []
    content {
      name = "EnableServerless"
    }
  }

  dynamic "capabilities" {
    for_each = var.disable_local_auth ? ["DisableRateLimitingResponses"] : []
    content {
      name = "DisableRateLimitingResponses"
    }
  }

  # Backup configuration
  backup {
    type                = var.backup_type
    interval_in_minutes = var.backup_type == "Periodic" ? var.backup_interval_minutes : null
    retention_in_hours  = var.backup_type == "Periodic" ? var.backup_retention_hours : null
    storage_redundancy  = var.backup_type == "Periodic" ? var.backup_storage_redundancy : null
  }

  # Network access
  public_network_access_enabled     = var.public_network_access_enabled
  is_virtual_network_filter_enabled = var.enable_virtual_network_filter

  # Virtual network rules (if not using private endpoint)
  dynamic "virtual_network_rule" {
    for_each = var.virtual_network_rule_ids
    content {
      id                                   = virtual_network_rule.value
      ignore_missing_vnet_service_endpoint = true
    }
  }

  # IP firewall rules
  ip_range_filter = join(",", var.ip_range_filter)

  # Advanced threat protection
  dynamic "analytical_storage" {
    for_each = var.enable_analytical_storage ? [1] : []
    content {
      schema_type = "FullFidelity"
    }
  }

  # Local authentication
  local_authentication_disabled = var.disable_local_auth

  # Automatic failover
  enable_automatic_failover = var.enable_automatic_failover

  # Free tier (dev only)
  enable_free_tier = var.enable_free_tier

  tags = local.common_tags
}

# MongoDB Database
resource "azurerm_cosmosdb_mongo_database" "main" {
  name                = var.database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.main.name

  # Throughput (only for non-serverless)
  throughput = var.enable_serverless ? null : var.database_throughput

  # Autoscale (alternative to fixed throughput)
  dynamic "autoscale_settings" {
    for_each = !var.enable_serverless && var.enable_autoscale ? [1] : []
    content {
      max_throughput = var.max_throughput
    }
  }
}

# Private endpoint for CosmosDB (if enabled)
module "private_endpoint" {
  count  = var.enable_private_endpoint ? 1 : 0
  source = "../private-endpoint"

  location                       = var.location
  resource_group_name            = var.resource_group_name
  private_endpoint_name          = local.cosmos_name
  subnet_id                      = var.private_endpoint_subnet_id
  private_connection_resource_id = azurerm_cosmosdb_account.main.id
  subresource_names              = ["MongoDB"]
  private_dns_zone_name          = "privatelink.mongo.cosmos.azure.com"
  vnet_id                        = var.vnet_id
  tags                           = local.common_tags
}
