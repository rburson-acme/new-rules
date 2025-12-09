# CosmosDB Stack Outputs

output "cosmosdb_id" {
  description = "The ID of the CosmosDB account"
  value       = module.cosmosdb.cosmosdb_id
}

output "cosmosdb_endpoint" {
  description = "The endpoint used to connect to the CosmosDB account"
  value       = module.cosmosdb.cosmosdb_endpoint
}

output "cosmosdb_connection_strings" {
  description = "CosmosDB connection strings (primary and secondary)"
  value       = module.cosmosdb.cosmosdb_connection_strings
  sensitive   = true
}

output "cosmosdb_primary_connection_string" {
  description = "Primary MongoDB connection string (recommended for most use cases)"
  value       = module.cosmosdb.cosmosdb_primary_connection_string
  sensitive   = true
}

output "database_name" {
  description = "The name of the MongoDB database"
  value       = module.cosmosdb.database_name
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint"
  value       = module.cosmosdb.private_endpoint_id
}

output "private_ip_addresses" {
  description = "Private IP addresses of the private endpoint"
  value       = module.cosmosdb.private_ip_addresses
}
