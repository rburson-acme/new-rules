# Terraform Bootstrap Infrastructure
# This creates the foundational resources needed for Terraform state management
# Run this ONCE manually, then use the remote backend for all other deployments

terraform {
  required_version = ">= 1.5"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  subscription_id = "f7fbbdc6-d360-49a8-9ceb-a4ba6ee415ed"
  tenant_id       = "0fbd63ce-fee7-4264-ae5d-4e9d725a9417"

  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

# Local variables
locals {
  project_name = "srvthreds"
  environment  = "shared" # Shared across all environments
  location     = var.location

  common_tags = {
    Project     = "SrvThreds"
    ManagedBy   = "Terraform"
    Environment = "Shared"
    Purpose     = "Terraform State Management"
    CostCenter  = "Infrastructure"
  }
}

# Random suffix for globally unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group for Terraform state
resource "azurerm_resource_group" "terraform" {
  name     = "${local.project_name}-terraform-rg"
  location = local.location
  tags     = local.common_tags
}

# Storage Account for Terraform state
# This must be globally unique across all of Azure
resource "azurerm_storage_account" "tfstate" {
  name                     = "${local.project_name}tfstate${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.terraform.name
  location                 = azurerm_resource_group.terraform.location
  account_tier             = "Standard"
  account_replication_type = "GRS" # Geo-redundant for safety

  # Security settings
  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = true # Required for Terraform backend

  # Public access configuration - deny for security
  public_network_access_enabled = true # Set to true initially for easier access

  # Enable blob features
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }

  tags = local.common_tags
}

# Storage Container for state files
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}

# Resource lock to prevent accidental deletion
resource "azurerm_management_lock" "tfstate" {
  name       = "prevent-deletion"
  scope      = azurerm_storage_account.tfstate.id
  lock_level = "CanNotDelete"
  notes      = "Prevents accidental deletion of Terraform state storage"
}

# Outputs for backend configuration
output "resource_group_name" {
  description = "Resource group name for Terraform state"
  value       = azurerm_resource_group.terraform.name
}

output "storage_account_name" {
  description = "Storage account name for Terraform state"
  value       = azurerm_storage_account.tfstate.name
}

output "container_name" {
  description = "Container name for Terraform state"
  value       = azurerm_storage_container.tfstate.name
}

output "subscription_id" {
  description = "Azure subscription ID"
  value       = data.azurerm_client_config.current.subscription_id
}

output "tenant_id" {
  description = "Azure tenant ID"
  value       = data.azurerm_client_config.current.tenant_id
}

output "backend_config" {
  description = "Backend configuration block for other Terraform projects"
  value       = <<-EOT

    Add this to your Terraform configuration:

    terraform {
      backend "azurerm" {
        resource_group_name  = "${azurerm_resource_group.terraform.name}"
        storage_account_name = "${azurerm_storage_account.tfstate.name}"
        container_name       = "${azurerm_storage_container.tfstate.name}"
        key                  = "your-environment.terraform.tfstate"
      }
    }

    Or use this command to initialize:

    terraform init \
      -backend-config="resource_group_name=${azurerm_resource_group.terraform.name}" \
      -backend-config="storage_account_name=${azurerm_storage_account.tfstate.name}" \
      -backend-config="container_name=${azurerm_storage_container.tfstate.name}" \
      -backend-config="key=your-environment.terraform.tfstate"
  EOT
}

# Data source for current Azure configuration
data "azurerm_client_config" "current" {}
