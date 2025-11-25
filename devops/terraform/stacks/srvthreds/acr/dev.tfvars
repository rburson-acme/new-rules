# Development Environment Configuration for ACR Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# ACR Configuration
sku                           = "Standard" # Basic, Standard, or Premium
public_network_access_enabled = true       # Standard/Basic require public access
zone_redundancy_enabled       = false      # Premium only
encryption_enabled            = false      # Premium only
retention_days                = 7          # Premium only (ignored for Standard)
trust_policy_enabled          = false      # Premium only

# Private Endpoint - Premium SKU only
enable_private_endpoint = false # Standard SKU does not support private endpoints (Premium required)
