# Azure Application Gateway Module

Terraform module for creating a secure Azure Application Gateway v2 with Web Application Firewall (WAF), autoscaling, zone redundancy, and SSL termination for web applications.

## Overview

This module creates an Azure Application Gateway v2 following best practices:

- **Layer 7 load balancing** - HTTP/HTTPS traffic routing
- **Web Application Firewall (WAF)** - OWASP rule sets and bot protection
- **Autoscaling** - Dynamic capacity adjustment based on load
- **Zone redundancy** - High availability across availability zones
- **SSL termination** - Centralized certificate management
- **Path-based routing** - Route traffic based on URL paths
- **Multi-site hosting** - Host multiple websites on one gateway
- **URL rewrite** - Modify request/response URLs
- **Custom health probes** - Advanced backend health monitoring
- **End-to-end TLS** - Encrypt traffic to backend servers

## Architecture

```
                      Internet
                         │
                         ▼
         ┌───────────────────────────────┐
         │   Public IP (Standard)        │
         │   Static IP with DNS          │
         │   Zone Redundant (1,2,3)      │
         └───────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Application Gateway v2 (WAF)                    │
│                                                              │
│   Frontend:                                                  │
│   ├─ Public IP Configuration                                │
│   ├─ HTTP Listener (Port 80)                                │
│   └─ HTTPS Listener (Port 443) with SSL Cert               │
│                                                              │
│   WAF Policy:                                                │
│   ├─ OWASP 3.2 Rule Set                                     │
│   ├─ Bot Protection                                          │
│   ├─ Prevention Mode                                         │
│   └─ Custom Rules                                            │
│                                                              │
│   Routing Rules:                                             │
│   ├─ Rule 1: HTTP → HTTPS Redirect                          │
│   ├─ Rule 2: HTTPS → Backend Pool                           │
│   ├─ Path-based: /api/* → API Backend                       │
│   └─ Path-based: /app/* → App Backend                       │
│                                                              │
│   Backend Pools:                                             │
│   ├─ Pool 1: AKS Internal Load Balancer                     │
│   ├─ Pool 2: VM Scale Set                                   │
│   └─ Pool 3: App Service (FQDN)                             │
│                                                              │
│   Health Probes:                                             │
│   ├─ HTTP: /health (every 30s)                              │
│   └─ HTTPS: /api/health (every 30s)                         │
│                                                              │
│   Backend Settings:                                          │
│   ├─ Protocol: HTTP/HTTPS                                   │
│   ├─ Port: 80/443                                            │
│   ├─ Cookie Affinity: Enabled/Disabled                      │
│   └─ Request Timeout: 60s                                    │
│                                                              │
│   Autoscaling:                                               │
│   ├─ Min Capacity: 1                                         │
│   ├─ Max Capacity: 10                                        │
│   └─ Auto-scale based on metrics                            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                         VNet                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     Application Gateway Subnet (10.0.4.0/24)           │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │   Application Gateway Instances                   │  │ │
│  │  │   Zone 1: 10.0.4.4                                │  │ │
│  │  │   Zone 2: 10.0.4.5                                │  │ │
│  │  │   Zone 3: 10.0.4.6                                │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │     AKS Subnet (10.0.2.0/24)                           │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │   Backend Pods                                    │  │ │
│  │  │   Internal Load Balancer: 10.0.2.100             │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Application Gateway (Development)

```hcl
module "appgateway" {
  source = "../../modules/azure/appgateway"

  environment         = "dev"
  location            = "eastus"
  resource_group_name = "srvthreds-dev-rg"
  project_name        = "SrvThreds"
  cost_center         = "Platform"

  # Application Gateway subnet (must be dedicated)
  gateway_subnet_id = module.networking.subnet_ids["appgateway"]

  # Standard_v2 SKU (no WAF)
  sku_name = "Standard_v2"
  sku_tier = "Standard_v2"
  capacity = 2

  # Backend pool (empty for now, will be configured later)
  backend_fqdns = []

  tags = {
    Project = "SrvThreds"
    Owner   = "Platform Team"
  }
}
```

### Production with WAF and Autoscaling

```hcl
module "appgateway" {
  source = "../../modules/azure/appgateway"

  environment         = "prod"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  project_name        = "SrvThreds"
  cost_center         = "Platform"

  # Application Gateway subnet
  gateway_subnet_id = module.networking.subnet_ids["appgateway"]

  # WAF_v2 SKU
  sku_name = "WAF_v2"
  sku_tier = "WAF_v2"

  # Zone redundancy
  availability_zones = ["1", "2", "3"]

  # Autoscaling
  enable_autoscale        = true
  autoscale_min_capacity  = 1
  autoscale_max_capacity  = 10

  # WAF configuration
  waf_enabled                  = true
  waf_mode                     = "Prevention"
  waf_rule_set_version         = "3.2"
  waf_file_upload_limit_mb     = 100
  waf_max_request_body_size_kb = 128

  # Backend pool (AKS internal load balancer)
  backend_fqdns = [
    "10.0.2.100"  # AKS internal LB IP
  ]

  tags = {
    Project     = "SrvThreds"
    Environment = "Production"
    Criticality = "High"
    Owner       = "Platform Team"
  }
}
```

### With Multiple Backend Pools and Rules

```hcl
# Application Gateway
resource "azurerm_application_gateway" "custom" {
  name                = "CAZ-SRVTHREDS-P-E-AGW"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"
  zones               = ["1", "2", "3"]

  sku {
    name     = "WAF_v2"
    tier     = "WAF_v2"
  }

  autoscale_configuration {
    min_capacity = 1
    max_capacity = 10
  }

  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = module.networking.subnet_ids["appgateway"]
  }

  # Frontend IP
  frontend_ip_configuration {
    name                 = "public-frontend"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  # Frontend ports
  frontend_port {
    name = "http"
    port = 80
  }

  frontend_port {
    name = "https"
    port = 443
  }

  # Backend pools
  backend_address_pool {
    name  = "aks-backend"
    fqdns = ["10.0.2.100"]
  }

  backend_address_pool {
    name  = "appservice-backend"
    fqdns = ["srvthreds-api.azurewebsites.net"]
  }

  # Backend HTTP settings
  backend_http_settings {
    name                  = "http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  backend_http_settings {
    name                  = "https-settings"
    cookie_based_affinity = "Enabled"
    port                  = 443
    protocol              = "Https"
    request_timeout       = 60
    probe_name            = "https-probe"

    # For App Service backends
    pick_host_name_from_backend_address = true
  }

  # Health probes
  probe {
    name                                      = "http-probe"
    protocol                                  = "Http"
    path                                      = "/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = false
    host                                      = "10.0.2.100"
  }

  probe {
    name                                      = "https-probe"
    protocol                                  = "Https"
    path                                      = "/api/health"
    interval                                  = 30
    timeout                                   = 30
    unhealthy_threshold                       = 3
    pick_host_name_from_backend_http_settings = true
  }

  # HTTP listener
  http_listener {
    name                           = "http-listener"
    frontend_ip_configuration_name = "public-frontend"
    frontend_port_name             = "http"
    protocol                       = "Http"
  }

  # HTTPS listener (requires SSL certificate)
  http_listener {
    name                           = "https-listener"
    frontend_ip_configuration_name = "public-frontend"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "wildcard-cert"
    firewall_policy_id             = azurerm_web_application_firewall_policy.main.id
  }

  # SSL certificate (from Key Vault)
  ssl_certificate {
    name                = "wildcard-cert"
    key_vault_secret_id = azurerm_key_vault_certificate.wildcard.secret_id
  }

  # Redirect HTTP to HTTPS
  redirect_configuration {
    name                 = "http-to-https"
    redirect_type        = "Permanent"
    target_listener_name = "https-listener"
    include_path         = true
    include_query_string = true
  }

  # HTTP → HTTPS redirect rule
  request_routing_rule {
    name                        = "http-redirect"
    rule_type                   = "Basic"
    http_listener_name          = "http-listener"
    redirect_configuration_name = "http-to-https"
    priority                    = 100
  }

  # HTTPS → Backend rule
  request_routing_rule {
    name                       = "https-routing"
    rule_type                  = "PathBasedRouting"
    http_listener_name         = "https-listener"
    url_path_map_name          = "path-map"
    priority                   = 200
  }

  # Path-based routing
  url_path_map {
    name                               = "path-map"
    default_backend_address_pool_name  = "aks-backend"
    default_backend_http_settings_name = "http-settings"

    path_rule {
      name                       = "api-rule"
      paths                      = ["/api/*"]
      backend_address_pool_name  = "appservice-backend"
      backend_http_settings_name = "https-settings"
    }

    path_rule {
      name                       = "app-rule"
      paths                      = ["/app/*"]
      backend_address_pool_name  = "aks-backend"
      backend_http_settings_name = "http-settings"
    }
  }

  # WAF policy
  firewall_policy_id = azurerm_web_application_firewall_policy.main.id

  # SSL policy
  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  # Managed identity for Key Vault access
  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.appgw.id]
  }

  tags = {
    Project = "SrvThreds"
  }
}

# WAF Policy
resource "azurerm_web_application_firewall_policy" "main" {
  name                = "CAZ-SRVTHREDS-P-E-WAFPOLICY"
  location            = "eastus"
  resource_group_name = "srvthreds-prod-rg"

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    file_upload_limit_in_mb     = 100
    max_request_body_size_in_kb = 128
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"

      # Disable specific rules if needed
      rule_group_override {
        rule_group_name = "REQUEST-920-PROTOCOL-ENFORCEMENT"
        rule {
          id      = "920300"
          enabled = false
          action  = "Block"
        }
      }
    }

    managed_rule_set {
      type    = "Microsoft_BotManagerRuleSet"
      version = "1.0"
    }
  }

  # Custom rules
  custom_rules {
    name      = "RateLimitRule"
    priority  = 1
    rule_type = "RateLimitRule"

    match_conditions {
      match_variables {
        variable_name = "RemoteAddr"
      }
      operator           = "IPMatch"
      negation_condition = false
      match_values       = ["0.0.0.0/0"]
    }

    action = "Block"
    rate_limit_duration_in_minutes = 1
    rate_limit_threshold           = 100
  }

  tags = {
    Project = "SrvThreds"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| `environment` | Environment name (dev, test, prod) | `string` | n/a | yes |
| `location` | Azure region | `string` | n/a | yes |
| `resource_group_name` | Name of the resource group | `string` | n/a | yes |
| `project_name` | Project name for tagging | `string` | n/a | yes |
| `cost_center` | Cost center for tagging | `string` | n/a | yes |
| `gateway_subnet_id` | ID of the gateway subnet | `string` | n/a | yes |
| `sku_name` | Name of the Application Gateway SKU | `string` | `"WAF_v2"` | no |
| `sku_tier` | Tier of the Application Gateway SKU | `string` | `"WAF_v2"` | no |
| `capacity` | Number of Application Gateway instances (ignored if autoscale is enabled) | `number` | `2` | no |
| `enable_autoscale` | Enable autoscaling for Application Gateway | `bool` | `false` | no |
| `autoscale_min_capacity` | Minimum number of instances when autoscaling | `number` | `1` | no |
| `autoscale_max_capacity` | Maximum number of instances when autoscaling | `number` | `10` | no |
| `availability_zones` | Availability zones for zone redundancy | `list(string)` | `null` | no |
| `waf_enabled` | Enable WAF | `bool` | `true` | no |
| `waf_mode` | WAF mode (Detection or Prevention) | `string` | `"Prevention"` | no |
| `waf_rule_set_version` | OWASP rule set version | `string` | `"3.2"` | no |
| `waf_file_upload_limit_mb` | File upload limit in MB | `number` | `100` | no |
| `waf_max_request_body_size_kb` | Maximum request body size in KB | `number` | `128` | no |
| `backend_fqdns` | List of backend FQDNs | `list(string)` | `[]` | no |

## Outputs

| Name | Description |
|------|-------------|
| `application_gateway_id` | The ID of the Application Gateway |
| `application_gateway_name` | The name of the Application Gateway |
| `public_ip_address` | The public IP address of the Application Gateway |
| `public_ip_fqdn` | The FQDN of the public IP (if configured) |
| `backend_address_pool_id` | The ID of the backend address pool |
| `waf_policy_id` | The ID of the WAF policy (null if Standard_v2) |

## Security

### Web Application Firewall (WAF)

Enable WAF for protection against common web vulnerabilities:

```hcl
sku_tier    = "WAF_v2"
waf_enabled = true
waf_mode    = "Prevention"  # or "Detection"
```

**WAF Modes:**
- **Detection**: Logs threats but doesn't block
- **Prevention**: Actively blocks malicious requests

**Rule Sets:**
- **OWASP 3.2**: Protection against OWASP Top 10 vulnerabilities
- **Bot Manager**: Protection against malicious bots

### SSL/TLS Configuration

Use modern TLS policy:

```hcl
ssl_policy {
  policy_type = "Predefined"
  policy_name = "AppGwSslPolicy20220101"  # TLS 1.2+
}
```

SSL certificate from Key Vault:

```hcl
# Managed identity for Key Vault access
identity {
  type         = "UserAssigned"
  identity_ids = [azurerm_user_assigned_identity.appgw.id]
}

# SSL certificate
ssl_certificate {
  name                = "wildcard-cert"
  key_vault_secret_id = azurerm_key_vault_certificate.wildcard.secret_id
}

# Grant Key Vault access
resource "azurerm_role_assignment" "appgw_kv_secrets_user" {
  scope                = module.keyvault.key_vault_id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.appgw.principal_id
}
```

### Custom WAF Rules

Create custom rules for specific requirements:

```hcl
custom_rules {
  name      = "AllowOnlyUSRegion"
  priority  = 1
  rule_type = "MatchRule"

  match_conditions {
    match_variables {
      variable_name = "RemoteAddr"
    }
    operator           = "GeoMatch"
    negation_condition = true
    match_values       = ["US"]
  }

  action = "Block"
}
```

## High Availability

### Zone Redundancy

Deploy across availability zones:

```hcl
availability_zones = ["1", "2", "3"]
```

Benefits:
- 99.99% SLA
- Protection against datacenter failures
- No additional cost

### Autoscaling

Dynamic capacity adjustment:

```hcl
enable_autoscale       = true
autoscale_min_capacity = 1
autoscale_max_capacity = 10
```

Benefits:
- Cost optimization (scale down when idle)
- Automatic capacity during traffic spikes
- Better performance

## Backend Configuration

### Health Probes

Monitor backend health:

```hcl
probe {
  name                = "http-probe"
  protocol            = "Http"
  path                = "/health"
  interval            = 30
  timeout             = 30
  unhealthy_threshold = 3
  host                = "example.com"
}
```

### Connection Draining

Gracefully remove backends:

```hcl
backend_http_settings {
  name                           = "http-settings"
  connection_draining_timeout_in_sec = 60
}
```

### Session Affinity

Enable cookie-based affinity:

```hcl
backend_http_settings {
  name                  = "http-settings"
  cookie_based_affinity = "Enabled"
  affinity_cookie_name  = "ApplicationGatewayAffinity"
}
```

## Monitoring

### Metrics to Monitor

```bash
# View metrics
az monitor metrics list \
  --resource /subscriptions/{sub}/resourceGroups/srvthreds-prod-rg/providers/Microsoft.Network/applicationGateways/CAZ-SRVTHREDS-P-E-AGW \
  --metric "ApplicationGatewayTotalTime,BackendResponseStatus,HealthyHostCount"

# Set up alerts
az monitor metrics alert create \
  --name unhealthy-backend \
  --resource-group srvthreds-prod-rg \
  --scopes {appgw-id} \
  --condition "avg UnhealthyHostCount > 0" \
  --window-size 5m \
  --evaluation-frequency 1m
```

Key metrics:
- **HealthyHostCount**: Number of healthy backends
- **UnhealthyHostCount**: Number of unhealthy backends
- **ResponseStatus**: HTTP response status codes
- **TotalRequests**: Total request count
- **FailedRequests**: Failed request count
- **Throughput**: Bytes per second
- **BackendResponseTime**: Backend response latency

### Diagnostic Logs

```hcl
resource "azurerm_monitor_diagnostic_setting" "appgw" {
  name                       = "appgw-diagnostics"
  target_resource_id         = module.appgateway.application_gateway_id
  log_analytics_workspace_id = module.monitoring.workspace_id

  enabled_log {
    category = "ApplicationGatewayAccessLog"
  }

  enabled_log {
    category = "ApplicationGatewayPerformanceLog"
  }

  enabled_log {
    category = "ApplicationGatewayFirewallLog"
  }

  metric {
    category = "AllMetrics"
  }
}
```

## Troubleshooting

### Backend Health Issues

**Check backend health:**

```bash
# View backend health
az network application-gateway show-backend-health \
  --name CAZ-SRVTHREDS-P-E-AGW \
  --resource-group srvthreds-prod-rg
```

**Common issues:**
1. Health probe failing (check probe path and interval)
2. NSG blocking traffic from AppGW subnet
3. Backend timeout (increase request timeout)
4. Certificate mismatch (for HTTPS backends)

### 502 Bad Gateway Errors

**Possible causes:**
1. All backends unhealthy
2. Backend timeout
3. DNS resolution failure (for FQDN backends)
4. Certificate issues

**Solutions:**

```bash
# Check backend status
az network application-gateway show-backend-health \
  --name CAZ-SRVTHREDS-P-E-AGW \
  --resource-group srvthreds-prod-rg

# View application gateway logs
az monitor diagnostic-settings show \
  --resource {appgw-id} \
  --name appgw-diagnostics
```

### WAF Blocking Legitimate Traffic

**Check WAF logs:**

```bash
# View WAF logs in Log Analytics
az monitor log-analytics query \
  --workspace {workspace-id} \
  --analytics-query "AzureDiagnostics | where ResourceType == 'APPLICATIONGATEWAYS' and Category == 'ApplicationGatewayFirewallLog'"
```

**Solutions:**
1. Switch to Detection mode temporarily
2. Disable specific rules causing issues
3. Create custom exclusion rules

```hcl
# Disable specific rule
rule_group_override {
  rule_group_name = "REQUEST-920-PROTOCOL-ENFORCEMENT"
  rule {
    id      = "920300"
    enabled = false
  }
}
```

### SSL/TLS Issues

**Check SSL certificate:**

```bash
# Verify certificate is valid
openssl s_client -connect {public-ip}:443 -servername {hostname}
```

**Common issues:**
1. Certificate expired
2. Certificate chain incomplete
3. Key Vault access denied
4. Wrong SSL policy

## Cost Optimization

### Development Environment

```hcl
sku_name           = "Standard_v2"
sku_tier           = "Standard_v2"
capacity           = 1
enable_autoscale   = false
availability_zones = null
```

Estimated cost: ~$150/month

### Production Environment

```hcl
sku_name               = "WAF_v2"
sku_tier               = "WAF_v2"
enable_autoscale       = true
autoscale_min_capacity = 1
autoscale_max_capacity = 10
availability_zones     = ["1", "2", "3"]
```

Estimated cost: ~$300-500/month (varies with traffic)

### Cost Reduction Tips

1. **Use autoscaling** - Scale down to minimum capacity when idle
2. **Right-size capacity** - Monitor actual usage and adjust
3. **Use Standard_v2 for non-production** - No WAF cost
4. **Optimize health probes** - Longer intervals reduce cost slightly
5. **Review data transfer** - Minimize cross-region traffic
6. **Stop unused gateways** - Deallocate in development environments

## Best Practices

1. **Enable WAF in Prevention mode** - Active protection against threats
2. **Use autoscaling** - Automatic capacity adjustment
3. **Enable zone redundancy** - High availability (99.99% SLA)
4. **Configure health probes** - Accurate backend health monitoring
5. **Use HTTPS listeners** - Encrypt traffic end-to-end
6. **Implement HTTP to HTTPS redirect** - Force secure connections
7. **Monitor WAF logs** - Detect and respond to threats
8. **Use Key Vault for certificates** - Centralized certificate management
9. **Configure proper timeouts** - Match backend processing time
10. **Set up alerts** - Monitor unhealthy backends and errors

## References

- [Application Gateway Overview](https://learn.microsoft.com/en-us/azure/application-gateway/overview)
- [Application Gateway Features](https://learn.microsoft.com/en-us/azure/application-gateway/features)
- [Web Application Firewall (WAF)](https://learn.microsoft.com/en-us/azure/web-application-firewall/ag/ag-overview)
- [Autoscaling Application Gateway](https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-autoscaling-zone-redundant)
- [SSL Termination](https://learn.microsoft.com/en-us/azure/application-gateway/ssl-overview)
- [Backend Health Monitoring](https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-probe-overview)
- [Troubleshooting](https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-troubleshooting-502)
- [Best Practices](https://learn.microsoft.com/en-us/azure/application-gateway/application-gateway-best-practices)

---

**Module Version:** 1.0.0
**Last Updated:** 2025-01-11
**Terraform Version:** >= 1.5.0
**Azure Provider Version:** ~> 3.0
