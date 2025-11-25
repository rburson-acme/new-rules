output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.main.id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.main.vault_uri
}

output "private_endpoint_id" {
  description = "ID of the Key Vault private endpoint"
  value       = module.private_endpoint.private_endpoint_id
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone"
  value       = module.private_endpoint.private_dns_zone_id
}
