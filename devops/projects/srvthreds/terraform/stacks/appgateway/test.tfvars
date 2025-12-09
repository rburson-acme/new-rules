# Test Environment Configuration for Application Gateway Stack

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"
location    = "eastus"

project_name = "srvthreds"
cost_center  = "engineering"

# Application Gateway SKU - WAF v2 for test
sku_name = "WAF_v2"
sku_tier = "WAF_v2"
capacity = 2 # Medium capacity for test

# Autoscaling - Enabled for test
enable_autoscale       = true
autoscale_min_capacity = 1
autoscale_max_capacity = 5

# Availability zones - None for test
availability_zones = null

# WAF Configuration - Detection mode for test
waf_enabled                  = true
waf_mode                     = "Detection" # Detection mode for testing
waf_rule_set_version         = "3.2"
waf_file_upload_limit_mb     = 100
waf_max_request_body_size_kb = 128

# Backend configuration - Will be configured when AKS ingress is ready
backend_fqdns = []
