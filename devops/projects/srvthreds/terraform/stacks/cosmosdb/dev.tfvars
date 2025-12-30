# Development Environment Configuration for CosmosDB Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Database Configuration
database_name        = "srvthreds"
mongo_server_version = "4.2"

# Consistency - Session is good for dev (balance of performance and consistency)
consistency_level = "Session"
zone_redundant    = false # Not needed for dev

# No multi-region failover for dev
failover_locations        = []
enable_automatic_failover = false

# Throughput - Use free tier or minimal throughput for dev
enable_serverless   = false # Serverless not compatible with free tier
database_throughput = 400   # Minimum for free tier
enable_autoscale    = false # Not needed for dev
max_throughput      = 4000  # N/A when autoscale disabled

# Backup - Minimal for dev
backup_type                = "Periodic"
backup_interval_minutes    = 1440 # Daily (24 hours)
backup_retention_hours     = 24   # 1 day retention
backup_storage_redundancy  = "Local"

# Network - Public access for dev (no private endpoint support on free tier)
public_network_access_enabled = true  # Required for dev access
enable_virtual_network_filter = false
ip_range_filter               = [] # Allow all IPs for dev convenience

# Private Endpoint - Not available on free tier or lower SKUs with minimal throughput
enable_private_endpoint = false # CosmosDB requires higher SKU for private endpoints

# Additional Features
enable_analytical_storage = false # Not needed for dev
disable_local_auth        = false # Keep key-based auth for dev convenience
enable_free_tier          = true  # Use free tier for dev (400 RU/s free)
