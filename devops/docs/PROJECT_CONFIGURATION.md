# Project Configuration Guide

This guide explains how to configure new projects to use the DevOps deployment platform.

## Table of Contents

- [Overview](#overview)
- [Project Structure Requirements](#project-structure-requirements)
- [Configuration Files](#configuration-files)
- [Step-by-Step Setup](#step-by-step-setup)
- [Configuration Reference](#configuration-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Overview

The DevOps platform uses a configuration-driven approach to support multiple projects within the monorepo. Each project defines:

1. **Project Metadata** - Name, description, source paths
2. **Docker Configuration** - Images and build settings
3. **Kubernetes Configuration** - Deployments, services, namespaces
4. **Environment-Specific Settings** - Minikube and AKS paths

All project configurations are stored in `devops/projects/<project-name>/project.yaml`.

## Project Structure Requirements

For a project to be deployable via this platform, it must have:

### Required Structure

```
your-project/
├── infrastructure/              # Infrastructure configurations (optional but recommended)
│   ├── local/
│   │   └── docker/
│   │       ├── compose/         # Docker Compose files
│   │       └── dockerfiles/     # Dockerfiles
│   └── shared/
│       └── configs/
│           └── deployments/     # Deployment configs
│
├── src/                         # Source code
├── package.json                 # Node.js project file
└── ...other project files
```

### Required Docker Assets

Your project needs:

1. **Dockerfiles** - At minimum:
   - `Dockerfile` - Runtime container
   - `Dockerfile.builder` - Build container (optional but recommended)

2. **Docker Compose Files** (if using deployment CLI pattern):
   - Base compose file with service definitions
   - Environment-specific overrides

3. **Build Scripts** - npm scripts for:
   - Building Docker images
   - Running deployments
   - Database setup (if applicable)

## Configuration Files

### 1. Project Configuration (`devops/projects/<project-name>/project.yaml`)

Create a project configuration file:

```yaml
# Project metadata
name: your-project-name
description: Brief description of your project

# Source code location (relative to devops directory)
source:
  # Path to project root
  path: ../your-project-name

  # Path to docker-compose files (relative to source.path)
  composePath: infrastructure/local/docker/compose

  # Path to deployment configs (relative to source.path)
  configPath: infrastructure/shared/configs/deployments

# Docker configuration
docker:
  # Builder image (used for multi-stage builds)
  builderImage: your-project/builder

  # Service images
  services:
    - name: api
      image: your-project/api
    - name: worker
      image: your-project/worker

# Kubernetes configuration
kubernetes:
  # Kubernetes namespace
  namespace: your-project-namespace

  # Deployment names (must match manifest files)
  deployments:
    - your-project-api
    - your-project-worker

# Minikube configuration (local development)
minikube:
  # Path to Minikube manifests (relative to devops directory)
  manifestPath: local/minikube/your-project/manifests/minikube/

# AKS configuration (Azure cloud)
aks:
  # Path to AKS manifests (relative to devops directory)
  manifestPath: cloud/kubernetes/your-project/

  # Supported environments
  environments:
    - dev
    - test
    - prod
```

### 2. Configuration Registry Updates

Add your project's services to `devops/configs/config-registry.yaml`:

```yaml
# Add under 'services:' section
services:
  your-service-name:
    name: your-project-service-name
    description: Service description
    image:
      repository: your-project/service
      tag: latest
    dockerfile: path/to/Dockerfile
    command:
      entrypoint: node
      args:
        - dist/index.js
    ports:
      http: 3000
    environment:
      NODE_ENV: development
      # Add required environment variables
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
```

### 3. Kubernetes Manifests

Create Kubernetes manifests using Kustomize:

#### For Minikube

Create `devops/local/minikube/your-project/manifests/minikube/`:

```
minikube/
├── kustomization.yaml
├── namespace.yaml
├── configmap.yaml
├── deployment-api.yaml
├── service-api.yaml
└── ...other resources
```

**kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: your-project-namespace

resources:
  - namespace.yaml
  - configmap.yaml
  - deployment-api.yaml
  - service-api.yaml

configMapGenerator:
  - name: your-project-config
    literals:
      - NODE_ENV=development
```

**deployment-api.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: your-project-api
  namespace: your-project-namespace
spec:
  replicas: 1
  selector:
    matchLabels:
      app: your-project-api
  template:
    metadata:
      labels:
        app: your-project-api
    spec:
      containers:
        - name: api
          image: your-project/api:latest
          imagePullPolicy: Never  # Minikube uses local images
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: development
          resources:
            requests:
              memory: "256Mi"
              cpu: "200m"
            limits:
              memory: "512Mi"
              cpu: "500m"
```

#### For AKS

Create environment-specific overlays in `devops/cloud/kubernetes/your-project/`:

```
your-project/
├── base/                    # Base manifests (shared across environments)
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── deployment-api.yaml
│   ├── service-api.yaml
│   └── configmap.yaml
├── dev/                     # Dev environment overlay
│   ├── kustomization.yaml
│   └── configmap-dev.yaml
├── test/                    # Test environment overlay
│   ├── kustomization.yaml
│   └── configmap-test.yaml
└── prod/                    # Production environment overlay
    ├── kustomization.yaml
    ├── configmap-prod.yaml
    └── hpa.yaml            # Production-specific resources
```

**base/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: your-project-namespace

resources:
  - namespace.yaml
  - deployment-api.yaml
  - service-api.yaml
  - configmap.yaml

commonLabels:
  app.kubernetes.io/name: your-project
  app.kubernetes.io/managed-by: kustomize
```

**dev/kustomization.yaml:**
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: your-project-namespace

bases:
  - ../base

patches:
  - path: configmap-dev.yaml

# Override image tags for dev
images:
  - name: your-project/api
    newTag: dev

# Dev-specific replicas
replicas:
  - name: your-project-api
    count: 1
```

## Step-by-Step Setup

### Step 1: Create Project Configuration

```bash
# Create project directory
mkdir -p devops/projects/your-project

# Create project.yaml
cat > devops/projects/your-project/project.yaml <<EOF
name: your-project
description: Your project description

source:
  path: ../your-project
  composePath: infrastructure/local/docker/compose
  configPath: infrastructure/shared/configs/deployments

docker:
  builderImage: your-project/builder
  services:
    - name: api
      image: your-project/api

kubernetes:
  namespace: your-project
  deployments:
    - your-project-api

minikube:
  manifestPath: local/minikube/your-project/manifests/minikube/

aks:
  manifestPath: cloud/kubernetes/your-project/
  environments:
    - dev
    - test
    - prod
EOF
```

### Step 2: Create Kubernetes Manifests

```bash
# Create Minikube manifests
mkdir -p devops/local/minikube/your-project/manifests/minikube
cd devops/local/minikube/your-project/manifests/minikube

# Create namespace
cat > namespace.yaml <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: your-project
EOF

# Create kustomization.yaml
cat > kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: your-project

resources:
  - namespace.yaml
  - deployment-api.yaml
  - service-api.yaml
EOF

# Create deployment and service files (see examples above)
```

```bash
# Create AKS manifests
mkdir -p devops/cloud/kubernetes/your-project/{base,dev,test,prod}

# Create base manifests (similar to Minikube)
# Create environment overlays (see examples above)
```

### Step 3: Update Configuration Registry

Edit `devops/configs/config-registry.yaml` to add your service definitions under the `services:` section.

### Step 4: Create Dockerfiles

In your project directory:

```dockerfile
# your-project/infrastructure/local/docker/dockerfiles/Dockerfile.builder
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# This is a builder image - no CMD needed
```

```dockerfile
# your-project/infrastructure/local/docker/dockerfiles/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 3000

# Run application
CMD ["node", "dist/index.js"]
```

### Step 5: Add npm Scripts

In your project's `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "docker:build": "docker compose build",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  }
}
```

### Step 6: Test Deployment

```bash
# Return to devops directory
cd devops

# List available projects
npm run k8s -- config list

# Deploy to Minikube
npm run k8s -- minikube deploy --project your-project

# Check status
npm run k8s -- minikube status --project your-project
```

## Configuration Reference

### Project.yaml Schema

```typescript
interface ProjectConfig {
  // Required fields
  name: string;                    // Project name (kebab-case)
  description: string;             // Brief description

  // Source configuration
  source: {
    path: string;                  // Relative path from devops/ to project root
    composePath?: string;          // Docker Compose files (relative to source.path)
    configPath?: string;           // Deployment configs (relative to source.path)
  };

  // Docker configuration
  docker: {
    builderImage: string;          // Builder image name
    services: Array<{
      name: string;                // Service name
      image: string;               // Image name (without tag)
    }>;
  };

  // Kubernetes configuration
  kubernetes: {
    namespace: string;             // K8s namespace
    deployments: string[];         // Deployment names
  };

  // Minikube configuration
  minikube: {
    manifestPath: string;          // Path to Minikube manifests (from devops/)
  };

  // AKS configuration
  aks: {
    manifestPath: string;          // Path to AKS manifests (from devops/)
    environments: Array<'dev' | 'test' | 'prod'>;  // Supported environments
  };
}
```

### Config Registry Schema

```typescript
interface ServiceConfig {
  name: string;                    // Service name
  description: string;             // Service description

  image: {
    repository: string;            // Image repository
    tag: string;                   // Default tag
  };

  dockerfile?: string;             // Path to Dockerfile
  buildOnly?: boolean;            // Build-only service (not deployed)

  command?: {
    entrypoint: string;            // Container entrypoint
    args: string[];                // Command arguments
  };

  ports?: {
    [name: string]: number;        // Named ports
  };

  environment?: {
    [key: string]: string;         // Environment variables
  };

  dependsOn?: string[];            // Service dependencies

  resources: {
    memory: {
      request: string;             // Memory request (e.g., "256Mi")
      limit: string;               // Memory limit
    };
    cpu: {
      request: string;             // CPU request (e.g., "200m")
      limit: string;               // CPU limit
    };
  };

  replicas: {
    dev: number;                   // Dev replicas
    staging: number;               // Staging replicas
    production: number;            // Production replicas
  };

  restartPolicy?: string;          // Restart policy
}
```

## Examples

### Example 1: Simple API Project

**Project structure:**
```
my-api/
├── src/
│   └── index.ts
├── Dockerfile
├── package.json
└── tsconfig.json
```

**devops/projects/my-api/project.yaml:**
```yaml
name: my-api
description: Simple REST API

source:
  path: ../my-api

docker:
  builderImage: my-api/builder
  services:
    - name: api
      image: my-api/api

kubernetes:
  namespace: my-api
  deployments:
    - my-api

minikube:
  manifestPath: local/minikube/my-api/manifests/minikube/

aks:
  manifestPath: cloud/kubernetes/my-api/
  environments:
    - dev
    - prod
```

### Example 2: Multi-Service Project

**Project structure:**
```
my-platform/
├── services/
│   ├── api/
│   ├── worker/
│   └── scheduler/
├── infrastructure/
│   └── local/
│       └── docker/
│           ├── compose/
│           └── dockerfiles/
└── package.json
```

**devops/projects/my-platform/project.yaml:**
```yaml
name: my-platform
description: Multi-service platform

source:
  path: ../my-platform
  composePath: infrastructure/local/docker/compose
  configPath: infrastructure/shared/configs/deployments

docker:
  builderImage: my-platform/builder
  services:
    - name: api
      image: my-platform/api
    - name: worker
      image: my-platform/worker
    - name: scheduler
      image: my-platform/scheduler

kubernetes:
  namespace: my-platform
  deployments:
    - my-platform-api
    - my-platform-worker
    - my-platform-scheduler

minikube:
  manifestPath: local/minikube/my-platform/manifests/minikube/

aks:
  manifestPath: cloud/kubernetes/my-platform/
  environments:
    - dev
    - test
    - prod
```

### Example 3: Frontend Application

**devops/projects/my-frontend/project.yaml:**
```yaml
name: my-frontend
description: React-based frontend application

source:
  path: ../my-frontend

docker:
  builderImage: my-frontend/builder
  services:
    - name: web
      image: my-frontend/web

kubernetes:
  namespace: my-frontend
  deployments:
    - my-frontend-web

minikube:
  manifestPath: local/minikube/my-frontend/manifests/minikube/

aks:
  manifestPath: cloud/kubernetes/my-frontend/
  environments:
    - dev
    - prod
```

## Best Practices

### 1. Naming Conventions

- **Projects**: Use kebab-case (e.g., `my-project`)
- **Services**: Use kebab-case (e.g., `my-service-api`)
- **Deployments**: Prefix with project name (e.g., `my-project-api`)
- **Namespaces**: Use project name or logical grouping
- **Images**: Follow pattern `project-name/service-name`

### 2. Resource Allocation

**Development:**
```yaml
resources:
  memory:
    request: 128Mi
    limit: 256Mi
  cpu:
    request: 100m
    limit: 200m
replicas:
  dev: 1
```

**Production:**
```yaml
resources:
  memory:
    request: 512Mi
    limit: 1Gi
  cpu:
    request: 500m
    limit: 1000m
replicas:
  production: 3
```

### 3. Environment Variables

- Store secrets in Azure Key Vault (for AKS)
- Use ConfigMaps for non-sensitive configuration
- Use environment-specific ConfigMaps in Kustomize overlays
- Never commit secrets to version control

### 4. Health Checks

Add health checks to all deployments:

```yaml
spec:
  containers:
    - name: api
      # ...
      livenessProbe:
        httpGet:
          path: /health
          port: 3000
        initialDelaySeconds: 30
        periodSeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 3000
        initialDelaySeconds: 10
        periodSeconds: 5
```

### 5. Labels and Annotations

Use consistent labels:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: my-project
    app.kubernetes.io/component: api
    app.kubernetes.io/part-of: my-platform
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/version: "1.0.0"
```

### 6. Multi-Stage Builds

Use multi-stage Dockerfiles for smaller images:

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 7. Kustomize Organization

Structure overlays hierarchically:

```
base/              # Shared resources
├── common/        # Common to all environments
dev/               # Development overrides
test/              # Test overrides
prod/              # Production overrides
  ├── patches/     # Patches for prod
  └── resources/   # Prod-only resources
```

### 8. Testing

Test your configuration:

```bash
# Validate Kubernetes manifests
kubectl kustomize devops/local/minikube/my-project/manifests/minikube/ | kubectl apply --dry-run=client -f -

# Test dry-run deployment
npm run k8s -- minikube deploy --project my-project --dry-run

# Validate project config
npm run config:validate
```

### 9. Documentation

Document your project's:
- Deployment prerequisites
- Environment variables
- External dependencies
- Port mappings
- Database requirements
- Special configuration needs

### 10. Version Control

Include in your project repository:
- Project configuration (`project.yaml`)
- Kubernetes manifests
- Dockerfiles
- Deployment documentation

Exclude from version control:
- `.env` files
- Secrets
- Generated files
- Build artifacts

## Troubleshooting

### Common Issues

**Issue: "Project not found"**
```bash
# Check project is listed
npm run k8s -- config list

# Verify project.yaml exists
ls devops/projects/your-project/project.yaml
```

**Issue: "Manifest path not found"**
```bash
# Check paths are relative to devops/ directory
ls devops/local/minikube/your-project/manifests/minikube/

# Verify kustomization.yaml exists
cat devops/local/minikube/your-project/manifests/minikube/kustomization.yaml
```

**Issue: "Image not found"**
```bash
# For Minikube, ensure images are built in Minikube Docker
eval $(minikube docker-env)
docker images | grep your-project

# For AKS, check images are in ACR
az acr repository list --name <acr-name>
```

**Issue: "Namespace conflicts"**
```bash
# Ensure namespace is unique
kubectl get namespaces

# Delete old namespace if needed
kubectl delete namespace your-project
```

## Next Steps

After configuring your project:

1. Test local deployment: [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md)
2. Configure Azure resources: [Azure Deployment Guide](AZURE_DEPLOYMENT.md)
3. Review troubleshooting: [Troubleshooting Guide](TROUBLESHOOTING.md)

For questions or issues, refer to the main [README](../README.md) or create an issue in the repository.
