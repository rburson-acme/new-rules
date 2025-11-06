# Test Environment Configuration for ACR Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# ACR Configuration
sku                           = "Standard" # Basic, Standard, or Premium
public_network_access_enabled = false      # Private endpoint only
zone_redundancy_enabled       = false      # Premium only, not needed for test
encryption_enabled            = false      # Premium only, not needed for test
retention_days                = 7          # Days to retain untagged manifests
trust_policy_enabled          = false      # Premium only

# Private Endpoint
enable_private_endpoint = true
