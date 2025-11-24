# Development Environment Configuration for Key Vault Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Key Vault Configuration
sku_name                      = "standard"
enabled_for_disk_encryption   = true
enable_rbac_authorization     = true
purge_protection_enabled      = false # Dev can be deleted
public_network_access_enabled = true # Private endpoint only
