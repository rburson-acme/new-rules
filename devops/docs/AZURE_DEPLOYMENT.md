# Azure Deployment Guide

Comprehensive guide for deploying applications to Azure using Terraform and Azure Kubernetes Service (AKS).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Azure Setup](#azure-setup)
- [Terraform Infrastructure](#terraform-infrastructure)
- [AKS Deployment](#aks-deployment)
- [Configuration Management](#configuration-management)
- [Operations](#operations)
- [Security](#security)
- [Monitoring](#monitoring)
- [Cost Optimization](#cost-optimization)
- [Troubleshooting](#troubleshooting)

## Overview

The Azure deployment platform provides:

- **Infrastructure as Code** (Terraform) for Azure resources
- **Automated deployments** to AKS clusters
- **Multi-environment support** (dev, test, prod)
- **Security best practices** (Key Vault, private endpoints, NSGs)
- **Scalability** with auto-scaling and load balancing

### Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Azure Subscription                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Resource Group: CAZ-SRVTHREDS-{D|T|P}-E-RG             │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Virtual Network (VNet)                            │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐              │ │  │
│  │  │  │ AKS Subnet   │  │  DB Subnet   │              │ │  │
│  │  │  └──────────────┘  └──────────────┘              │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Azure Kubernetes Service (AKS)                    │ │  │
│  │  │  ┌──────────────────────────────────────────────┐ │ │  │
│  │  │  │  Namespace: srvthreds                        │ │ │  │
│  │  │  │                                              │ │ │  │
│  │  │  │  ┌────────┐  ┌────────┐  ┌──────────┐      │ │ │  │
│  │  │  │  │ Engine │  │Session │  │Persistence│      │ │ │  │
│  │  │  │  │  Pods  │  │  Pods  │  │   Pods    │      │ │ │  │
│  │  │  │  └────────┘  └────────┘  └──────────┘      │ │ │  │
│  │  │  │                                              │ │ │  │
│  │  │  │  ┌──────────────────────────────────┐       │ │ │  │
│  │  │  │  │  Load Balancer (Public IP)       │       │ │ │  │
│  │  │  │  └──────────────────────────────────┘       │ │ │  │
│  │  │  └──────────────────────────────────────────────┘ │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Azure Container Registry (ACR)                    │ │  │
│  │  │  - Docker images for all services                  │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Managed Databases                                 │ │  │
│  │  │  ┌──────────────┐  ┌──────────────┐              │ │  │
│  │  │  │  Cosmos DB   │  │ Azure Redis  │              │ │  │
│  │  │  │  (MongoDB)   │  │    Cache     │              │ │  │
│  │  │  └──────────────┘  └──────────────┘              │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  Azure Key Vault                                   │ │  │
│  │  │  - Secrets, keys, certificates                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                          │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │  RabbitMQ VM (or VM Scale Set)                     │ │  │
│  │  │  - Message broker for inter-service communication  │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Terraform State Storage Account                         │  │
│  │  - Blob container for state files                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Resource Naming Convention

Following Army NETCOM standards:

```
CAZ-SRVTHREDS-{D|T|P}-E-{ResourceType}

CAZ = Central Arizona (datacenter location)
D/T/P = Development/Test/Production
E = East US region
ResourceType = Resource type abbreviation (RG, AKS, ACR, etc.)
```

**Examples:**
- Resource Group: `CAZ-SRVTHREDS-D-E-RG`
- AKS Cluster: `CAZ-SRVTHREDS-D-E-AKS`
- ACR: `cazsrvthredsdeacr` (lowercase, no hyphens)
- Key Vault: `CAZ-SRVTHREDS-D-E-KV`

## Prerequisites

### Required Tools

1. **Azure CLI** (v2.50+)
   ```bash
   # Install
   brew install azure-cli  # macOS
   # Or download from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

   # Verify
   az --version
   ```

2. **Terraform** (v1.5+)
   ```bash
   # Install
   brew install terraform  # macOS
   # Or download from https://www.terraform.io/downloads

   # Verify
   terraform --version
   ```

3. **kubectl** (v1.26+)
   ```bash
   # Install
   brew install kubectl  # macOS

   # Verify
   kubectl version --client
   ```

4. **Docker Desktop**
   ```bash
   # Install from https://www.docker.com/products/docker-desktop

   # Verify
   docker --version
   ```

5. **Node.js** (v18+)
   ```bash
   # Install
   brew install node  # macOS

   # Verify
   node --version
   npm --version
   ```

### Azure Account Setup

1. **Azure Subscription**
   - Active Azure subscription
   - Appropriate permissions (Contributor or Owner)
   - Sufficient quota for resources

2. **Service Principal (Optional)**
   ```bash
   # Create service principal for automation
   az ad sp create-for-rbac --name "srvthreds-terraform" --role="Contributor" \
     --scopes="/subscriptions/{subscription-id}"

   # Save output (appId, password, tenant)
   ```

3. **Resource Quotas**
   - Verify sufficient quota for:
     - vCPUs (minimum 12 for dev)
     - Public IPs
     - Load Balancers
     - Storage accounts

## Azure Setup

### Initial Configuration

```bash
# Navigate to devops directory
cd devops

# Install dependencies
npm install

# Login to Azure
az login

# Set subscription (if you have multiple)
az account set --subscription "<subscription-id-or-name>"

# Verify account
az account show
```

### Bootstrap Terraform State Backend

**One-time setup per subscription:**

```bash
# Create state backend resources
npm run tf:bootstrap

# This creates:
# - Resource group: terraform-state-rg
# - Storage account: terraformstate<random>
# - Blob container: tfstate
```

**Manual bootstrap (if needed):**

```bash
# Set variables
RESOURCE_GROUP="terraform-state-rg"
STORAGE_ACCOUNT="terraformstate$RANDOM"
CONTAINER="tfstate"
LOCATION="eastus"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create storage account
az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --sku Standard_LRS \
  --encryption-services blob \
  --location $LOCATION

# Create blob container
az storage container create \
  --name $CONTAINER \
  --account-name $STORAGE_ACCOUNT
```

## Terraform Infrastructure

### Directory Structure

```
cloud/terraform/
├── modules/              # Reusable modules
│   ├── networking/
│   ├── aks/
│   ├── acr/
│   ├── keyvault/
│   ├── cosmosdb/
│   ├── redis/
│   └── rabbitmq/
└── stacks/              # Environment stacks
    ├── dev/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── outputs.tf
    │   └── terraform.tfvars
    ├── test/
    └── prod/
```

### Terraform Workflow

#### 1. Initialize

Initialize Terraform for an environment:

```bash
# Initialize dev environment
npm run tf:init -- dev

# What this does:
# - Downloads provider plugins
# - Configures remote state backend
# - Initializes modules
```

#### 2. Plan

Preview infrastructure changes:

```bash
# Plan all stacks
npm run tf:plan -- dev

# Plan specific stacks
npm run tf:plan -- dev networking aks

# Save plan to file
npm run terraform -- plan dev --out=dev.tfplan
```

**Review the plan carefully:**
- Green `+` = Resource will be created
- Yellow `~` = Resource will be modified
- Red `-` = Resource will be destroyed

#### 3. Apply

Deploy infrastructure:

```bash
# Apply all stacks
npm run tf:apply -- dev

# Apply specific stacks
npm run tf:apply -- dev networking aks

# Auto-approve (use with caution)
npm run terraform -- deploy dev --auto-approve
```

**Deployment order:**
1. Networking (VNet, subnets, NSGs)
2. Key Vault (for secrets)
3. ACR (for Docker images)
4. Cosmos DB (MongoDB)
5. Redis Cache
6. RabbitMQ VM
7. AKS cluster

#### 4. Verify

Check deployment status:

```bash
# Check Terraform status
npm run tf:status -- dev

# Check Azure resources
az resource list --resource-group CAZ-SRVTHREDS-D-E-RG --output table

# Get outputs
npm run terraform -- output dev
```

### Infrastructure Components

#### Networking Module

Creates:
- Virtual Network (VNet)
- Subnets (AKS, databases, application gateway)
- Network Security Groups (NSGs)
- Route tables

**Configuration:**
```hcl
module "networking" {
  source = "../../modules/networking"

  resource_group_name = var.resource_group_name
  location           = var.location
  environment        = var.environment

  vnet_address_space = ["10.0.0.0/16"]

  subnets = {
    aks = {
      address_prefixes = ["10.0.1.0/24"]
    }
    databases = {
      address_prefixes = ["10.0.2.0/24"]
    }
  }
}
```

#### AKS Module

Creates:
- AKS cluster
- Node pools (system and user)
- Managed identity
- Azure AD integration (optional)

**Configuration:**
```hcl
module "aks" {
  source = "../../modules/aks"

  cluster_name        = var.aks_cluster_name
  resource_group_name = var.resource_group_name
  location           = var.location

  kubernetes_version = "1.27"

  default_node_pool = {
    name            = "system"
    node_count      = 3
    vm_size         = "Standard_D2s_v3"
    os_disk_size_gb = 30
  }

  network_profile = {
    network_plugin = "azure"
    network_policy = "calico"
  }
}
```

#### ACR Module

Creates:
- Azure Container Registry
- Admin access (for dev)
- Geo-replication (for prod)

**Configuration:**
```hcl
module "acr" {
  source = "../../modules/acr"

  name                = var.acr_name
  resource_group_name = var.resource_group_name
  location           = var.location

  sku                = "Standard"  # Basic, Standard, Premium
  admin_enabled      = true        # For dev, false for prod

  # Premium only
  # georeplications = ["westus2"]
}
```

#### Cosmos DB Module

Creates:
- Cosmos DB account (MongoDB API)
- Database
- Collections
- Private endpoint (optional)

**Configuration:**
```hcl
module "cosmosdb" {
  source = "../../modules/cosmosdb"

  account_name        = var.cosmosdb_account_name
  resource_group_name = var.resource_group_name
  location           = var.location

  offer_type = "Standard"
  kind       = "MongoDB"

  consistency_policy = {
    consistency_level = "Session"
  }

  capabilities = ["EnableMongo"]

  # Backup policy
  backup = {
    type                = "Periodic"
    interval_in_minutes = 240
    retention_in_hours  = 720
  }
}
```

#### Redis Cache Module

Creates:
- Azure Cache for Redis
- Private endpoint
- Firewall rules

**Configuration:**
```hcl
module "redis" {
  source = "../../modules/redis"

  name                = var.redis_name
  resource_group_name = var.resource_group_name
  location           = var.location

  capacity = 1              # 0-6 (scaling)
  family   = "C"            # C = Basic/Standard, P = Premium
  sku_name = "Standard"     # Basic, Standard, Premium

  enable_non_ssl_port = false
  minimum_tls_version = "1.2"
}
```

#### Key Vault Module

Creates:
- Azure Key Vault
- Secrets
- Access policies

**Configuration:**
```hcl
module "keyvault" {
  source = "../../modules/keyvault"

  name                = var.keyvault_name
  resource_group_name = var.resource_group_name
  location           = var.location

  sku_name = "standard"

  access_policies = [
    {
      object_id = data.azurerm_client_config.current.object_id

      secret_permissions = [
        "Get", "List", "Set", "Delete"
      ]
    }
  ]
}
```

### Environment-Specific Configuration

#### Development

**Characteristics:**
- Lower-tier resources (cost-optimized)
- Single-region deployment
- Minimal redundancy
- Relaxed security policies

**Example terraform.tfvars:**
```hcl
environment = "dev"
location    = "eastus"

# AKS
aks_node_count = 1
aks_vm_size    = "Standard_D2s_v3"

# Cosmos DB
cosmosdb_consistency_level = "Session"
cosmosdb_backup_enabled    = true

# Redis
redis_sku  = "Standard"
redis_size = 1

# Key Vault
keyvault_sku = "standard"
```

#### Test/Staging

**Characteristics:**
- Mid-tier resources
- Production-like configuration
- Basic redundancy
- Enhanced monitoring

**Example terraform.tfvars:**
```hcl
environment = "test"
location    = "eastus"

# AKS
aks_node_count = 2
aks_vm_size    = "Standard_D4s_v3"

# Cosmos DB
cosmosdb_consistency_level = "BoundedStaleness"
cosmosdb_backup_enabled    = true

# Redis
redis_sku  = "Standard"
redis_size = 2

# Key Vault
keyvault_sku = "standard"
```

#### Production

**Characteristics:**
- Production-grade resources
- Multi-region deployment
- High availability
- Strict security policies
- Comprehensive monitoring

**Example terraform.tfvars:**
```hcl
environment = "prod"
location    = "eastus"

# AKS
aks_node_count         = 3
aks_vm_size            = "Standard_D8s_v3"
aks_auto_scaling       = true
aks_min_count          = 3
aks_max_count          = 10

# Cosmos DB
cosmosdb_consistency_level = "Strong"
cosmosdb_backup_enabled    = true
cosmosdb_geo_redundancy    = true

# Redis
redis_sku  = "Premium"
redis_size = 3
redis_zones = ["1", "2", "3"]

# Key Vault
keyvault_sku = "premium"
keyvault_purge_protection = true
```

## AKS Deployment

### Build and Push Images

```bash
# Build images for Azure (linux/amd64)
npm run k8s -- aks deploy dev --dry-run

# Actual deployment (builds and pushes)
npm run aks:deploy -- dev
```

**What happens:**
1. Builds images for linux/amd64 platform
2. Tags images for ACR
3. Logs into ACR
4. Pushes all images
5. Applies Kubernetes manifests
6. Waits for deployments to be ready
7. Validates deployment

### Deployment Process

#### 1. Pre-deployment Checks

```bash
# The deployer automatically:
# - Verifies Azure CLI and authentication
# - Checks AKS cluster exists
# - Gets AKS credentials
# - Verifies ACR access
# - Ensures namespace exists
```

#### 2. Build Images

```bash
# Images built for linux/amd64
# Multi-stage builds for optimization
# Tagged with environment tag (dev, test, prod)
```

#### 3. Push to ACR

```bash
# Login to ACR
az acr login --name cazsrvthredsdeacr

# Push all service images
docker push cazsrvthredsdeacr.azurecr.io/srvthreds/engine:dev
docker push cazsrvthredsdeacr.azurecr.io/srvthreds/session-agent:dev
docker push cazsrvthredsdeacr.azurecr.io/srvthreds/persistence-agent:dev
```

#### 4. Apply Manifests

```bash
# Apply Kustomize manifests
kubectl apply -k cloud/kubernetes/srvthreds/dev/

# Uses server-side apply for better conflict resolution
```

#### 5. Wait for Readiness

```bash
# Monitor deployment rollout
kubectl rollout status deployment/srvthreds-engine -n srvthreds

# Check pod status
kubectl get pods -n srvthreds
```

#### 6. Validation

```bash
# Check deployment health
npm run aks:status -- dev

# View services
kubectl get svc -n srvthreds

# Get external IPs
kubectl get svc -n srvthreds -o wide
```

### Accessing Services

#### Via LoadBalancer

```bash
# Get external IP
kubectl get svc srvthreds-session-agent-service -n srvthreds

# Access service
curl http://<external-ip>:3000/health
```

#### Via Port Forward

```bash
# Forward to localhost
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000

# Access locally
curl http://localhost:3000/health
```

#### Via Ingress (if configured)

```bash
# Get ingress address
kubectl get ingress -n srvthreds

# Access via hostname
curl https://srvthreds.example.com
```

## Configuration Management

### Environment Variables

Managed via Kubernetes ConfigMaps and Secrets:

```yaml
# ConfigMap for non-sensitive config
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  MONGO_HOST: "srvthreds-cosmosdb.mongo.cosmos.azure.com"
  REDIS_HOST: "srvthreds-redis.redis.cache.windows.net"
```

```yaml
# Secret for sensitive data
apiVersion: v1
kind: Secret
metadata:
  name: srvthreds-secrets
  namespace: srvthreds
type: Opaque
data:
  MONGO_CONNECTION_STRING: <base64-encoded>
  REDIS_PASSWORD: <base64-encoded>
```

### Secrets from Key Vault

Use Azure Key Vault provider for secrets:

```yaml
# SecretProviderClass
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault
  namespace: srvthreds
spec:
  provider: azure
  parameters:
    usePodIdentity: "true"
    keyvaultName: "CAZ-SRVTHREDS-D-E-KV"
    objects: |
      array:
        - |
          objectName: mongo-connection-string
          objectType: secret
        - |
          objectName: redis-password
          objectType: secret
```

### Kustomize Overlays

Environment-specific configuration:

```yaml
# dev/kustomization.yaml
bases:
  - ../base

configMapGenerator:
  - name: srvthreds-config
    behavior: merge
    literals:
      - NODE_ENV=development
      - LOG_LEVEL=debug

replicas:
  - name: srvthreds-engine
    count: 1
```

## Operations

### Deployment Management

```bash
# Deploy to environment
npm run aks:deploy -- dev

# Check status
npm run aks:status -- dev

# Redeploy with new images
npm run aks:deploy -- dev

# Rollback deployment
kubectl rollout undo deployment/srvthreds-engine -n srvthreds

# View rollout history
kubectl rollout history deployment/srvthreds-engine -n srvthreds
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment srvthreds-engine --replicas=5 -n srvthreds

# Horizontal Pod Autoscaler
kubectl autoscale deployment srvthreds-engine \
  --min=2 --max=10 --cpu-percent=80 -n srvthreds

# Check HPA status
kubectl get hpa -n srvthreds

# Scale AKS nodes
az aks scale --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS --node-count 5
```

### Updates

```bash
# Update image tag
kubectl set image deployment/srvthreds-engine \
  engine=cazsrvthredsdeacr.azurecr.io/srvthreds/engine:v2.0 \
  -n srvthreds

# Rolling update
kubectl rollout status deployment/srvthreds-engine -n srvthreds

# Pause rollout (if issues)
kubectl rollout pause deployment/srvthreds-engine -n srvthreds

# Resume rollout
kubectl rollout resume deployment/srvthreds-engine -n srvthreds
```

### Logs

```bash
# View logs
kubectl logs -n srvthreds -l app=srvthreds-engine

# Stream logs
kubectl logs -n srvthreds -l app=srvthreds-engine -f

# Previous container logs
kubectl logs -n srvthreds <pod-name> --previous

# Azure Log Analytics (if configured)
az monitor log-analytics query \
  --workspace <workspace-id> \
  --analytics-query "ContainerLog | where Namespace == 'srvthreds' | limit 100"
```

### Monitoring

```bash
# Resource usage
kubectl top nodes
kubectl top pods -n srvthreds

# Events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Azure Monitor metrics
az monitor metrics list \
  --resource <aks-resource-id> \
  --metric "node_cpu_usage_percentage"
```

## Security

### Network Security

```bash
# Network policies (Calico)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-internal
  namespace: srvthreds
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: srvthreds
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: srvthreds
```

### RBAC

```yaml
# Role for application
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: srvthreds-role
  namespace: srvthreds
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
```

### Pod Security

```yaml
# Security context
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true
```

### Secrets Management

**Best practices:**
- Store secrets in Azure Key Vault
- Use managed identities
- Rotate secrets regularly
- Never commit secrets to Git

```bash
# Store secret in Key Vault
az keyvault secret set \
  --vault-name CAZ-SRVTHREDS-D-E-KV \
  --name mongo-connection-string \
  --value "<connection-string>"

# Grant AKS access
az keyvault set-policy \
  --name CAZ-SRVTHREDS-D-E-KV \
  --object-id <aks-identity-object-id> \
  --secret-permissions get list
```

## Monitoring

### Azure Monitor

```bash
# Enable Container Insights
az aks enable-addons \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --addons monitoring
```

### Application Insights

```bash
# Create Application Insights
az monitor app-insights component create \
  --app srvthreds-insights \
  --location eastus \
  --resource-group CAZ-SRVTHREDS-D-E-RG

# Get instrumentation key
az monitor app-insights component show \
  --app srvthreds-insights \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --query instrumentationKey
```

### Alerts

```bash
# Create metric alert
az monitor metrics alert create \
  --name high-cpu \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --scopes <aks-resource-id> \
  --condition "avg node_cpu_usage_percentage > 80" \
  --description "Alert when CPU usage exceeds 80%"
```

## Cost Optimization

### Right-sizing Resources

```bash
# Check current usage
kubectl top nodes
kubectl top pods -n srvthreds

# Adjust resource requests/limits based on actual usage
```

### Auto-scaling

```bash
# Enable cluster autoscaler
az aks update \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 5
```

### Cost Analysis

```bash
# View cost analysis in Azure Portal
# Cost Management + Billing > Cost Analysis

# Export cost data
az consumption usage list \
  --start-date 2024-01-01 \
  --end-date 2024-01-31 \
  --output table
```

## Troubleshooting

See detailed troubleshooting in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Common Issues

**Issue: AKS cluster not accessible**
```bash
# Get credentials again
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --overwrite-existing

# Verify context
kubectl config current-context
```

**Issue: Image pull failures**
```bash
# Check ACR access
az acr check-health --name cazsrvthredsdeacr

# Attach ACR to AKS
az aks update \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --attach-acr cazsrvthredsdeacr
```

**Issue: Terraform state locked**
```bash
# Force unlock (use carefully!)
terraform force-unlock <lock-id>
```

## Next Steps

- Configure projects: [Project Configuration Guide](PROJECT_CONFIGURATION.md)
- Local development: [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md)
- Troubleshooting: [Troubleshooting Guide](TROUBLESHOOTING.md)

For questions or issues, refer to the main [README](../README.md).
