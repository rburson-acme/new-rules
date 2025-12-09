# Test Environment Configuration for CosmosDB Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Database Configuration
database_name        = "srvthreds"
mongo_server_version = "4.2"

# Consistency - Session for test
consistency_level = "Session"
zone_redundant    = false # Not needed for test

# No multi-region failover for test
failover_locations        = []
enable_automatic_failover = false

# Throughput - Standard provisioned throughput for test
enable_serverless   = false
database_throughput = 1000 # Higher than dev for testing load
enable_autoscale    = true  # Enable autoscale for test workloads
max_throughput      = 4000  # Scale up to 4000 RU/s as needed

# Backup - Moderate for test
backup_type                = "Periodic"
backup_interval_minutes    = 720 # Every 12 hours
backup_retention_hours     = 72  # 3 days retention
backup_storage_redundancy  = "Local"

# Network - Public access for test
public_network_access_enabled = true  # Public for test environment access
enable_virtual_network_filter = false
ip_range_filter               = [] # Allow all IPs for test flexibility

# Private Endpoint - Disabled for test (similar to dev)
enable_private_endpoint = false # Not using private endpoints for test

# Additional Features
enable_analytical_storage = false # Not needed for test
disable_local_auth        = false # Keep key-based auth for test
enable_free_tier          = false # No free tier for test (already used by dev)
