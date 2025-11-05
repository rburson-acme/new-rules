terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.0"
    }
  }

  backend "s3" {
    bucket         = "srvthreds-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "srvthreds-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

locals {
  environment = "prod"
  common_tags = {
    Environment = local.environment
    Project     = "srvthreds"
    ManagedBy   = "terraform"
  }
}

# Networking
module "networking" {
  source = "../../modules/networking"

  environment        = local.environment
  region            = var.aws_region
  availability_zones = var.availability_zones
}

# EKS Cluster
module "eks" {
  source = "../../modules/eks"

  environment             = local.environment
  cluster_name           = "srvthreds-${local.environment}"
  vpc_id                 = module.networking.vpc_id
  subnet_ids             = concat(module.networking.public_subnet_ids, module.networking.private_subnet_ids)
  node_group_subnet_ids  = module.networking.private_subnet_ids
}

# MongoDB Atlas
module "mongodb_atlas" {
  source = "../../modules/mongodb-atlas"

  environment           = local.environment
  project_name          = "srvthreds-${local.environment}"
  cluster_name          = "srvthreds-${local.environment}"
  aws_region            = var.aws_region
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.private_subnet_ids
  mongodb_atlas_org_id  = var.mongodb_atlas_org_id
}

# Redis Cloud (placeholder - you'll need to add this module)
# module "redis" {
#   source = "../../modules/redis"
#
#   environment = local.environment
#   vpc_id      = module.networking.vpc_id
#   subnet_ids  = module.networking.private_subnet_ids
# }

# RabbitMQ Cloud (placeholder - you'll need to add this module)
# module "rabbitmq" {
#   source = "../../modules/rabbitmq"
#
#   environment = local.environment
#   vpc_id      = module.networking.vpc_id
#   subnet_ids  = module.networking.private_subnet_ids
# }