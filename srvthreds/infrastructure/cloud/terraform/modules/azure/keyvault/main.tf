terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

data "azurerm_client_config" "current" {}

locals {
  # Army naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))
  region   = "E"

  # Army naming: CAZ-APPNAME-ENV-REGION-KEY-FUNCTION (max 24 chars for Key Vault)
  # CAZ-SRVTHREDS-D-E-KEY = 21 chars (within limit)
  kv_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-KEY"

  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Module      = "keyvault"
    }
  )
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                       = local.kv_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = var.sku_name
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.purge_protection_enabled
  tags                       = local.common_tags

  # Enable features
  enabled_for_deployment          = var.enabled_for_deployment
  enabled_for_disk_encryption     = var.enabled_for_disk_encryption
  enabled_for_template_deployment = var.enabled_for_template_deployment
  enable_rbac_authorization       = var.enable_rbac_authorization

  # Public network access
  public_network_access_enabled = var.public_network_access_enabled

  # Network ACLs - deny by default
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"
    ip_rules       = []
  }
}

# Private Endpoint for Key Vault
module "private_endpoint" {
  source = "../private-endpoint"

  location                       = var.location
  resource_group_name            = var.resource_group_name
  private_endpoint_name          = azurerm_key_vault.main.name
  subnet_id                      = var.subnet_id
  private_connection_resource_id = azurerm_key_vault.main.id
  subresource_names              = ["vault"]
  private_dns_zone_name          = "privatelink.vaultcore.azure.net"
  vnet_id                        = var.vnet_id
  tags                           = local.common_tags
}
