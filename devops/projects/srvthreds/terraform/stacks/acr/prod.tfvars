# Production Environment Configuration for ACR Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# ACR Configuration - Premium for production
sku                           = "Premium" # Premium for production features
public_network_access_enabled = false     # Private endpoint only
zone_redundancy_enabled       = true      # Enable for HA
encryption_enabled            = false     # Can enable if needed (requires customer-managed key)
retention_days                = 30        # Longer retention for production
trust_policy_enabled          = true      # Enable content trust
# Note: Quarantine policy must be configured via Azure Policy or ACR tasks

# Private Endpoint
enable_private_endpoint = true
