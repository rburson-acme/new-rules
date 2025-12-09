# Development Environment Configuration for NGINX Ingress Controller

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "dev"

project_name = "srvthreds"
cost_center  = "engineering"

# NGINX Ingress Controller Configuration
nginx_ingress_chart_version = "4.8.3"

# Use public LoadBalancer for dev environment
use_internal_load_balancer = false

# WebSocket configuration - 1 hour timeout for long-lived connections
websocket_proxy_read_timeout = "3600"
websocket_proxy_send_timeout = "3600"

# Resource configuration - dev sizing
controller_cpu_request    = "100m"
controller_memory_request = "128Mi"
controller_cpu_limit      = "500m"
controller_memory_limit   = "512Mi"

# High availability - 2 replicas for dev
replica_count = 2

# Enable metrics for monitoring
enable_metrics = true

# No autoscaling in dev
enable_autoscaling = false

# Set as default ingress class
set_as_default_ingress_class = true
