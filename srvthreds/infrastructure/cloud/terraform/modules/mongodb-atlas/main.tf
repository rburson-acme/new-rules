variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project_name" {
  description = "MongoDB Atlas project name"
  type        = string
}

variable "cluster_name" {
  description = "MongoDB Atlas cluster name"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID for peering"
  type        = string
}

variable "subnet_ids" {
  description = "Subnet IDs"
  type        = list(string)
}

# MongoDB Atlas Project
resource "mongodbatlas_project" "main" {
  name   = var.project_name
  org_id = var.mongodb_atlas_org_id
}

# MongoDB Atlas Cluster
resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = var.cluster_name

  # Provider settings
  provider_name               = "AWS"
  provider_region_name        = upper(replace(var.aws_region, "-", "_"))
  provider_instance_size_name = "M10"

  # Cluster configuration
  cluster_type                     = "REPLICASET"
  mongo_db_major_version          = "7.0"
  auto_scaling_disk_gb_enabled    = true
  auto_scaling_compute_enabled    = true
  auto_scaling_compute_scale_down_enabled = true

  # Backup configuration
  backup_enabled                 = true
  pit_enabled                   = true
  cloud_backup                  = true

  # Advanced configuration
  advanced_configuration {
    javascript_enabled                   = false
    minimum_enabled_tls_protocol        = "TLS1_2"
    no_table_scan                       = false
    oplog_size_mb                       = 2048
    sample_size_bi_connector            = 5000
    sample_refresh_interval_bi_connector = 300
  }

  tags {
    key   = "Environment"
    value = var.environment
  }

  tags {
    key   = "Project"
    value = "srvthreds"
  }
}

# Database user
resource "mongodbatlas_database_user" "main" {
  username           = "srvthreds-app"
  password           = random_password.mongodb_password.result
  project_id         = mongodbatlas_project.main.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "srvthreds"
  }

  roles {
    role_name     = "readWrite"
    database_name = "test"
  }

  roles {
    role_name     = "readWrite"
    database_name = "demo"
  }
}

# Random password for MongoDB user
resource "random_password" "mongodb_password" {
  length  = 32
  special = true
}

# Network access list (IP whitelist)
resource "mongodbatlas_project_ip_access_list" "main" {
  project_id = mongodbatlas_project.main.id
  cidr_block = "10.0.0.0/16" # VPC CIDR
  comment    = "VPC access for ${var.environment}"
}

# VPC Peering (optional, for enhanced security)
resource "mongodbatlas_network_peering" "main" {
  accepter_region_name   = var.aws_region
  project_id            = mongodbatlas_project.main.id
  container_id          = mongodbatlas_cluster.main.container_id
  provider_name         = "AWS"
  route_table_cidr_block = "10.0.0.0/16"
  vpc_id                = var.vpc_id
  aws_account_id        = data.aws_caller_identity.current.account_id
}

data "aws_caller_identity" "current" {}