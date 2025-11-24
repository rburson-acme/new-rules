output "resource_group_name" {
  description = "Name of the resource group"
  value       = local.rg_name
}

output "vnet_id" {
  description = "ID of the virtual network"
  value       = module.networking.vnet_id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = module.networking.vnet_name
}

output "gateway_subnet_id" {
  description = "ID of the gateway subnet"
  value       = module.networking.gateway_subnet_id
}

output "aks_subnet_id" {
  description = "ID of the AKS subnet"
  value       = module.networking.aks_subnet_id
}

output "private_endpoint_subnet_id" {
  description = "ID of the private endpoint subnet"
  value       = module.networking.private_endpoint_subnet_id
}

output "data_subnet_id" {
  description = "ID of the data subnet"
  value       = module.networking.data_subnet_id
}

output "support_subnet_id" {
  description = "ID of the support subnet"
  value       = module.networking.support_subnet_id
}

output "gateway_nsg_id" {
  description = "ID of the gateway NSG"
  value       = module.networking.nsg_gateway_id
}

output "aks_nsg_id" {
  description = "ID of the AKS NSG"
  value       = module.networking.nsg_aks_id
}

output "private_endpoint_nsg_id" {
  description = "ID of the private endpoint NSG"
  value       = module.networking.nsg_private_endpoints_id
}

output "data_nsg_id" {
  description = "ID of the data NSG"
  value       = module.networking.nsg_data_id
}

output "support_nsg_id" {
  description = "ID of the support NSG"
  value       = module.networking.nsg_support_id
}

