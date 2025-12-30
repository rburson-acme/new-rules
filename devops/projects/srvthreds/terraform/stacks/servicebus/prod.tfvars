# Production Environment Configuration for Service Bus Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Service Bus SKU - Premium for production (private endpoint, large messages, HA)
sku            = "Premium"
capacity       = 1           # 1 messaging unit
zone_redundant = true        # Zone redundancy for HA

# Security
minimum_tls_version           = "1.2"
local_auth_enabled            = true # Keep SAS for initial setup, migrate to managed identity
public_network_access_enabled = false # Private endpoint only

# Private Endpoint - Enabled for production
enable_private_endpoint = true

# Queues with Premium features
queues = [
  {
    name                         = "inbound-events"
    max_message_size_kb          = 1024 # Premium allows up to 100 MB
    max_size_mb                  = 5120  # 5 GB
    default_message_ttl          = "P30D" # 30 days
    dead_lettering_on_expiration = true
    max_delivery_count           = 10
    requires_session             = false
    requires_duplicate_detection = true
    duplicate_detection_window   = "PT10M"
    lock_duration                = "PT1M"
    enable_batched_operations    = true
    enable_partitioning          = true # Premium supports partitioning
    enable_express               = false # Premium doesn't support express
  },
  {
    name                         = "outbound-messages"
    max_message_size_kb          = 1024
    max_size_mb                  = 5120
    default_message_ttl          = "P30D"
    dead_lettering_on_expiration = true
    max_delivery_count           = 10
    requires_session             = false
    requires_duplicate_detection = true
    duplicate_detection_window   = "PT10M"
    lock_duration                = "PT1M"
    enable_batched_operations    = true
    enable_partitioning          = true
    enable_express               = false
  },
  {
    name                         = "dead-letter"
    max_message_size_kb          = 1024
    max_size_mb                  = 10240 # 10 GB for dead letters
    default_message_ttl          = "P90D" # 90 days retention for investigation
    dead_lettering_on_expiration = false
    max_delivery_count           = 1
    requires_session             = false
    requires_duplicate_detection = false
    lock_duration                = "PT10M" # Longer for production investigation
    enable_batched_operations    = true
    enable_partitioning          = false
    enable_express               = false
  }
]

# Topics and subscriptions for production pub/sub patterns
topics = []
subscriptions = []
