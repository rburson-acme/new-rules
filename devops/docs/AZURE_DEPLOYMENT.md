# Azure Deployment Guide

Guide for deploying srvthreds to Azure Kubernetes Service (AKS).

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Infrastructure Setup](#infrastructure-setup)
- [Application Deployment](#application-deployment)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)

## Overview

This platform deploys srvthreds to Azure using:

- **Terraform** for infrastructure provisioning (AKS, ACR, Cosmos DB, Redis, Key Vault, etc.)
- **Kubernetes** for container orchestration via AKS
- **Kustomize** for environment-specific manifest overlays

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Azure Resource Group: CAZ-SRVTHREDS-{ENV}-E-RG             │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   AKS       │  │    ACR      │  │     Key Vault       │ │
│  │  Cluster    │◄─│  Registry   │  │     Secrets         │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│         │                                    │              │
│         ▼                                    ▼              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Namespace: srvthreds                               │   │
│  │  ┌─────────┐ ┌─────────────┐ ┌──────────────────┐  │   │
│  │  │ Engine  │ │Session Agent│ │Persistence Agent │  │   │
│  │  └─────────┘ └─────────────┘ └──────────────────┘  │   │
│  │                                                     │   │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────┐  │   │
│  │  │ RabbitMQ  │  │  Ingress  │  │   Bootstrap    │  │   │
│  │  └───────────┘  └───────────┘  └────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Cosmos DB  │  │   Redis     │  │    Monitoring       │ │
│  │ (MongoDB)   │  │   Cache     │  │  (App Insights)     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Environments

| Environment | Resource Group | Description |
|-------------|----------------|-------------|
| dev | CAZ-SRVTHREDS-D-E-RG | Development |
| test | CAZ-SRVTHREDS-T-E-RG | Testing |
| prod | CAZ-SRVTHREDS-P-E-RG | Production |

## Prerequisites

### Required Tools

```bash
# Azure CLI
az --version

# Terraform
terraform --version

# kubectl
kubectl version --client

# Node.js
node --version
npm --version
```

### Azure Authentication

```bash
# Login to Azure
az login

# Set subscription
az account set --subscription "<subscription-id>"

# Verify
az account show
```

## Infrastructure Setup

### Directory Structure

```
terraform/
├── modules/
│   ├── azure/                    # Azure modules (11)
│   │   ├── acr/                  # Container Registry
│   │   ├── aks/                  # Kubernetes Service
│   │   ├── appgateway/           # Application Gateway
│   │   ├── cosmosdb/             # Cosmos DB
│   │   ├── keyvault/             # Key Vault
│   │   ├── monitoring/           # Log Analytics
│   │   ├── networking/           # VNet, Subnets
│   │   ├── private-endpoint/     # Private Endpoints
│   │   ├── rbac/                 # Role Assignments
│   │   ├── redis/                # Redis Cache
│   │   └── servicebus/           # Service Bus
│   ├── eks/                      # AWS EKS modules
│   ├── mongodb-atlas/            # MongoDB Atlas
│   └── networking/               # Cross-cloud networking
├── stacks/srvthreds/             # Environment stacks
│   ├── _shared/                  # Shared backend config
│   ├── acr/
│   ├── aks/
│   ├── appgateway/
│   ├── common/
│   ├── cosmosdb/
│   ├── keyvault/
│   ├── monitoring/
│   ├── networking/
│   ├── nginx-ingress/
│   ├── redis/
│   └── servicebus/
└── state-backend/                # State bootstrap
```

### Stack Dependencies

Stacks must be deployed in dependency order (defined in `configs/terraform/stacks.json`):

```
networking (root - no dependencies)
├── keyvault
├── acr
├── cosmosdb
├── redis
└── monitoring

aks (depends on: networking, acr)
└── nginx-ingress (depends on: aks, networking)
```

### First-Time Setup

```bash
cd devops

# Install dependencies
npm install

# Bootstrap Terraform state backend (one-time)
npm run tf:bootstrap

# Initialize all stacks for environment
npm run tf:init -- dev

# Preview infrastructure changes
npm run tf:plan -- dev

# Deploy infrastructure (requires approval)
npm run tf:apply -- dev
```

### Terraform Commands

| Command | Description |
|---------|-------------|
| `npm run tf:init -- <env>` | Initialize Terraform for environment |
| `npm run tf:plan -- <env>` | Preview infrastructure changes |
| `npm run tf:apply -- <env>` | Deploy infrastructure |
| `npm run tf:destroy -- <env>` | Tear down infrastructure |
| `npm run tf:status -- <env>` | Check deployment status |
| `npm run tf:bootstrap` | Initialize state backend |
| `npm run tf:fix-symlinks` | Fix symlink issues |
| `npm run tf:validate-security -- <env>` | Validate security config |
| `npm run tf:import -- <args>` | Import existing resources |
| `npm run tf:state -- <cmd> <env>` | Manage Terraform state |

### Deploy Specific Stacks

```bash
# Deploy only networking and AKS
npm run terraform -- deploy dev networking aks

# Deploy databases
npm run terraform -- deploy dev cosmosdb redis
```

## Application Deployment

### Kubernetes Manifests

```
kubernetes/srvthreds/
├── base/                         # Shared manifests
│   ├── kustomization.yaml
│   ├── configmap-managed-services.yaml
│   ├── rabbitmq-service.yaml
│   ├── rabbitmq-statefulset.yaml
│   ├── srvthreds-bootstrap-job.yaml
│   ├── srvthreds-engine.yaml
│   ├── srvthreds-ingress.yaml
│   ├── srvthreds-persistence-agent.yaml
│   └── srvthreds-session-agent.yaml
├── dev/                          # Dev overlay
│   ├── kustomization.yaml
│   ├── image-pull-policy.yaml
│   └── service-type.yaml
├── test/                         # Test overlay
└── prod/                         # Prod overlay
```

### Deploy to AKS

```bash
# Deploy to dev environment
npm run aks:deploy -- dev

# Check deployment status
npm run aks:status -- dev

# With options
npm run k8s -- aks deploy dev --dry-run
npm run k8s -- aks deploy dev --tag v1.0.0
```

### AKS Commands

| Command | Description |
|---------|-------------|
| `npm run aks:deploy -- <env>` | Deploy to AKS |
| `npm run aks:status -- <env>` | Check deployment status |
| `npm run k8s -- aks restart <env>` | Rollout restart deployments |

## Operations

### Get AKS Credentials

```bash
# Dev environment
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --overwrite-existing

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### View Resources

```bash
# View pods
kubectl get pods -n srvthreds

# View services
kubectl get svc -n srvthreds

# View deployments
kubectl get deployments -n srvthreds

# Describe pod
kubectl describe pod <pod-name> -n srvthreds

# View logs
kubectl logs <pod-name> -n srvthreds
kubectl logs -f <pod-name> -n srvthreds  # Follow
```

### ACR Operations

```bash
# Login to ACR
az acr login --name cazsrvthredsdeacr

# List images
az acr repository list --name cazsrvthredsdeacr

# Push image
docker tag myimage:latest cazsrvthredsdeacr.azurecr.io/srvthreds/myimage:latest
docker push cazsrvthredsdeacr.azurecr.io/srvthreds/myimage:latest
```

### Scaling

```bash
# Scale deployment
kubectl scale deployment srvthreds-engine --replicas=3 -n srvthreds

# Check rollout status
kubectl rollout status deployment/srvthreds-engine -n srvthreds
```

## Troubleshooting

### Common Issues

#### Not Logged In to Azure

```bash
az login
az account set --subscription "<subscription-id>"
```

#### AKS Cluster Not Found

```bash
# Check if cluster exists
az aks list --output table

# Check resource group
az group list --output table
```

#### Image Pull Errors

```bash
# Verify ACR attachment
az aks update \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --attach-acr cazsrvthredsdeacr
```

#### Pods Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n srvthreds

# Check logs
kubectl logs <pod-name> -n srvthreds

# Check previous container logs
kubectl logs <pod-name> -n srvthreds --previous
```

#### Terraform State Lock

```bash
# Check lock
az storage blob show \
  --account-name srvthredstfstatei274ht \
  --container-name tfstate \
  --name <state-file>

# Force unlock (use with caution)
cd terraform/stacks/srvthreds/<stack>
terraform force-unlock <lock-id>
```

### Useful Diagnostic Commands

```bash
# Check all resources in namespace
kubectl get all -n srvthreds

# Check events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Check resource usage
kubectl top pods -n srvthreds
kubectl top nodes

# Test DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup mongodb-service.srvthreds

# Check ConfigMaps
kubectl get configmap -n srvthreds
kubectl describe configmap srvthreds-config -n srvthreds
```

## Next Steps

- [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md) - Local development
- [Project Configuration Guide](PROJECT_CONFIGURATION.md) - Config system
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
