variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

variable "mongodb_atlas_public_key" {
  description = "MongoDB Atlas public key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_private_key" {
  description = "MongoDB Atlas private key"
  type        = string
  sensitive   = true
}

variable "mongodb_atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "redis_cloud_api_key" {
  description = "Redis Cloud API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "redis_cloud_secret_key" {
  description = "Redis Cloud secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "rabbitmq_cloud_api_key" {
  description = "RabbitMQ Cloud API key"
  type        = string
  sensitive   = true
  default     = ""
}