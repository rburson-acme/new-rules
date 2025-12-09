# Development Environment Configuration for Redis Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Redis SKU - Premium P1 (6 GB) for dev
sku_name = "Standard"
family   = "C"
capacity = 1 # C1 = 1 GB

# Redis Configuration
redis_version         = "6"
minimum_tls_version   = "1.2"
enable_authentication = true
enable_non_ssl_port   = false

# Eviction policy
maxmemory_policy = "volatile-lru" # Evict LRU keys with expiration

# Backup - Not available on Basic SKU
rdb_backup_enabled            = false
rdb_backup_frequency          = 60
rdb_backup_max_snapshot_count = 1
rdb_storage_connection_string = ""

# Network - Private access for dev
public_network_access_enabled = true

# Firewall Rules - Not needed with private endpoint
firewall_rules = {
  AllowAKSOutbound = {
    start_ip = "74.179.237.247"
    end_ip   = "74.179.237.247"
  }
  AllowMyIP = {
    start_ip = "174.85.197.172"
    end_ip   = "174.85.197.172"
  }
}

# Private Endpoint - Not available on Basic/Standard SKUs
enable_private_endpoint = false # Premium SKU required for private endpoints

# High Availability - Not available on Basic SKU
shard_count          = 0    # Premium only
replicas_per_primary = null # Premium only
zones                = null # Premium only

# Patch Schedule - Weekend maintenance
patch_schedule = [
  {
    day_of_week        = "Sunday"
    start_hour_utc     = 6
    maintenance_window = "PT5H"
  }
]
