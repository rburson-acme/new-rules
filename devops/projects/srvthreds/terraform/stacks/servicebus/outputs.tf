# Service Bus Stack Outputs

output "servicebus_id" {
  description = "The ID of the Service Bus namespace"
  value       = module.servicebus.servicebus_id
}

output "servicebus_name" {
  description = "The name of the Service Bus namespace"
  value       = module.servicebus.servicebus_name
}

output "servicebus_endpoint" {
  description = "The endpoint of the Service Bus namespace"
  value       = module.servicebus.servicebus_endpoint
}

output "servicebus_primary_connection_string" {
  description = "The primary connection string"
  value       = module.servicebus.servicebus_primary_connection_string
  sensitive   = true
}

output "queue_ids" {
  description = "Map of queue names to IDs"
  value       = module.servicebus.queue_ids
}

output "topic_ids" {
  description = "Map of topic names to IDs"
  value       = module.servicebus.topic_ids
}

output "private_endpoint_id" {
  description = "The ID of the private endpoint"
  value       = module.servicebus.private_endpoint_id
}

output "private_ip_addresses" {
  description = "Private IP addresses"
  value       = module.servicebus.private_ip_addresses
}
