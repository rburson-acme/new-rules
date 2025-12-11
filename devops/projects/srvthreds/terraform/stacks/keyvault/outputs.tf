output "key_vault_id" {
  description = "ID of the Key Vault"
  value       = module.keyvault.key_vault_id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = module.keyvault.key_vault_name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = module.keyvault.key_vault_uri
}

output "private_endpoint_id" {
  description = "ID of the Key Vault private endpoint"
  value       = module.keyvault.private_endpoint_id
}

output "private_dns_zone_id" {
  description = "ID of the private DNS zone for Key Vault"
  value       = module.keyvault.private_dns_zone_id
}
