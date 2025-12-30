# Service Bus Module Outputs

output "servicebus_id" {
  description = "The ID of the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.id
}

output "servicebus_name" {
  description = "The name of the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.name
}

output "servicebus_endpoint" {
  description = "The endpoint of the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.endpoint
}

output "servicebus_primary_connection_string" {
  description = "The primary connection string for the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "servicebus_secondary_connection_string" {
  description = "The secondary connection string for the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.default_secondary_connection_string
  sensitive   = true
}

output "servicebus_primary_key" {
  description = "The primary key for the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.default_primary_key
  sensitive   = true
}

output "servicebus_secondary_key" {
  description = "The secondary key for the Service Bus namespace"
  value       = azurerm_servicebus_namespace.main.default_secondary_key
  sensitive   = true
}

output "queue_ids" {
  description = "Map of queue names to their IDs"
  value       = { for name, queue in azurerm_servicebus_queue.queues : name => queue.id }
}

output "topic_ids" {
  description = "Map of topic names to their IDs"
  value       = { for name, topic in azurerm_servicebus_topic.topics : name => topic.id }
}

output "subscription_ids" {
  description = "Map of subscription keys to their IDs"
  value       = { for key, sub in azurerm_servicebus_subscription.subscriptions : key => sub.id }
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
