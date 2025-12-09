output "resource_group_name" {
  description = "Name of the resource group"
  value       = local.rg_name
}

output "acr_id" {
  description = "ID of the container registry"
  value       = module.acr.acr_id
}

output "acr_name" {
  description = "Name of the container registry"
  value       = module.acr.acr_name
}

output "acr_login_server" {
  description = "Login server URL for the container registry"
  value       = module.acr.acr_login_server
}

output "private_endpoint_id" {
  description = "ID of the private endpoint"
  value       = module.acr.private_endpoint_id
}

output "private_ip_addresses" {
  description = "Private IP addresses of the endpoint"
  value       = module.acr.private_ip_addresses
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone"
  value       = module.acr.private_dns_zone_id
}
