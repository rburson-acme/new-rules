# Application Gateway Stack Outputs

output "application_gateway_id" {
  description = "The ID of the Application Gateway"
  value       = module.appgateway.application_gateway_id
}

output "application_gateway_name" {
  description = "The name of the Application Gateway"
  value       = module.appgateway.application_gateway_name
}

output "public_ip_address" {
  description = "The public IP address of the Application Gateway"
  value       = module.appgateway.public_ip_address
}

output "public_ip_fqdn" {
  description = "The FQDN of the public IP"
  value       = module.appgateway.public_ip_fqdn
}

output "backend_address_pool_id" {
  description = "The ID of the backend address pool"
  value       = module.appgateway.backend_address_pool_id
}

output "waf_policy_id" {
  description = "The ID of the WAF policy"
  value       = module.appgateway.waf_policy_id
}
