# Redis Stack Outputs

output "redis_id" {
  description = "The ID of the Redis cache"
  value       = module.redis.redis_id
}

output "redis_name" {
  description = "The name of the Redis cache"
  value       = module.redis.redis_name
}

output "redis_hostname" {
  description = "The hostname of the Redis cache"
  value       = module.redis.redis_hostname
}

output "redis_ssl_port" {
  description = "The SSL port of the Redis cache"
  value       = module.redis.redis_ssl_port
}

output "redis_primary_connection_string" {
  description = "The primary connection string"
  value       = module.redis.redis_primary_connection_string
  sensitive   = true
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint"
  value       = module.redis.private_endpoint_id
}

output "private_ip_addresses" {
  description = "Private IP addresses"
  value       = module.redis.private_ip_addresses
}
