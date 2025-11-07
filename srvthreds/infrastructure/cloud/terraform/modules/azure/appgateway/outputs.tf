# Application Gateway Module Outputs

output "application_gateway_id" {
  description = "The ID of the Application Gateway"
  value       = azurerm_application_gateway.main.id
}

output "application_gateway_name" {
  description = "The name of the Application Gateway"
  value       = azurerm_application_gateway.main.name
}

output "public_ip_address" {
  description = "The public IP address of the Application Gateway"
  value       = azurerm_public_ip.main.ip_address
}

output "public_ip_fqdn" {
  description = "The FQDN of the public IP (if configured)"
  value       = azurerm_public_ip.main.fqdn
}

output "backend_address_pool_id" {
  description = "The ID of the backend address pool"
  value       = tolist(azurerm_application_gateway.main.backend_address_pool)[0].id
}

output "waf_policy_id" {
  description = "The ID of the WAF policy (null if Standard_v2)"
  value       = length(azurerm_web_application_firewall_policy.main) > 0 ? azurerm_web_application_firewall_policy.main[0].id : null
}
