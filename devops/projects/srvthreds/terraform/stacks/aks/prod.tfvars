# Production Environment Configuration for AKS Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# AKS Configuration - Production cluster
kubernetes_version      = "1.33.5"
sku_tier                = "Standard" # Standard tier for production SLA
private_cluster_enabled = true       # Private cluster for security
private_dns_zone_id     = ""         # System-managed private DNS

# Default Node Pool - Production scale
default_node_pool_node_count          = 3 # Minimum 3 for HA
default_node_pool_vm_size             = "Standard_D4s_v3" # 4 vCPU, 16 GB RAM
default_node_pool_enable_auto_scaling = true
default_node_pool_min_count           = 3
default_node_pool_max_count           = 10
default_node_pool_max_pods            = 50
default_node_pool_os_disk_size_gb     = 256
default_node_pool_os_disk_type        = "Managed"
default_node_pool_zones               = ["1", "2", "3"] # Zone redundancy for HA

# Network Configuration
network_plugin = "azure"
network_policy = "azure"
dns_service_ip = "172.18.0.10"
service_cidr   = "172.18.0.0/16"
outbound_type  = "loadBalancer"

# Azure AD RBAC
enable_azure_ad_rbac   = true
enable_azure_rbac      = true
admin_group_object_ids = [] # Add production admin group IDs

# Add-ons
enable_key_vault_secrets_provider   = true
key_vault_secrets_rotation_enabled  = true
key_vault_secrets_rotation_interval = "2m"
enable_oms_agent                    = true # Enable monitoring for production
log_analytics_workspace_id          = ""   # Set via monitoring stack
enable_http_application_routing     = false
enable_azure_policy                 = true # Enable policy enforcement

# Maintenance
automatic_channel_upgrade = "stable" # Auto-upgrade to stable channel

maintenance_window = {
  allowed = [
    {
      day   = "Sunday"
      hours = [2, 3, 4, 5]
    }
  ]
}

# Additional Node Pools - Application-specific pools
additional_node_pools = []
# Example: Add workload-specific pools as needed
# additional_node_pools = [
#   {
#     name                = "workerpool"
#     vm_size             = "Standard_D4s_v3"
#     node_count          = 2
#     enable_auto_scaling = true
#     min_count           = 2
#     max_count           = 8
#     max_pods            = 50
#     os_disk_size_gb     = 256
#     os_disk_type        = "Managed"
#     os_type             = "Linux"
#     zones               = ["1", "2", "3"]
#     node_labels         = { "workload" = "srvthreds" }
#     node_taints         = []
#   }
# ]
