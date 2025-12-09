# Production Environment Configuration for Application Gateway Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Application Gateway SKU - WAF v2 for production
sku_name = "WAF_v2"
sku_tier = "WAF_v2"
capacity = 3 # Initial capacity

# Autoscaling - Enabled for production
enable_autoscale       = true
autoscale_min_capacity = 2 # Minimum 2 for HA
autoscale_max_capacity = 10

# Availability zones - Zone redundancy for production
availability_zones = ["1", "2", "3"]

# WAF Configuration - Prevention mode for production
waf_enabled                  = true
waf_mode                     = "Prevention" # Prevention mode for production
waf_rule_set_version         = "3.2"
waf_file_upload_limit_mb     = 500 # Higher limit for production
waf_max_request_body_size_kb = 256 # Higher limit for production

# Backend configuration - Will be configured when AKS ingress is ready
backend_fqdns = []
