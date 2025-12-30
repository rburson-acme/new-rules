# Variables for Terraform State Backend Setup

variable "subscription_id" {
  description = "Azure subscription ID for resource deployment"
  type        = string
  sensitive   = true
}

variable "tenant_id" {
  description = "Azure Active Directory tenant ID"
  type        = string
  sensitive   = true
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"

  validation {
    condition     = contains(["eastus", "eastus2", "westus2", "centralus"], var.location)
    error_message = "Location must be a valid Azure region"
  }
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production"
  }
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "srvthreds"

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.project_name))
    error_message = "Project name must be 3-24 lowercase alphanumeric characters"
  }
}
