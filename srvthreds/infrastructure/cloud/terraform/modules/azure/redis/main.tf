# Azure Cache for Redis Module
# Creates a Redis cache with optional private endpoint

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
  # Generate Redis cache name following Army NETCOM naming convention
  # Format: CAZ-SRVTHREDS-{ENV}-E-REDIS
  # Must be globally unique, lowercase alphanumeric and hyphens only, 1-63 chars
  redis_name = lower("${var.environment == "dev" ? "caz-srvthreds-d-e-redis" : var.environment == "test" ? "caz-srvthreds-t-e-redis" : "caz-srvthreds-p-e-redis"}")

  common_tags = merge(
    var.tags,
    {
      Module      = "redis"
      Environment = var.environment
    }
  )
}

# Azure Cache for Redis
resource "azurerm_redis_cache" "main" {
  name                = local.redis_name
  location            = var.location
  resource_group_name = var.resource_group_name
  capacity            = var.capacity
  family              = var.family
  sku_name            = var.sku_name

  # Redis version
  redis_version = var.redis_version

  # Network configuration
  public_network_access_enabled = var.public_network_access_enabled
  minimum_tls_version           = var.minimum_tls_version

  # Subnet (for Premium SKU with VNet injection)
  subnet_id = var.sku_name == "Premium" && var.subnet_id != "" ? var.subnet_id : null

  # Redis configuration
  redis_configuration {
    authentication_enabled = var.enable_authentication
    maxmemory_reserved              = var.maxmemory_reserved
    maxmemory_delta                 = var.maxmemory_delta
    maxmemory_policy                = var.maxmemory_policy
    maxfragmentationmemory_reserved = var.maxfragmentationmemory_reserved

    # AOF backup (Premium only)
    aof_backup_enabled              = var.sku_name == "Premium" && var.aof_backup_enabled ? true : null
    aof_storage_connection_string_0 = var.sku_name == "Premium" && var.aof_backup_enabled ? var.aof_storage_connection_string_0 : null
    aof_storage_connection_string_1 = var.sku_name == "Premium" && var.aof_backup_enabled ? var.aof_storage_connection_string_1 : null

    # RDB backup (Premium only)
    rdb_backup_enabled            = var.sku_name == "Premium" && var.rdb_backup_enabled ? true : null
    rdb_backup_frequency          = var.sku_name == "Premium" && var.rdb_backup_enabled ? var.rdb_backup_frequency : null
    rdb_backup_max_snapshot_count = var.sku_name == "Premium" && var.rdb_backup_enabled ? var.rdb_backup_max_snapshot_count : null
    rdb_storage_connection_string = var.sku_name == "Premium" && var.rdb_backup_enabled ? var.rdb_storage_connection_string : null

    # Notifications
    notify_keyspace_events = var.notify_keyspace_events
  }

  # Patch schedule
  dynamic "patch_schedule" {
    for_each = var.patch_schedule
    content {
      day_of_week        = patch_schedule.value.day_of_week
      start_hour_utc     = patch_schedule.value.start_hour_utc
      maintenance_window = patch_schedule.value.maintenance_window
    }
  }

  # Zones (Premium SKU only)
  zones = var.sku_name == "Premium" ? var.zones : null

  # Shard count (Premium SKU with clustering)
  shard_count = var.sku_name == "Premium" && var.shard_count > 0 ? var.shard_count : null

  # Non-SSL port
  non_ssl_port_enabled = var.enable_non_ssl_port

  # Replicas per master (Premium SKU)
  replicas_per_master = var.sku_name == "Premium" ? var.replicas_per_master : null

  # Replicas per primary (alternative naming)
  replicas_per_primary = var.sku_name == "Premium" ? var.replicas_per_primary : null

  tags = local.common_tags
}

# Private endpoint for Redis (if enabled)
module "private_endpoint" {
  count  = var.enable_private_endpoint ? 1 : 0
  source = "../private-endpoint"

  location                       = var.location
  resource_group_name            = var.resource_group_name
  private_endpoint_name          = local.redis_name
  subnet_id                      = var.private_endpoint_subnet_id
  private_connection_resource_id = azurerm_redis_cache.main.id
  subresource_names              = ["redisCache"]
  private_dns_zone_name          = "privatelink.redis.cache.windows.net"
  vnet_id                        = var.vnet_id
  tags                           = local.common_tags
}
