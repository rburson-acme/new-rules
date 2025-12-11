# Test Environment Configuration for Service Bus Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Service Bus SKU - Standard for test (partitioning, topics)
sku            = "Standard"
capacity       = 1     # N/A for Standard
zone_redundant = false # Premium only

# Security
minimum_tls_version           = "1.2"
local_auth_enabled            = true
public_network_access_enabled = true

# Private Endpoint - Not available on Standard SKU
enable_private_endpoint = false # Premium required

# Queues with Standard features
queues = [
  {
    name                         = "inbound-events"
    max_message_size_kb          = 256 # Standard max
    max_size_mb                  = 2048 # 2 GB
    default_message_ttl          = "P14D" # 14 days
    dead_lettering_on_expiration = true
    max_delivery_count           = 10
    requires_session             = false
    requires_duplicate_detection = true # Enable for test
    duplicate_detection_window   = "PT10M"
    lock_duration                = "PT1M"
    enable_batched_operations    = true
    enable_partitioning          = true # Available on Standard
    enable_express               = false # Can enable for in-memory
  },
  {
    name                         = "outbound-messages"
    max_message_size_kb          = 256
    max_size_mb                  = 2048
    default_message_ttl          = "P14D"
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
    max_message_size_kb          = 256
    max_size_mb                  = 4096 # 4 GB
    default_message_ttl          = "P30D"
    dead_lettering_on_expiration = false
    max_delivery_count           = 1
    requires_session             = false
    requires_duplicate_detection = false
    lock_duration                = "PT5M"
    enable_batched_operations    = true
    enable_partitioning          = false # Keep dead letter simple
    enable_express               = false
  }
]

# Topics and subscriptions for pub/sub testing
topics = []
subscriptions = []
