# Test Environment Configuration for AKS Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# AKS Configuration - Medium cluster for test
kubernetes_version      = "1.33.5"
sku_tier                = "Free" # Free tier for test
private_cluster_enabled = false  # Public for test flexibility
private_dns_zone_id     = ""

# Default Node Pool - Medium for test
default_node_pool_node_count          = 3 # Medium cluster
default_node_pool_vm_size             = "Standard_D2s_v3" # 2 vCPU, 8 GB RAM
default_node_pool_enable_auto_scaling = true # Enable autoscaling for test
default_node_pool_min_count           = 2
default_node_pool_max_count           = 5
default_node_pool_max_pods            = 30
default_node_pool_os_disk_size_gb     = 128
default_node_pool_os_disk_type        = "Managed"
default_node_pool_zones               = null # No zone redundancy for test

# Network Configuration
network_plugin = "azure"
network_policy = "azure"
dns_service_ip = "172.17.0.10"
service_cidr   = "172.17.0.0/16"
outbound_type  = "loadBalancer"

# Azure AD RBAC
enable_azure_ad_rbac   = true # Enable for test
enable_azure_rbac      = true
admin_group_object_ids = []

# Add-ons
enable_key_vault_secrets_provider   = true
key_vault_secrets_rotation_enabled  = true
key_vault_secrets_rotation_interval = "2m"
enable_oms_agent                    = false # No monitoring for test
log_analytics_workspace_id          = ""
enable_http_application_routing     = false
enable_azure_policy                 = false

# Maintenance
automatic_channel_upgrade = "patch" # Auto-patch for test

maintenance_window = {
  allowed = [
    {
      day   = "Sunday"
      hours = [2, 3, 4]
    }
  ]
}

# Additional Node Pools - None for test
additional_node_pools = []
