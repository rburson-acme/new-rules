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

variable "resource_group_name" {
  description = "Name of the resource group for networking resources"
  type        = string
}

variable "vnet_address_space" {
  description = "Address space for the virtual network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "gateway_subnet_prefix" {
  description = "Address prefix for Application Gateway subnet"
  type        = string
  default     = "10.0.0.0/24"
}

# Subnet Configuration - Good for dev/test
# gateway_subnet_prefix          = "10.0.0.0/24"   # 10.0.1.0 - 10.0.1.255 (251 IPs)
# aks_subnet_prefix              = "10.0.4.0/22"   # 10.0.2.0 - 10.0.5.255 (1,019 IPs) - Smaller!
# private_endpoint_subnet_prefix = "10.0.20.0/24"  # 10.0.20.0 - 10.0.20.255 (251 IPs)
# data_subnet_prefix             = "10.0.21.0/24"  # 10.0.21.0 - 10.0.21.255 (251 IPs)
# support_subnet_prefix          = "10.0.22.0/24"  # 10.0.22.0 - 10.0.22.255 (251 IPs)

# Good for production or higher volume
# gateway_subnet_prefix          = "10.0.0.0/24"   # 10.0.0.0 - 10.0.0.255 (251 IPs)
# aks_subnet_prefix              = "10.0.1.0/20"   # 10.0.1.0 - 10.0.16.255 (4,091 IPs)
# private_endpoint_subnet_prefix = "10.0.17.0/24"  # 10.0.17.0 - 10.0.17.255 (251 IPs)
# data_subnet_prefix             = "10.0.18.0/24"  # 10.0.18.0 - 10.0.18.255 (251 IPs)
# support_subnet_prefix          = "10.0.19.0/24"  # 10.0.19.0 - 10.0.19.255 (251 IPs)

variable "aks_subnet_prefix" {
  description = "Address prefix for AKS nodes subnet"
  type        = string
  default     = "10.0.4.0/22"
}

variable "private_endpoint_subnet_prefix" {
  description = "Address prefix for private endpoints subnet"
  type        = string
  default     = "10.0.20.0/24"
}

variable "data_subnet_prefix" {
  description = "Address prefix for database tier subnet"
  type        = string
  default     = "10.0.21.0/24"
}

variable "support_subnet_prefix" {
  description = "Address prefix for support/container instances subnet"
  type        = string
  default     = "10.0.22.0/24"
}

variable "enable_ddos_protection" {
  description = "Enable DDoS protection (expensive, recommended for prod only)"
  type        = bool
  default     = false
}

variable "enable_vnet_encryption" {
  description = "Enable VNet encryption for enhanced security"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
