# Production Environment Configuration for NGINX Ingress Controller

subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

environment = "prod"

project_name = "srvthreds"
cost_center  = "engineering"

# NGINX Ingress Controller Configuration
nginx_ingress_chart_version = "4.8.3"

# Use internal LoadBalancer for production (private cluster)
use_internal_load_balancer = true

# WebSocket configuration - 2 hour timeout for production
websocket_proxy_read_timeout = "7200"
websocket_proxy_send_timeout = "7200"

# Resource configuration - production sizing
controller_cpu_request    = "500m"
controller_memory_request = "512Mi"
controller_cpu_limit      = "2000m"
controller_memory_limit   = "2Gi"

# High availability - autoscaling enabled
replica_count      = 3
enable_autoscaling = true
autoscaling_min_replicas = 3
autoscaling_max_replicas = 10

# Enable metrics for monitoring
enable_metrics = true

# Set as default ingress class
set_as_default_ingress_class = true
