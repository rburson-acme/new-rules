variable "environment" {
  description = "Environment name (dev, test, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be dev, test, or prod"
  }
}

variable "location" {
  description = "Azure region for resources"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "sku" {
  description = "SKU for ACR (Basic, Standard, Premium)"
  type        = string
  default     = "Standard"
  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "SKU must be Basic, Standard, or Premium"
  }
}

variable "public_network_access_enabled" {
  description = "Enable public network access (disable for private endpoint only)"
  type        = bool
  default     = false
}

variable "zone_redundancy_enabled" {
  description = "Enable zone redundancy (Premium SKU only)"
  type        = bool
  default     = false
}

variable "encryption_enabled" {
  description = "Enable encryption (Premium SKU only)"
  type        = bool
  default     = false
}

variable "retention_days" {
  description = "Number of days to retain untagged manifests (0 to disable, Premium SKU only)"
  type        = number
  default     = 7
}

variable "trust_policy_enabled" {
  description = "Enable content trust policy (Premium SKU only)"
  type        = bool
  default     = false
}

# Note: quarantine_policy is not supported in Terraform azurerm provider
# Configure via Azure Policy or ACR tasks if needed

variable "enable_private_endpoint" {
  description = "Create a private endpoint for ACR"
  type        = bool
  default     = true
}

variable "private_endpoint_subnet_id" {
  description = "Subnet ID for private endpoint"
  type        = string
  default     = ""
}

variable "vnet_id" {
  description = "Virtual network ID for private DNS zone"
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
