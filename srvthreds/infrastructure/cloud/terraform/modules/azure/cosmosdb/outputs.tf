# CosmosDB Module Outputs

output "cosmosdb_id" {
  description = "The ID of the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.id
}

output "cosmosdb_endpoint" {
  description = "The endpoint used to connect to the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.endpoint
}

output "cosmosdb_connection_strings" {
  description = "CosmosDB MongoDB connection strings (primary and secondary)"
  value = {
    primary   = "mongodb://${azurerm_cosmosdb_account.main.name}:${azurerm_cosmosdb_account.main.primary_key}@${azurerm_cosmosdb_account.main.name}.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${azurerm_cosmosdb_account.main.name}@"
    secondary = "mongodb://${azurerm_cosmosdb_account.main.name}:${azurerm_cosmosdb_account.main.secondary_key}@${azurerm_cosmosdb_account.main.name}.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${azurerm_cosmosdb_account.main.name}@"
  }
  sensitive = true
}

output "cosmosdb_primary_connection_string" {
  description = "Primary MongoDB connection string (recommended for most use cases)"
  value       = "mongodb://${azurerm_cosmosdb_account.main.name}:${azurerm_cosmosdb_account.main.primary_key}@${azurerm_cosmosdb_account.main.name}.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@${azurerm_cosmosdb_account.main.name}@"
  sensitive   = true
}

output "cosmosdb_primary_key" {
  description = "Primary master key for the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.primary_key
  sensitive   = true
}

output "cosmosdb_secondary_key" {
  description = "Secondary master key for the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.secondary_key
  sensitive   = true
}

output "cosmosdb_primary_readonly_key" {
  description = "Primary readonly master key for the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.primary_readonly_key
  sensitive   = true
}

output "cosmosdb_secondary_readonly_key" {
  description = "Secondary readonly master key for the CosmosDB account"
  value       = azurerm_cosmosdb_account.main.secondary_readonly_key
  sensitive   = true
}

output "database_id" {
  description = "The ID of the MongoDB database"
  value       = azurerm_cosmosdb_mongo_database.main.id
}

output "database_name" {
  description = "The name of the MongoDB database"
  value       = azurerm_cosmosdb_mongo_database.main.name
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
