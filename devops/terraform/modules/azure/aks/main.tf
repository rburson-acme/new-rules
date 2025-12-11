# Azure Kubernetes Service (AKS) Module
# Creates a private AKS cluster with managed identity and ACR integration

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  # Generate AKS cluster name following Army NETCOM naming convention
  # Format: CAZ-SRVTHREDS-{ENV}-E-AKS
  aks_name = "${var.environment == "dev" ? "CAZ-SRVTHREDS-D-E-AKS" : var.environment == "test" ? "CAZ-SRVTHREDS-T-E-AKS" : "CAZ-SRVTHREDS-P-E-AKS"}"

  common_tags = merge(
    var.tags,
    {
      Module      = "aks"
      Environment = var.environment
    }
  )
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = local.aks_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = lower(replace(local.aks_name, "_", "-"))
  kubernetes_version  = var.kubernetes_version

  # Private cluster
  private_cluster_enabled = var.private_cluster_enabled
  private_dns_zone_id     = var.private_cluster_enabled ? var.private_dns_zone_id : null

  # SKU tier (Free or Standard)
  sku_tier = var.sku_tier

  # Default node pool
  default_node_pool {
    name                = "default"
    node_count          = var.default_node_pool_node_count
    vm_size             = var.default_node_pool_vm_size
    vnet_subnet_id      = var.aks_subnet_id
    enable_auto_scaling = var.default_node_pool_enable_auto_scaling
    min_count           = var.default_node_pool_enable_auto_scaling ? var.default_node_pool_min_count : null
    max_count           = var.default_node_pool_enable_auto_scaling ? var.default_node_pool_max_count : null
    max_pods            = var.default_node_pool_max_pods
    os_disk_size_gb     = var.default_node_pool_os_disk_size_gb
    os_disk_type        = var.default_node_pool_os_disk_type
    zones               = var.default_node_pool_zones

    # Upgrade settings to prevent drift detection
    upgrade_settings {
      drain_timeout_in_minutes      = 0
      max_surge                     = "10%"
      node_soak_duration_in_minutes = 0
    }

    tags = local.common_tags
  }

  # System Assigned Managed Identity for cluster operations
  identity {
    type = "SystemAssigned"
  }

  # Enable OIDC issuer for Workload Identity
  oidc_issuer_enabled = var.enable_workload_identity

  # Enable Workload Identity
  workload_identity_enabled = var.enable_workload_identity

  # Network profile
  network_profile {
    network_plugin     = var.network_plugin
    network_policy     = var.network_policy
    dns_service_ip     = var.dns_service_ip
    service_cidr       = var.service_cidr
    load_balancer_sku  = "standard"
    outbound_type      = var.outbound_type
  }

  # Azure AD integration
  dynamic "azure_active_directory_role_based_access_control" {
    for_each = var.enable_azure_ad_rbac ? [1] : []
    content {
      managed                = true
      azure_rbac_enabled     = var.enable_azure_rbac
      admin_group_object_ids = var.admin_group_object_ids
    }
  }

  # Auto-upgrade channel
  automatic_channel_upgrade = var.automatic_channel_upgrade

  # Maintenance window
  dynamic "maintenance_window" {
    for_each = var.maintenance_window != null ? [var.maintenance_window] : []
    content {
      dynamic "allowed" {
        for_each = maintenance_window.value.allowed
        content {
          day   = allowed.value.day
          hours = allowed.value.hours
        }
      }
    }
  }

  # Key Vault secrets provider
  dynamic "key_vault_secrets_provider" {
    for_each = var.enable_key_vault_secrets_provider ? [1] : []
    content {
      secret_rotation_enabled  = var.key_vault_secrets_rotation_enabled
      secret_rotation_interval = var.key_vault_secrets_rotation_interval
    }
  }

  # Azure Monitor
  dynamic "oms_agent" {
    for_each = var.enable_oms_agent ? [1] : []
    content {
      log_analytics_workspace_id = var.log_analytics_workspace_id
    }
  }

  # HTTP application routing (not recommended for production)
  http_application_routing_enabled = var.enable_http_application_routing

  # Azure Policy
  azure_policy_enabled = var.enable_azure_policy

  tags = local.common_tags
}

# Role assignment for ACR pull
resource "azurerm_role_assignment" "acr_pull" {
  count                = var.acr_id != "" ? 1 : 0
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}

# Additional node pools
resource "azurerm_kubernetes_cluster_node_pool" "additional" {
  for_each = { for np in var.additional_node_pools : np.name => np }

  name                  = each.value.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size               = each.value.vm_size
  node_count            = each.value.node_count
  vnet_subnet_id        = var.aks_subnet_id

  enable_auto_scaling = each.value.enable_auto_scaling
  min_count           = each.value.enable_auto_scaling ? each.value.min_count : null
  max_count           = each.value.enable_auto_scaling ? each.value.max_count : null
  max_pods            = each.value.max_pods
  os_disk_size_gb     = each.value.os_disk_size_gb
  os_disk_type        = each.value.os_disk_type
  os_type             = each.value.os_type
  zones               = each.value.zones
  node_labels         = each.value.node_labels
  node_taints         = each.value.node_taints

  tags = local.common_tags
}

# =============================================================================
# Workload Identity for Application Pods
# =============================================================================

# User Assigned Identity for srvthreds workloads
resource "azurerm_user_assigned_identity" "workload" {
  count               = var.enable_workload_identity ? 1 : 0
  name                = "${local.aks_name}-workload-identity"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = local.common_tags
}

# Federated credential linking Kubernetes service account to Azure identity
resource "azurerm_federated_identity_credential" "workload" {
  count               = var.enable_workload_identity ? 1 : 0
  name                = "srvthreds-workload-federated"
  resource_group_name = var.resource_group_name
  parent_id           = azurerm_user_assigned_identity.workload[0].id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.main.oidc_issuer_url
  subject             = "system:serviceaccount:srvthreds:srvthreds-workload"
}
