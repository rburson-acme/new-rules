variable "subscription_id" {
  description = "Azure subscription ID"
  type        = string
}

variable "tenant_id" {
  description = "Azure tenant ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod"
  }
}

variable "project_name" {
  description = "Project name for resource tagging"
  type        = string
  default     = "srvthreds"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

# NGINX Ingress Controller Configuration

variable "nginx_ingress_chart_version" {
  description = "Version of NGINX Ingress Controller Helm chart"
  type        = string
  default     = "4.8.3" # Latest stable as of Nov 2024
}

variable "use_internal_load_balancer" {
  description = "Use internal LoadBalancer instead of public (for private cluster access)"
  type        = bool
  default     = false
}

variable "websocket_proxy_read_timeout" {
  description = "Proxy read timeout for WebSocket connections (seconds)"
  type        = string
  default     = "3600" # 1 hour
}

variable "websocket_proxy_send_timeout" {
  description = "Proxy send timeout for WebSocket connections (seconds)"
  type        = string
  default     = "3600" # 1 hour
}

variable "controller_cpu_request" {
  description = "CPU request for ingress controller"
  type        = string
  default     = "100m"
}

variable "controller_memory_request" {
  description = "Memory request for ingress controller"
  type        = string
  default     = "128Mi"
}

variable "controller_cpu_limit" {
  description = "CPU limit for ingress controller"
  type        = string
  default     = "500m"
}

variable "controller_memory_limit" {
  description = "Memory limit for ingress controller"
  type        = string
  default     = "512Mi"
}

variable "replica_count" {
  description = "Number of ingress controller replicas (ignored if autoscaling is enabled)"
  type        = number
  default     = 2
}

variable "enable_metrics" {
  description = "Enable Prometheus metrics"
  type        = bool
  default     = true
}

variable "enable_autoscaling" {
  description = "Enable horizontal pod autoscaling"
  type        = bool
  default     = false
}

variable "autoscaling_min_replicas" {
  description = "Minimum number of replicas when autoscaling"
  type        = number
  default     = 2
}

variable "autoscaling_max_replicas" {
  description = "Maximum number of replicas when autoscaling"
  type        = number
  default     = 10
}

variable "set_as_default_ingress_class" {
  description = "Set NGINX as the default ingress class"
  type        = bool
  default     = true
}
