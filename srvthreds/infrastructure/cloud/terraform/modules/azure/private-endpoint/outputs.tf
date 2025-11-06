output "private_endpoint_id" {
  description = "ID of the private endpoint"
  value       = azurerm_private_endpoint.main.id
}

output "private_endpoint_name" {
  description = "Name of the private endpoint"
  value       = azurerm_private_endpoint.main.name
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone"
  value       = azurerm_private_dns_zone.main.id
}

output "private_dns_zone_name" {
  description = "Name of the private DNS zone"
  value       = azurerm_private_dns_zone.main.name
}

output "private_ip_addresses" {
  description = "Private IP addresses of the private endpoint"
  value       = azurerm_private_endpoint.main.private_service_connection[0].private_ip_address
}
