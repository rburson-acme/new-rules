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

  # Army naming: CAZ-APPNAME-ENV-REGION-NET-VNET
  vnet_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-NET-VNET"

  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Module      = "networking"
    }
  )
}

# Network Security Group for Gateway Subnet
resource "azurerm_network_security_group" "gateway" {
  name                = "${local.vnet_name}-gateway-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = local.common_tags

  # Allow HTTPS inbound from Internet
  security_rule {
    name                       = "AllowHTTPSInbound"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Allow HTTP inbound (for redirect to HTTPS)
  security_rule {
    name                       = "AllowHTTPInbound"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Allow Application Gateway infrastructure ports
  security_rule {
    name                       = "AllowGatewayManager"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "65200-65535"
    source_address_prefix      = "GatewayManager"
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Network Security Group for AKS Subnet
resource "azurerm_network_security_group" "aks" {
  name                = "${local.vnet_name}-aks-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = local.common_tags

  # Allow traffic from Application Gateway
  security_rule {
    name                       = "AllowFromGateway"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.gateway_subnet_prefix
    destination_address_prefix = "*"
  }

  # Allow AKS internal traffic
  security_rule {
    name                       = "AllowAKSInternal"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.aks_subnet_prefix
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Network Security Group for Private Endpoints
resource "azurerm_network_security_group" "private_endpoints" {
  name                = "${local.vnet_name}-pe-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = local.common_tags

  # Allow traffic from AKS subnet
  security_rule {
    name                       = "AllowFromAKS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.aks_subnet_prefix
    destination_address_prefix = "*"
  }

  # Allow traffic from support subnet
  security_rule {
    name                       = "AllowFromSupport"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.support_subnet_prefix
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Network Security Group for Data Subnet
resource "azurerm_network_security_group" "data" {
  name                = "${local.vnet_name}-data-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = local.common_tags

  # Allow traffic from private endpoint subnet only
  security_rule {
    name                       = "AllowFromPrivateEndpoints"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.private_endpoint_subnet_prefix
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Network Security Group for Support Subnet (Container Instances)
resource "azurerm_network_security_group" "support" {
  name                = "${local.vnet_name}-support-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name
  tags                = local.common_tags

  # Allow traffic from AKS subnet
  security_rule {
    name                       = "AllowFromAKS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = var.aks_subnet_prefix
    destination_address_prefix = "*"
  }

  # Deny all other inbound traffic
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = local.vnet_name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = [var.vnet_address_space]
  tags                = local.common_tags

  # Enable VNet encryption for enhanced security
  dynamic "encryption" {
    for_each = var.enable_vnet_encryption ? [1] : []
    content {
      enforcement = "AllowUnencrypted"
    }
  }
}

# Gateway Subnet for Application Gateway
resource "azurerm_subnet" "gateway" {
  name                 = "gateway-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.gateway_subnet_prefix]

  # Disable private endpoint network policies for Application Gateway
  private_endpoint_network_policies = "Disabled"
}

# AKS Subnet
resource "azurerm_subnet" "aks" {
  name                 = "aks-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.aks_subnet_prefix]

  private_endpoint_network_policies = "Disabled"
}

# Private Endpoint Subnet
resource "azurerm_subnet" "private_endpoints" {
  name                 = "private-endpoint-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.private_endpoint_subnet_prefix]

  # Enable private endpoint network policies for better security
  # Allows NSGs and route tables to apply to private endpoints
  private_endpoint_network_policies = "Enabled"
}

# Data Subnet
resource "azurerm_subnet" "data" {
  name                 = "data-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.data_subnet_prefix]

  private_endpoint_network_policies = "Disabled"
}

# Support Subnet for Container Instances
resource "azurerm_subnet" "support" {
  name                 = "support-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.support_subnet_prefix]

  # Delegate to Container Instances
  delegation {
    name = "aci-delegation"
    service_delegation {
      name = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action"
      ]
    }
  }

  private_endpoint_network_policies = "Disabled"
}

# Associate NSGs with Subnets
resource "azurerm_subnet_network_security_group_association" "gateway" {
  subnet_id                 = azurerm_subnet.gateway.id
  network_security_group_id = azurerm_network_security_group.gateway.id
}

resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}

resource "azurerm_subnet_network_security_group_association" "private_endpoints" {
  subnet_id                 = azurerm_subnet.private_endpoints.id
  network_security_group_id = azurerm_network_security_group.private_endpoints.id
}

resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.data.id
}

resource "azurerm_subnet_network_security_group_association" "support" {
  subnet_id                 = azurerm_subnet.support.id
  network_security_group_id = azurerm_network_security_group.support.id
}

# Log Analytics Workspace for Network Flow Logs (optional, can be created separately)
# Uncomment if you want network flow logs enabled
# resource "azurerm_log_analytics_workspace" "network" {
#   name                = "${local.vnet_name}-logs"
#   location            = var.location
#   resource_group_name = var.resource_group_name
#   sku                 = "PerGB2018"
#   retention_in_days   = 30
#   tags                = local.common_tags
# }
