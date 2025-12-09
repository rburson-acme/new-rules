# Monitoring Stack Outputs

output "log_analytics_workspace_id" {
  description = "The ID of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_id
}

output "log_analytics_workspace_name" {
  description = "The name of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_name
}

output "log_analytics_workspace_primary_key" {
  description = "The primary key of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_primary_key
  sensitive   = true
}

output "log_analytics_workspace_workspace_id" {
  description = "The workspace ID of the Log Analytics workspace"
  value       = module.monitoring.log_analytics_workspace_workspace_id
}

output "application_insights_id" {
  description = "The ID of Application Insights"
  value       = module.monitoring.application_insights_id
}

output "application_insights_name" {
  description = "The name of Application Insights"
  value       = module.monitoring.application_insights_name
}

output "application_insights_instrumentation_key" {
  description = "The instrumentation key of Application Insights"
  value       = module.monitoring.application_insights_instrumentation_key
  sensitive   = true
}

output "application_insights_connection_string" {
  description = "The connection string of Application Insights"
  value       = module.monitoring.application_insights_connection_string
  sensitive   = true
}

output "application_insights_app_id" {
  description = "The app ID of Application Insights"
  value       = module.monitoring.application_insights_app_id
}

output "action_group_id" {
  description = "The ID of the action group (if created)"
  value       = module.monitoring.action_group_id
}
