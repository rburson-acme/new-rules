# Azure Application Gateway Module
# Creates Application Gateway v2 with WAF capabilities

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Naming convention: CAZ-SRVTHREDS-{ENV}-E-{FUNCTION}
  appgw_name    = upper("${var.environment == "dev" ? "caz-srvthreds-d-e-agw" : var.environment == "test" ? "caz-srvthreds-t-e-agw" : "caz-srvthreds-p-e-agw"}")
  public_ip_name = upper("${var.environment == "dev" ? "caz-srvthreds-d-e-agw-pip" : var.environment == "test" ? "caz-srvthreds-t-e-agw-pip" : "caz-srvthreds-p-e-agw-pip"}")
  waf_policy_name = upper("${var.environment == "dev" ? "caz-srvthreds-d-e-wafpolicy" : var.environment == "test" ? "caz-srvthreds-t-e-wafpolicy" : "caz-srvthreds-p-e-wafpolicy"}")

  # Backend pool and settings names
  backend_address_pool_name      = "${local.appgw_name}-beap"
  frontend_port_name             = "${local.appgw_name}-feport"
  frontend_ip_configuration_name = "${local.appgw_name}-feip"
  http_setting_name              = "${local.appgw_name}-be-htst"
  listener_name                  = "${local.appgw_name}-httplstn"
  request_routing_rule_name      = "${local.appgw_name}-rqrt"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    CostCenter  = var.cost_center
    Module      = "appgateway"
    Stack       = "appgateway"
  }
}

# Public IP for Application Gateway
resource "azurerm_public_ip" "main" {
  name                = local.public_ip_name
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  zones               = var.availability_zones

  tags = local.common_tags
}

# WAF Policy (only for WAF_v2 SKU)
resource "azurerm_web_application_firewall_policy" "main" {
  count               = var.sku_tier == "WAF_v2" ? 1 : 0
  name                = local.waf_policy_name
  location            = var.location
  resource_group_name = var.resource_group_name

  policy_settings {
    enabled                     = var.waf_enabled
    mode                        = var.waf_mode
    request_body_check          = true
    file_upload_limit_in_mb     = var.waf_file_upload_limit_mb
    max_request_body_size_in_kb = var.waf_max_request_body_size_kb
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = var.waf_rule_set_version
    }

    managed_rule_set {
      type    = "Microsoft_BotManagerRuleSet"
      version = "1.0"
    }
  }

  tags = local.common_tags
}

# Application Gateway
resource "azurerm_application_gateway" "main" {
  name                = local.appgw_name
  location            = var.location
  resource_group_name = var.resource_group_name
  zones               = var.availability_zones

  sku {
    name     = var.sku_name
    tier     = var.sku_tier
    capacity = var.capacity
  }

  # Enable autoscale if configured
  dynamic "autoscale_configuration" {
    for_each = var.enable_autoscale ? [1] : []
    content {
      min_capacity = var.autoscale_min_capacity
      max_capacity = var.autoscale_max_capacity
    }
  }

  gateway_ip_configuration {
    name      = "${local.appgw_name}-ip-config"
    subnet_id = var.gateway_subnet_id
  }

  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  frontend_ip_configuration {
    name                 = local.frontend_ip_configuration_name
    public_ip_address_id = azurerm_public_ip.main.id
  }

  backend_address_pool {
    name = local.backend_address_pool_name
    # Backend addresses will be configured separately
    fqdns = var.backend_fqdns
  }

  backend_http_settings {
    name                  = local.http_setting_name
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
    firewall_policy_id             = var.sku_tier == "WAF_v2" ? azurerm_web_application_firewall_policy.main[0].id : null
  }

  request_routing_rule {
    name                       = local.request_routing_rule_name
    rule_type                  = "Basic"
    http_listener_name         = local.listener_name
    backend_address_pool_name  = local.backend_address_pool_name
    backend_http_settings_name = local.http_setting_name
    priority                   = 100
  }

  # WAF configuration (only for WAF_v2)
  firewall_policy_id = var.sku_tier == "WAF_v2" ? azurerm_web_application_firewall_policy.main[0].id : null

  # SSL Policy - Use modern TLS 1.2+
  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101" # TLS 1.2+
  }

  tags = local.common_tags
}
