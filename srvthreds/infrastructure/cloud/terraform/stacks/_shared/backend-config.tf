# Shared Backend Configuration
# This file provides centralized backend configuration for all stacks
#
# Usage in stacks:
#   1. Create a symbolic link to this file in your stack directory:
#      ln -s ../_shared/backend-config.tf ./backend-config.tf
#
#   2. Use the locals in your remote state references:
#      data "terraform_remote_state" "networking" {
#        backend = "azurerm"
#        config = merge(local.backend_config, {
#          key = format(local.state_key_format, "networking", var.environment)
#        })
#      }

locals {
  # Centralized backend storage configuration
  # SINGLE SOURCE OF TRUTH for all remote state references
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstatei274ht"
    container_name       = "tfstate"
  }

  # State file path format: stacks/{stack-name}/{environment}.tfstate
  state_key_format = "stacks/%s/%s.tfstate"

  # Helper function to build state keys
  # Usage: format(local.state_key_format, "networking", var.environment)
  # Result: "stacks/networking/dev.tfstate"
}
