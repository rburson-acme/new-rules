# Project Configuration Guide

Guide for configuring projects to use the DevOps deployment platform.

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Configuration Files](#configuration-files)
- [Adding a New Project](#adding-a-new-project)
- [Configuration Reference](#configuration-reference)

## Overview

The DevOps platform uses a configuration-driven approach. Each project defines:

1. **Project Metadata** - Name, description, source paths
2. **Docker Configuration** - Images and build settings
3. **Kubernetes Configuration** - Deployments, services, namespaces
4. **Environment-Specific Settings** - Minikube and AKS paths

Project configurations are stored in `projects/<project-name>/project.yaml`.

## Project Structure

### Current Project: srvthreds

```
projects/
└── srvthreds/
    └── project.yaml
```

### Required Manifest Directories

**For Minikube:**
```
minikube/<project>/manifests/
├── base/                # Base manifests
├── minikube/            # Minikube overlay
└── prod/                # Prod overlay (optional)
```

**For AKS:**
```
kubernetes/<project>/
├── base/                # Base manifests
├── dev/                 # Dev overlay
├── test/                # Test overlay
└── prod/                # Prod overlay
```

## Configuration Files

### Project Configuration (`projects/<project>/project.yaml`)

```yaml
# Project metadata
name: srvthreds
description: Event-driven workflow automation backend

# Source code location (relative to devops directory)
source:
  path: ../srvthreds
  composePath: infrastructure/local/docker/compose
  configPath: infrastructure/shared/configs/deployments

# Docker configuration
docker:
  builderImage: srvthreds/builder
  services:
    - name: engine
      image: srvthreds/engine
    - name: session-agent
      image: srvthreds/session-agent
    - name: persistence-agent
      image: srvthreds/persistence-agent

# Kubernetes configuration
kubernetes:
  namespace: srvthreds
  deployments:
    - srvthreds-engine
    - srvthreds-session-agent
    - srvthreds-persistence-agent

# Minikube configuration
minikube:
  manifestPath: minikube/srvthreds/manifests/minikube/

# AKS configuration
aks:
  manifestPath: kubernetes/srvthreds/
  environments:
    - dev
    - test
    - prod
```

### Configuration Registry (`configs/config-registry.yaml`)

Central configuration for services, ports, and resources:

```yaml
services:
  engine:
    name: srvthreds-engine
    description: Main event processing engine
    image:
      repository: srvthreds/engine
      tag: latest
    ports:
      http: 8082
    resources:
      memory:
        request: 256Mi
        limit: 512Mi
      cpu:
        request: 200m
        limit: 500m
    replicas:
      dev: 1
      staging: 2
      production: 3

databases:
  mongodb:
    name: mongodb
    ports:
      default: 27017
    connection:
      local: mongodb://localhost:27017/threds?replicaSet=rs0
      minikube: mongodb://host.minikube.internal:27017/threds?replicaSet=rs0

  redis:
    name: redis
    ports:
      default: 6379
```

### Stack Configuration (`configs/terraform/stacks.json`)

Terraform stack dependencies:

```json
{
  "environments": ["dev", "test", "prod"],
  "stacks": [
    {
      "name": "networking",
      "path": "stacks/srvthreds/networking",
      "dependencies": []
    },
    {
      "name": "aks",
      "path": "stacks/srvthreds/aks",
      "dependencies": ["networking", "acr"]
    }
  ]
}
```

### Environment Configuration (`configs/terraform/environments.json`)

Azure environment metadata:

```json
{
  "dev": {
    "subscriptionId": "...",
    "resourceGroupName": "CAZ-SRVTHREDS-D-E-RG",
    "stateBackendResourceGroup": "srvthreds-terraform-rg",
    "stateBackendStorageAccount": "srvthredstfstatei274ht"
  }
}
```

## Adding a New Project

### Step 1: Create Project Configuration

```bash
mkdir -p projects/my-project
```

Create `projects/my-project/project.yaml`:

```yaml
name: my-project
description: My project description

source:
  path: ../my-project

docker:
  builderImage: my-project/builder
  services:
    - name: api
      image: my-project/api

kubernetes:
  namespace: my-project
  deployments:
    - my-project-api

minikube:
  manifestPath: minikube/my-project/manifests/minikube/

aks:
  manifestPath: kubernetes/my-project/
  environments:
    - dev
    - prod
```

### Step 2: Create Minikube Manifests

```bash
mkdir -p minikube/my-project/manifests/{base,minikube}
```

Create `minikube/my-project/manifests/base/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: my-project

resources:
  - namespace.yaml
  - deployment-api.yaml
  - service-api.yaml
```

Create `minikube/my-project/manifests/minikube/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../base

images:
  - name: my-project/api
    newTag: latest
```

### Step 3: Create AKS Manifests

```bash
mkdir -p kubernetes/my-project/{base,dev,test,prod}
```

Create similar Kustomize structure with environment overlays.

### Step 4: Test Configuration

```bash
# Verify project loads
npm run k8s -- config show --project my-project

# Test Minikube deployment (dry-run)
npm run k8s -- minikube deploy --project my-project --dry-run
```

## Configuration Reference

### Project.yaml Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name (kebab-case) |
| `description` | string | Yes | Brief description |
| `source.path` | string | Yes | Path to project root (relative to devops/) |
| `source.composePath` | string | No | Docker Compose files path |
| `source.configPath` | string | No | Deployment configs path |
| `docker.builderImage` | string | Yes | Builder image name |
| `docker.services` | array | Yes | Service definitions |
| `kubernetes.namespace` | string | Yes | Kubernetes namespace |
| `kubernetes.deployments` | array | Yes | Deployment names |
| `minikube.manifestPath` | string | Yes | Minikube manifest path |
| `aks.manifestPath` | string | Yes | AKS manifest path |
| `aks.environments` | array | Yes | Supported environments |

### Path Conventions

All paths in `project.yaml` are relative to the `devops/` directory:

| Path Type | Example |
|-----------|---------|
| Source | `../srvthreds` |
| Minikube manifests | `minikube/srvthreds/manifests/minikube/` |
| AKS manifests | `kubernetes/srvthreds/` |

### Validation

Validate configuration:

```bash
npm run config:validate
```

This checks:
- Required fields are present
- Paths exist
- Manifest files are valid
- Config registry matches manifests

## Next Steps

- [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md) - Local development
- [Azure Deployment Guide](AZURE_DEPLOYMENT.md) - Cloud deployment
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
