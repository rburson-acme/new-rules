# Configuration Guide

This guide covers all configuration files used by the DevOps toolkit.

## Table of Contents

- [Project Configuration](#project-configuration)
- [Terraform Configuration](#terraform-configuration)
- [Deployment Configuration](#deployment-configuration)
- [Environment Variables](#environment-variables)

---

## Project Configuration

### Location
`projects/{project}/project.yaml`

### Purpose
Central configuration file that defines all paths, settings, and metadata for a project.

### Schema

```yaml
# Project identity
name: string                    # Project name (required)
description: string             # Human-readable description

# Source code location
source:
  path: string                  # Path to source code (relative to project dir)

# Docker configuration
docker:
  composePath: string           # Path to docker-compose files
  dockerfilePath: string        # Path to Dockerfiles
  assetsPath: string            # Path to Docker build assets
  builderImage: string          # Base builder image name
  services:                     # List of Docker services
    - name: string              # Service name
      image: string             # Image name

# Deployment configuration
deployments:
  configPath: string            # Path to deployment JSON files

# Terraform configuration
terraform:
  stacksPath: string            # Path to Terraform stacks
  configPath: string            # Path to Terraform config files

# Kubernetes configuration
kubernetes:
  namespace: string             # Kubernetes namespace
  deployments:                  # List of deployment names
    - string

# Minikube-specific settings
minikube:
  manifestPath: string          # Path to Minikube manifests

# AKS-specific settings
aks:
  manifestPath: string          # Path to AKS manifests
  environments:                 # Supported environments
    - string                    # e.g., "dev", "test", "prod"

# Azure naming convention
azure:
  prefix: string                # Organization prefix (e.g., "CAZ")
  appCode: string               # Application code (e.g., "SRVTHREDS")
  regionCode: string            # Region code (e.g., "E" for East US)
```

### Example

```yaml
name: srvthreds
description: Event-driven workflow automation backend

source:
  path: ../../../srvthreds

docker:
  composePath: docker/compose
  dockerfilePath: docker/dockerfiles
  assetsPath: docker/assets
  builderImage: srvthreds/builder
  services:
    - name: bootstrap
      image: srvthreds/bootstrap
    - name: engine
      image: srvthreds/engine
    - name: session-agent
      image: srvthreds/session-agent

deployments:
  configPath: deployments

terraform:
  stacksPath: terraform/stacks
  configPath: terraform

kubernetes:
  namespace: srvthreds
  deployments:
    - srvthreds-engine
    - srvthreds-session-agent
    - srvthreds-persistence-agent

minikube:
  manifestPath: minikube/manifests/minikube/

aks:
  manifestPath: kubernetes/
  environments:
    - dev
    - test
    - prod

azure:
  prefix: CAZ
  appCode: SRVTHREDS
  regionCode: E
```

### Path Resolution

All paths in `project.yaml` are relative to the project directory (`projects/{project}/`). The system resolves them to absolute paths at runtime.

---

## Terraform Configuration

### Stack Configuration

#### Location
`projects/{project}/terraform/stacks.json`

#### Purpose
Defines infrastructure stacks and their dependencies.

#### Schema

```json
{
  "environments": ["string"],    // Valid environment names
  "stacks": [
    {
      "name": "string",          // Stack identifier
      "path": "string",          // Path to stack directory
      "dependencies": ["string"] // Stack names this depends on
    }
  ]
}
```

#### Example

```json
{
  "environments": ["dev", "test", "prod"],
  "stacks": [
    {
      "name": "networking",
      "path": "stacks/networking",
      "dependencies": []
    },
    {
      "name": "keyvault",
      "path": "stacks/keyvault",
      "dependencies": ["networking"]
    },
    {
      "name": "acr",
      "path": "stacks/acr",
      "dependencies": []
    },
    {
      "name": "servicebus",
      "path": "stacks/servicebus",
      "dependencies": ["networking"]
    },
    {
      "name": "cosmosdb",
      "path": "stacks/cosmosdb",
      "dependencies": ["networking", "keyvault"]
    },
    {
      "name": "redis",
      "path": "stacks/redis",
      "dependencies": ["networking", "keyvault"]
    },
    {
      "name": "aks",
      "path": "stacks/aks",
      "dependencies": ["networking", "keyvault", "acr"]
    },
    {
      "name": "monitoring",
      "path": "stacks/monitoring",
      "dependencies": ["aks"]
    }
  ]
}
```

### Environment Configuration

#### Location
`projects/{project}/terraform/environments.json`

#### Purpose
Environment-specific Azure settings and state backend configuration.

#### Schema

```json
{
  "{environment}": {
    "subscriptionId": "string",           // Azure subscription ID
    "resourceGroupName": "string",        // Target resource group
    "stateBackendResourceGroup": "string", // Terraform state RG
    "stateBackendStorageAccount": "string" // Terraform state storage
  }
}
```

#### Example

```json
{
  "dev": {
    "subscriptionId": "12345678-1234-1234-1234-123456789012",
    "resourceGroupName": "CAZ-SRVTHREDS-D-E-RG",
    "stateBackendResourceGroup": "srvthreds-terraform-rg",
    "stateBackendStorageAccount": "srvthredstfstatedev"
  },
  "test": {
    "subscriptionId": "12345678-1234-1234-1234-123456789012",
    "resourceGroupName": "CAZ-SRVTHREDS-T-E-RG",
    "stateBackendResourceGroup": "srvthreds-terraform-rg",
    "stateBackendStorageAccount": "srvthredstfstatetest"
  },
  "prod": {
    "subscriptionId": "87654321-4321-4321-4321-210987654321",
    "resourceGroupName": "CAZ-SRVTHREDS-P-E-RG",
    "stateBackendResourceGroup": "srvthreds-terraform-rg",
    "stateBackendStorageAccount": "srvthredstfstateprod"
  }
}
```

---

## Deployment Configuration

See [Deployment Configs](deployment-configs.md) for detailed documentation.

### Location
`projects/{project}/deployments/*.json`

### Common Files
- `services.json` - Application service deployments
- `databases.json` - Database setup deployments
- `build.json` - Build configurations

---

## Environment Variables

### Azure Authentication

The toolkit uses Azure CLI authentication. Ensure you're logged in:

```bash
az login
az account set --subscription <subscription-id>
```

### Optional Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `KUBECONFIG` | Kubernetes config path | `~/.kube/config` |
| `AZURE_DEFAULTS_GROUP` | Default Azure resource group | None |
| `TF_LOG` | Terraform log level | None |

### CI/CD Environment Variables

For CI/CD pipelines, you may need:

```bash
# Azure Service Principal authentication
export ARM_CLIENT_ID="..."
export ARM_CLIENT_SECRET="..."
export ARM_SUBSCRIPTION_ID="..."
export ARM_TENANT_ID="..."

# Terraform settings
export TF_IN_AUTOMATION=true
export TF_INPUT=false
```

---

## Configuration Validation

### Validate Project Configuration

```bash
npm run config:srvthreds:validate
```

This validates:
- Docker compose files match config registry
- Kubernetes manifests match expected configuration
- Agent configuration files are valid
- Environment files exist

### Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Project not found` | Invalid project name | Check spelling, use `k8s config list` |
| `Missing required field` | Incomplete project.yaml | Add missing field per schema |
| `Stack not found` | Invalid stack reference | Check stacks.json for valid names |
| `Environment not found` | Invalid environment | Check environments.json |

---

## Creating a New Project

1. **Create project directory:**
   ```bash
   mkdir -p projects/myproject
   ```

2. **Create project.yaml:**
   ```yaml
   name: myproject
   description: My new project

   source:
     path: ../../../myproject

   docker:
     composePath: docker/compose
     dockerfilePath: docker/dockerfiles
     assetsPath: docker/assets
     builderImage: myproject/builder
     services:
       - name: api
         image: myproject/api

   deployments:
     configPath: deployments

   terraform:
     stacksPath: terraform/stacks
     configPath: terraform

   kubernetes:
     namespace: myproject
     deployments:
       - myproject-api

   minikube:
     manifestPath: minikube/manifests/

   aks:
     manifestPath: kubernetes/
     environments:
       - dev
       - prod

   azure:
     prefix: CAZ
     appCode: MYPROJ
     regionCode: E
   ```

3. **Create required directories:**
   ```bash
   mkdir -p projects/myproject/{deployments,docker/{compose,dockerfiles,assets}}
   mkdir -p projects/myproject/{terraform/{stacks},kubernetes,minikube/manifests}
   ```

4. **Create stacks.json and environments.json** in `terraform/`

5. **Create deployment configs** in `deployments/`

6. **Add npm scripts** to package.json:
   ```json
   {
     "tf:myproject:init": "npm run terraform -- init -p myproject",
     "tf:myproject:plan": "npm run terraform -- plan -p myproject",
     "minikube:myproject:deploy": "npm run k8s -- minikube deploy -p myproject"
   }
   ```
