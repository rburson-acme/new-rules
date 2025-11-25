output "acr_id" {
  description = "ID of the container registry"
  value       = azurerm_container_registry.main.id
}

output "acr_name" {
  description = "Name of the container registry"
  value       = azurerm_container_registry.main.name
}

output "acr_login_server" {
  description = "Login server URL for the container registry"
  value       = azurerm_container_registry.main.login_server
}

output "private_endpoint_id" {
  description = "ID of the private endpoint"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_endpoint_id : null
}

output "private_ip_addresses" {
  description = "Private IP addresses of the endpoint"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_ip_addresses : null
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_dns_zone_id : null
}
