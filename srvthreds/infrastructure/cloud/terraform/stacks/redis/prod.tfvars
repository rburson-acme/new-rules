# Production Environment Configuration for Redis Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Redis SKU - Premium P1 (6 GB) for production with clustering and private endpoint
sku_name = "Premium"
family   = "P"
capacity = 1 # P1 = 6 GB

# Redis Configuration
redis_version         = "6"
minimum_tls_version   = "1.2"
enable_authentication = true
enable_non_ssl_port   = false

# Eviction policy
maxmemory_policy = "allkeys-lru" # Evict any LRU key

# Backup - RDB backup to storage account (Premium feature)
rdb_backup_enabled            = true
rdb_backup_frequency          = 60 # Hourly backups
rdb_backup_max_snapshot_count = 3
rdb_storage_connection_string = "" # Must be provided via secret/env var

# Network - Private endpoint only for production
public_network_access_enabled = false

# Private Endpoint - Enabled for production
enable_private_endpoint = true

# High Availability - Premium features
shard_count          = 2      # 2 shards for horizontal scaling
replicas_per_primary = 1      # 1 replica per primary for HA
zones                = ["1", "2"] # Zone redundancy for HA

# Patch Schedule - Weekend maintenance with larger window
patch_schedule = [
  {
    day_of_week        = "Saturday"
    start_hour_utc     = 2
    maintenance_window = "PT5H"
  }
]
