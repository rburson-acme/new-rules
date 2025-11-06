terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Army naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = upper(substr(var.environment, 0, 1))
  region   = "E"

  # Army naming: CAZ-APPNAME-ENV-REGION-ACR
  # Note: ACR names must be alphanumeric only (no hyphens)
  acr_name = lower(replace("${local.caz}${local.app_name}${local.env_code}${local.region}ACR", "-", ""))

  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Module      = "acr"
    }
  )
}

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = local.acr_name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku

  # Security settings
  admin_enabled                 = false # Use managed identity instead
  public_network_access_enabled = var.public_network_access_enabled

  # Network rule set for SKU Premium only
  dynamic "network_rule_set" {
    for_each = var.sku == "Premium" ? [1] : []
    content {
      default_action = "Deny"
    }
  }

  # Enable features for Premium SKU
  zone_redundancy_enabled = var.sku == "Premium" ? var.zone_redundancy_enabled : false

  # Encryption (Premium only)
  dynamic "encryption" {
    for_each = var.sku == "Premium" && var.encryption_enabled ? [1] : []
    content {
      enabled = true
    }
  }

  # Retention policy (Premium only)
  dynamic "retention_policy" {
    for_each = var.sku == "Premium" ? [1] : []
    content {
      days    = var.retention_days
      enabled = var.retention_days > 0
    }
  }

  # Trust policy (Premium only)
  dynamic "trust_policy" {
    for_each = var.sku == "Premium" && var.trust_policy_enabled ? [1] : []
    content {
      enabled = true
    }
  }

  # Note: Quarantine policy is not supported in the Terraform azurerm provider
  # It must be configured separately via Azure Policy or ACR tasks if needed

  tags = local.common_tags
}

# Private endpoint for ACR (if enabled)
module "private_endpoint" {
  count  = var.enable_private_endpoint ? 1 : 0
  source = "../private-endpoint"

  location                       = var.location
  resource_group_name            = var.resource_group_name
  private_endpoint_name          = local.acr_name
  subnet_id                      = var.private_endpoint_subnet_id
  private_connection_resource_id = azurerm_container_registry.main.id
  subresource_names              = ["registry"]
  private_dns_zone_name          = "privatelink.azurecr.io"
  vnet_id                        = var.vnet_id
  tags                           = local.common_tags
}
