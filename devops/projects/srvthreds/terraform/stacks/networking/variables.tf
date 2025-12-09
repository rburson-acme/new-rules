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

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "srvthreds"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
  default     = "engineering"
}

variable "create_resource_group" {
  description = "Whether to create a new resource group (true for first stack deployment)"
  type        = bool
  default     = true
}

variable "vnet_address_space" {
  description = "Address space for the VNet (CIDR notation)"
  type        = string
}

variable "gateway_subnet_prefix" {
  description = "Address prefix for gateway subnet"
  type        = string
}

variable "aks_subnet_prefix" {
  description = "Address prefix for AKS subnet"
  type        = string
}

variable "private_endpoint_subnet_prefix" {
  description = "Address prefix for private endpoint subnet"
  type        = string
}

variable "data_subnet_prefix" {
  description = "Address prefix for data subnet"
  type        = string
}

variable "support_subnet_prefix" {
  description = "Address prefix for support subnet"
  type        = string
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection (recommended for production)"
  type        = bool
  default     = false
}

variable "enable_vnet_encryption" {
  description = "Enable VNet encryption"
  type        = bool
  default     = true
}
