# Redis Module Outputs

output "redis_id" {
  description = "The ID of the Redis cache"
  value       = azurerm_redis_cache.main.id
}

output "redis_name" {
  description = "The name of the Redis cache"
  value       = azurerm_redis_cache.main.name
}

output "redis_hostname" {
  description = "The hostname of the Redis cache"
  value       = azurerm_redis_cache.main.hostname
}

output "redis_ssl_port" {
  description = "The SSL port of the Redis cache"
  value       = azurerm_redis_cache.main.ssl_port
}

output "redis_port" {
  description = "The non-SSL port of the Redis cache"
  value       = azurerm_redis_cache.main.port
}

output "redis_primary_access_key" {
  description = "The primary access key for the Redis cache"
  value       = azurerm_redis_cache.main.primary_access_key
  sensitive   = true
}

output "redis_secondary_access_key" {
  description = "The secondary access key for the Redis cache"
  value       = azurerm_redis_cache.main.secondary_access_key
  sensitive   = true
}

output "redis_primary_connection_string" {
  description = "The primary connection string for the Redis cache"
  value       = azurerm_redis_cache.main.primary_connection_string
  sensitive   = true
}

output "redis_secondary_connection_string" {
  description = "The secondary connection string for the Redis cache"
  value       = azurerm_redis_cache.main.secondary_connection_string
  sensitive   = true
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_endpoint_id : null
}

output "private_ip_addresses" {
  description = "Private IP addresses of the private endpoint"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_ip_addresses : []
}

output "private_dns_zone_id" {
  description = "The ID of the private DNS zone"
  value       = var.enable_private_endpoint ? module.private_endpoint[0].private_dns_zone_id : null
}
