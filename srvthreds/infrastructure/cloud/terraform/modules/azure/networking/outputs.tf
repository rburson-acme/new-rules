output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.main.id
}

output "vnet_name" {
  description = "Name of the virtual network"
  value       = azurerm_virtual_network.main.name
}

output "gateway_subnet_id" {
  description = "ID of the Application Gateway subnet"
  value       = azurerm_subnet.gateway.id
}

output "aks_subnet_id" {
  description = "ID of the AKS subnet"
  value       = azurerm_subnet.aks.id
}

output "private_endpoint_subnet_id" {
  description = "ID of the private endpoint subnet"
  value       = azurerm_subnet.private_endpoints.id
}

output "data_subnet_id" {
  description = "ID of the data subnet"
  value       = azurerm_subnet.data.id
}

output "support_subnet_id" {
  description = "ID of the support subnet for container instances"
  value       = azurerm_subnet.support.id
}

output "nsg_gateway_id" {
  description = "ID of the gateway NSG"
  value       = azurerm_network_security_group.gateway.id
}

output "nsg_aks_id" {
  description = "ID of the AKS NSG"
  value       = azurerm_network_security_group.aks.id
}

output "nsg_private_endpoints_id" {
  description = "ID of the private endpoints NSG"
  value       = azurerm_network_security_group.private_endpoints.id
}

output "nsg_data_id" {
  description = "ID of the data NSG"
  value       = azurerm_network_security_group.data.id
}

output "nsg_support_id" {
  description = "ID of the support NSG"
  value       = azurerm_network_security_group.support.id
}
