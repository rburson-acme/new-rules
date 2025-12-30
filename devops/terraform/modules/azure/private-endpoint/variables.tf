variable "location" {
  description = "Azure region for the private endpoint"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "private_endpoint_name" {
  description = "Name of the private endpoint (will be suffixed with -pe)"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet where private endpoint will be created"
  type        = string
}

variable "private_connection_resource_id" {
  description = "ID of the resource to create private endpoint for"
  type        = string
}

variable "subresource_names" {
  description = "List of subresource names (groupIds) for the private endpoint"
  type        = list(string)
}

variable "private_dns_zone_name" {
  description = "Name of the private DNS zone"
  type        = string
}

variable "vnet_id" {
  description = "ID of the VNet to link to private DNS zone"
  type        = string
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
