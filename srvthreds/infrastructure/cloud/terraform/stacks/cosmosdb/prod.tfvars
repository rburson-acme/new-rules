# Production Environment Configuration for CosmosDB Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Database Configuration
database_name        = "srvthreds"
mongo_server_version = "4.2"

# Consistency - Strong consistency for production data integrity
consistency_level = "Strong"
zone_redundant    = true # Zone redundancy for production HA

# Multi-region failover for production
failover_locations = [
  {
    location       = "westus"
    priority       = 1
    zone_redundant = true
  }
]
enable_automatic_failover = true

# Throughput - Production scale with autoscale
enable_serverless   = false
database_throughput = 4000  # Base throughput
enable_autoscale    = true  # Enable autoscale for production
max_throughput      = 20000 # Scale up to 20,000 RU/s for peak loads

# Backup - Continuous backup for production
backup_type                = "Continuous" # Point-in-time restore for production
backup_interval_minutes    = 240          # N/A for Continuous
backup_retention_hours     = 720          # N/A for Continuous (30 days default)
backup_storage_redundancy  = "Geo"        # Geo-redundant backup for production

# Network - Private endpoint only for production
public_network_access_enabled = false # Fully private for production
enable_virtual_network_filter = false # Using private endpoint instead
ip_range_filter               = []    # No public IP access

# Private Endpoint - Enabled for production (requires higher throughput tier)
enable_private_endpoint = true # Full private access for production

# Additional Features
enable_analytical_storage = true  # Enable Synapse Link for analytics
disable_local_auth        = false # Key-based auth for initial setup, migrate to managed identity
enable_free_tier          = false # No free tier for production
