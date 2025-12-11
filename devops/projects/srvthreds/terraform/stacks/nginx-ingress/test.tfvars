# Test Environment Configuration for NGINX Ingress Controller

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "test"

project_name = "srvthreds"
cost_center  = "engineering"

# NGINX Ingress Controller Configuration
nginx_ingress_chart_version = "4.8.3"

# Use internal LoadBalancer for test environment
use_internal_load_balancer = true

# WebSocket configuration - 1 hour timeout
websocket_proxy_read_timeout = "3600"
websocket_proxy_send_timeout = "3600"

# Resource configuration - test sizing (higher than dev)
controller_cpu_request    = "200m"
controller_memory_request = "256Mi"
controller_cpu_limit      = "1000m"
controller_memory_limit   = "1Gi"

# High availability - enable autoscaling
replica_count      = 2
enable_autoscaling = true
autoscaling_min_replicas = 2
autoscaling_max_replicas = 5

# Enable metrics for monitoring
enable_metrics = true

# Set as default ingress class
set_as_default_ingress_class = true
