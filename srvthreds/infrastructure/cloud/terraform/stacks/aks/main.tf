# AKS Stack - Azure Kubernetes Service
# Deploys private AKS cluster for SrvThreds application containers

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
    key                  = "stacks/aks/dev.tfstate"
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
    Stack       = "aks"
  }
}

# Reference networking stack outputs
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "networking", var.environment)
  })
}

# Reference ACR stack outputs
data "terraform_remote_state" "acr" {
  backend = "azurerm"
  config = merge(local.backend_config, {
    key = format(local.state_key_format, "acr", var.environment)
  })
}

# AKS Module
module "aks" {
  source = "../../modules/azure/aks"

  environment         = var.environment
  location            = var.location
  resource_group_name = local.rg_name

  # Cluster configuration
  kubernetes_version       = var.kubernetes_version
  sku_tier                 = var.sku_tier
  private_cluster_enabled  = var.private_cluster_enabled
  private_dns_zone_id      = var.private_dns_zone_id

  # Default node pool
  default_node_pool_node_count          = var.default_node_pool_node_count
  default_node_pool_vm_size             = var.default_node_pool_vm_size
  default_node_pool_enable_auto_scaling = var.default_node_pool_enable_auto_scaling
  default_node_pool_min_count           = var.default_node_pool_min_count
  default_node_pool_max_count           = var.default_node_pool_max_count
  default_node_pool_max_pods            = var.default_node_pool_max_pods
  default_node_pool_os_disk_size_gb     = var.default_node_pool_os_disk_size_gb
  default_node_pool_os_disk_type        = var.default_node_pool_os_disk_type
  default_node_pool_zones               = var.default_node_pool_zones

  # Network configuration
  aks_subnet_id   = data.terraform_remote_state.networking.outputs.aks_subnet_id
  network_plugin  = var.network_plugin
  network_policy  = var.network_policy
  dns_service_ip  = var.dns_service_ip
  service_cidr    = var.service_cidr
  outbound_type   = var.outbound_type

  # Azure AD RBAC
  enable_azure_ad_rbac     = var.enable_azure_ad_rbac
  enable_azure_rbac        = var.enable_azure_rbac
  admin_group_object_ids   = var.admin_group_object_ids

  # ACR integration
  acr_id = data.terraform_remote_state.acr.outputs.acr_id

  # Add-ons
  enable_key_vault_secrets_provider    = var.enable_key_vault_secrets_provider
  key_vault_secrets_rotation_enabled   = var.key_vault_secrets_rotation_enabled
  key_vault_secrets_rotation_interval  = var.key_vault_secrets_rotation_interval
  enable_oms_agent                     = var.enable_oms_agent
  log_analytics_workspace_id           = var.log_analytics_workspace_id
  enable_http_application_routing      = var.enable_http_application_routing
  enable_azure_policy                  = var.enable_azure_policy

  # Maintenance
  automatic_channel_upgrade = var.automatic_channel_upgrade
  maintenance_window        = var.maintenance_window

  # Additional node pools
  additional_node_pools = var.additional_node_pools

  tags = local.common_tags
}
