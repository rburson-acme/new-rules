# Production Environment Configuration for Networking Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Create resource group (true for first stack deployment)
create_resource_group = true

# Network Configuration
vnet_address_space = "10.2.0.0/16"

# Subnet Configuration - Production scale with larger AKS subnet
gateway_subnet_prefix          = "10.2.0.0/24"   # 10.2.0.0 - 10.2.0.255 (251 IPs)
aks_subnet_prefix              = "10.2.1.0/20"   # 10.2.1.0 - 10.2.16.255 (4,091 IPs) - Large for production
private_endpoint_subnet_prefix = "10.2.17.0/24"  # 10.2.17.0 - 10.2.17.255 (251 IPs)
data_subnet_prefix             = "10.2.18.0/24"  # 10.2.18.0 - 10.2.18.255 (251 IPs)
support_subnet_prefix          = "10.2.19.0/24"  # 10.2.19.0 - 10.2.19.255 (251 IPs)

# Security Configuration
enable_ddos_protection = false # Enable if needed (adds significant cost)
enable_vnet_encryption = true
