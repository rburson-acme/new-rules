# Development Environment Configuration for Service Bus Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Service Bus SKU - Basic for dev (lowest cost)
sku            = "Basic"
capacity       = 1    # N/A for Basic
zone_redundant = false # Premium only

# Security
minimum_tls_version           = "1.2"
local_auth_enabled            = true # Keep SAS keys for dev
public_network_access_enabled = true # Public access for dev

# Private Endpoint - Not available on Basic SKU
enable_private_endpoint = false # Premium SKU required

# Queues for SrvThreds event-driven architecture
# Basic SKU: Max 256 KB messages, no partitioning, no sessions
queues = [
  {
    name                         = "inbound-events"
    max_message_size_kb          = 256 # Basic max
    max_size_mb                  = 1024 # 1 GB
    default_message_ttl          = "P7D" # 7 days
    dead_lettering_on_expiration = true
    max_delivery_count           = 10
    requires_session             = false # Basic doesn't support sessions well
    requires_duplicate_detection = false
    lock_duration                = "PT1M"
    enable_batched_operations    = true
    enable_partitioning          = false # Not available on Basic
    enable_express               = false # Standard only
  },
  {
    name                         = "outbound-messages"
    max_message_size_kb          = 256
    max_size_mb                  = 1024
    default_message_ttl          = "P7D"
    dead_lettering_on_expiration = true
    max_delivery_count           = 10
    requires_session             = false
    requires_duplicate_detection = false
    lock_duration                = "PT1M"
    enable_batched_operations    = true
    enable_partitioning          = false
    enable_express               = false
  },
  {
    name                         = "dead-letter"
    max_message_size_kb          = 256
    max_size_mb                  = 2048 # 2 GB for dead letters
    default_message_ttl          = "P14D" # 14 days max for Basic SKU
    dead_lettering_on_expiration = false # Already dead lettered
    max_delivery_count           = 1
    requires_session             = false
    requires_duplicate_detection = false
    lock_duration                = "PT5M" # Longer for investigation
    enable_batched_operations    = true
    enable_partitioning          = false
    enable_express               = false
  }
]

# Topics and subscriptions (empty for dev, using queues for simplicity)
topics        = []
subscriptions = []
