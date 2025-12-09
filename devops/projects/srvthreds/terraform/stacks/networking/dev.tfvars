# Development Environment Configuration for Networking Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Create resource group (true for first stack deployment)
create_resource_group = true

# Network Configuration
vnet_address_space = "10.0.0.0/16"

# Subnet Configuration
gateway_subnet_prefix          = "10.0.0.0/24"   # 10.0.1.0 - 10.0.1.255 (251 IPs)
aks_subnet_prefix              = "10.0.4.0/22"   # 10.0.2.0 - 10.0.5.255 (1,019 IPs) - Smaller!
private_endpoint_subnet_prefix = "10.0.20.0/24"  # 10.0.20.0 - 10.0.20.255 (251 IPs)
data_subnet_prefix             = "10.0.21.0/24"  # 10.0.21.0 - 10.0.21.255 (251 IPs)
support_subnet_prefix          = "10.0.22.0/24"  # 10.0.22.0 - 10.0.22.255 (251 IPs)

# Subnet Configuration - Good for prod
# gateway_subnet_prefix          = "10.0.0.0/24"   # 10.0.0.0 - 10.0.0.255 (251 IPs)
# aks_subnet_prefix              = "10.0.1.0/20"   # 10.0.1.0 - 10.0.16.255 (4,091 IPs)
# private_endpoint_subnet_prefix = "10.0.17.0/24"  # 10.0.17.0 - 10.0.17.255 (251 IPs)
# data_subnet_prefix             = "10.0.18.0/24"  # 10.0.18.0 - 10.0.18.255 (251 IPs)
# support_subnet_prefix          = "10.0.19.0/24"  # 10.0.19.0 - 10.0.19.255 (251 IPs)

# Security Configuration
enable_ddos_protection = false # Not needed for dev
enable_vnet_encryption = true
