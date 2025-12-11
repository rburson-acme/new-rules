# Development Environment Configuration for Application Gateway Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Application Gateway SKU - Standard v2 for dev (no WAF for cost savings)
sku_name = "Standard_v2"
sku_tier = "Standard_v2"
capacity = 1 # Minimum capacity for dev

# Autoscaling - Disabled for dev
enable_autoscale       = false
autoscale_min_capacity = 1
autoscale_max_capacity = 2

# Availability zones - None for dev
availability_zones = null

# WAF Configuration - Disabled for dev (Standard_v2 doesn't support WAF)
waf_enabled                  = false
waf_mode                     = "Detection"
waf_rule_set_version         = "3.2"
waf_file_upload_limit_mb     = 100
waf_max_request_body_size_kb = 128

# Backend configuration - Empty for now, will be configured when AKS ingress is ready
backend_fqdns = []
