# Development Environment Configuration for AKS Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# AKS Configuration - Small cluster for dev
kubernetes_version      = "1.33.5"
sku_tier                = "Free" # Free tier for dev
private_cluster_enabled = false  # Public for dev ease of access
private_dns_zone_id     = ""

# Default Node Pool - Minimal for dev
default_node_pool_node_count          = 2 # Small cluster
default_node_pool_vm_size             = "Standard_D2s_v3" # 2 vCPU, 8 GB RAM
default_node_pool_enable_auto_scaling = false # No autoscaling for dev
default_node_pool_min_count           = 1
default_node_pool_max_count           = 3
default_node_pool_max_pods            = 30
default_node_pool_os_disk_size_gb     = 128
default_node_pool_os_disk_type        = "Managed"
default_node_pool_zones               = null # No zone redundancy for dev

# Network Configuration
network_plugin = "azure"  # Azure CNI
network_policy = "azure"  # Azure Network Policy
dns_service_ip = "172.16.0.10" # Must be within service_cidr
service_cidr   = "172.16.0.0/16" # Service network
outbound_type  = "loadBalancer"

# Azure AD RBAC
enable_azure_ad_rbac   = false # Simplified for dev
enable_azure_rbac      = false
admin_group_object_ids = []

# Add-ons
enable_key_vault_secrets_provider   = true # Enable for secret management
key_vault_secrets_rotation_enabled  = true
key_vault_secrets_rotation_interval = "2m"
enable_oms_agent                    = false # No monitoring for dev
log_analytics_workspace_id          = ""
enable_http_application_routing     = false # Not recommended
enable_azure_policy                 = false # No policy enforcement for dev

# Maintenance
automatic_channel_upgrade = "patch" # Patch upgrades for dev

maintenance_window = null # No maintenance window for dev

# Additional Node Pools - None for dev
additional_node_pools = []
