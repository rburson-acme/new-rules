# NGINX Ingress Controller Stack
# Deploys NGINX Ingress Controller to AKS cluster

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }

  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
    key                  = "stacks/nginx-ingress/dev.tfstate"
  }
}

provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
  tenant_id       = var.tenant_id
}

# Local variables
locals {
  # Army NETCOM naming convention components
  caz      = "CAZ"
  app_name = "SRVTHREDS"
  env_code = var.environment == "dev" ? "D" : var.environment == "test" ? "T" : "P"
  region   = "E" # East US

  rg_name = "${local.caz}-${local.app_name}-${local.env_code}-${local.region}-RG"

  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    CostCenter  = var.cost_center
    ManagedBy   = "Terraform"
    Stack       = "nginx-ingress"
  }
}

# Import backend configuration
locals {
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
  }
  state_key_format = "stacks/%s/%s.tfstate"
}

# Reference AKS stack outputs
data "terraform_remote_state" "aks" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "aks", var.environment)
  })
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Get AKS cluster for Kubernetes/Helm provider configuration
data "azurerm_kubernetes_cluster" "aks" {
  name                = data.terraform_remote_state.aks.outputs.aks_name
  resource_group_name = local.rg_name
}

# Configure Kubernetes provider
provider "kubernetes" {
  host                   = data.azurerm_kubernetes_cluster.aks.kube_config.0.host
  client_certificate     = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.client_certificate)
  client_key             = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.client_key)
  cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.cluster_ca_certificate)
}

# Configure Helm provider
provider "helm" {
  kubernetes {
    host                   = data.azurerm_kubernetes_cluster.aks.kube_config.0.host
    client_certificate     = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.client_certificate)
    client_key             = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.client_key)
    cluster_ca_certificate = base64decode(data.azurerm_kubernetes_cluster.aks.kube_config.0.cluster_ca_certificate)
  }
}

# Create namespace for NGINX Ingress Controller
resource "kubernetes_namespace" "ingress_nginx" {
  metadata {
    name = "ingress-nginx"
    labels = {
      name        = "ingress-nginx"
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

# Deploy NGINX Ingress Controller via Helm
resource "helm_release" "nginx_ingress" {
  name       = "nginx-ingress"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = var.nginx_ingress_chart_version
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name

  # Azure-specific configuration for LoadBalancer
  set {
    name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-health-probe-request-path"
    value = "/healthz"
  }

  # Use internal LoadBalancer if specified
  dynamic "set" {
    for_each = var.use_internal_load_balancer ? [1] : []
    content {
      name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-internal"
      value = "true"
    }
  }

  # Specify subnet for internal LoadBalancer
  dynamic "set" {
    for_each = var.use_internal_load_balancer ? [1] : []
    content {
      name  = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/azure-load-balancer-internal-subnet"
      value = "aks-subnet"
    }
  }

  # WebSocket support configuration
  set {
    name  = "controller.config.proxy-read-timeout"
    value = var.websocket_proxy_read_timeout
  }

  set {
    name  = "controller.config.proxy-send-timeout"
    value = var.websocket_proxy_send_timeout
  }

  # Resource configuration
  set {
    name  = "controller.resources.requests.cpu"
    value = var.controller_cpu_request
  }

  set {
    name  = "controller.resources.requests.memory"
    value = var.controller_memory_request
  }

  set {
    name  = "controller.resources.limits.cpu"
    value = var.controller_cpu_limit
  }

  set {
    name  = "controller.resources.limits.memory"
    value = var.controller_memory_limit
  }

  # Replica count
  set {
    name  = "controller.replicaCount"
    value = var.replica_count
  }

  # Set externalTrafficPolicy to Local for proper health check routing
  # set {
  #   name  = "controller.service.externalTrafficPolicy"
  #   value = "Local"
  # }

  # Enable metrics
  set {
    name  = "controller.metrics.enabled"
    value = var.enable_metrics
  }

  # Autoscaling
  set {
    name  = "controller.autoscaling.enabled"
    value = var.enable_autoscaling
  }

  dynamic "set" {
    for_each = var.enable_autoscaling ? [1] : []
    content {
      name  = "controller.autoscaling.minReplicas"
      value = var.autoscaling_min_replicas
    }
  }

  dynamic "set" {
    for_each = var.enable_autoscaling ? [1] : []
    content {
      name  = "controller.autoscaling.maxReplicas"
      value = var.autoscaling_max_replicas
    }
  }

  # Ingress class name
  set {
    name  = "controller.ingressClassResource.name"
    value = "nginx"
  }

  set {
    name  = "controller.ingressClassResource.default"
    value = var.set_as_default_ingress_class
  }

  # Wait for deployment to complete
  wait    = true
  timeout = 600 # 10 minutes

  depends_on = [
    kubernetes_namespace.ingress_nginx
  ]
}

# Get the LoadBalancer IP after deployment
data "kubernetes_service" "nginx_ingress" {
  metadata {
    name      = "nginx-ingress-ingress-nginx-controller"
    namespace = kubernetes_namespace.ingress_nginx.metadata[0].name
  }

  depends_on = [
    helm_release.nginx_ingress
  ]
}
