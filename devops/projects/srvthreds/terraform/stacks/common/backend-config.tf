# Shared Backend Configuration
# This file can be symlinked or copied into each stack directory

locals {
  # Backend storage configuration
  backend_config = {
    resource_group_name  = "srvthreds-terraform-rg"
    storage_account_name = "srvthredstfstated9jvee"
    container_name       = "tfstate"
  }

  # State file path pattern: stacks/{stack-name}/{environment}.tfstate
  state_key_pattern = "stacks/%s/%s.tfstate"

  # Helper function to generate state keys
  # Usage: format(local.state_key_pattern, "networking", var.environment)
}

# Example remote state data source pattern
# Copy this when you need to reference another stack:
#
# data "terraform_remote_state" "networking" {
#   backend = "azurerm"
#   config = merge(local.backend_config, {
#     key = format(local.state_key_pattern, "networking", var.environment)
#   })
# }
