# Test Environment Configuration for Networking Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Create resource group (true for first stack deployment)
create_resource_group = true

# Network Configuration
vnet_address_space = "10.1.0.0/16"

# Subnet Configuration - Similar to dev, optimized for cost
gateway_subnet_prefix          = "10.1.0.0/24"   # 10.1.0.0 - 10.1.0.255 (251 IPs)
aks_subnet_prefix              = "10.1.4.0/22"   # 10.1.4.0 - 10.1.7.255 (1,019 IPs)
private_endpoint_subnet_prefix = "10.1.20.0/24"  # 10.1.20.0 - 10.1.20.255 (251 IPs)
data_subnet_prefix             = "10.1.21.0/24"  # 10.1.21.0 - 10.1.21.255 (251 IPs)
support_subnet_prefix          = "10.1.22.0/24"  # 10.1.22.0 - 10.1.22.255 (251 IPs)

# Security Configuration
enable_ddos_protection = false # Not needed for test
enable_vnet_encryption = true
