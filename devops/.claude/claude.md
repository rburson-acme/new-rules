## Execution Policy

**CRITICAL**: Claude Code is NEVER allowed to execute ANY commands that modify infrastructure, deployments, or configuration without EXPLICIT user permission first. This includes but is not limited to:

- ANY Azure CLI commands (az *)
- ANY kubectl commands that modify state (apply, delete, restart, rollout, patch, scale, etc.)
- ANY Terraform commands
- ANY deployment CLI commands
- ANY commands that create, update, or delete resources

**ONLY READ-ONLY commands are allowed without asking:**
- kubectl get, kubectl describe, kubectl logs
- az show, az list (with --query for read-only data)
- File reads, greps, globs
- Git status, git log, git diff (read-only operations)

**Before executing ANY command that could modify state, Claude MUST:**
1. Identify the issue/problem
2. Explain what needs to be changed
3. Show the exact command(s) that would fix it
4. WAIT for explicit user approval
5. NEVER proceed without confirmation

**If Claude executes a state-changing command without permission, the user will immediately terminate the session.**

---

## Project Overview

This is an **enterprise DevOps toolkit** providing:
1. **Local Kubernetes simulation** - Minikube environment that mirrors cloud AKS deployments
2. **Infrastructure as Code** - Terraform modules for Azure resource provisioning
3. **Unified CLI tooling** - Single interface for local development and cloud deployments
4. **Configuration-driven deployments** - `project.yaml` as single source of truth

### Core Philosophy
- **Local-to-cloud parity**: Minikube deployments use identical patterns to AKS
- **Configuration over code**: All behavior driven by YAML/JSON configs, not hardcoded values
- **Generate then review**: Generated configs (docker-compose) are committed for review
- **Reusable infrastructure**: Terraform modules extensible across projects

---

## Repository Structure

```
devops/
├── .claude/CLAUDE.md              # AI assistant instructions (this file)
├── .github/workflows/             # GitHub Actions CI/CD pipelines
│   ├── _reusable-docker-build.yml # Reusable: Build & push to ACR
│   ├── _reusable-k8s-deploy.yml   # Reusable: Deploy to AKS
│   └── srvthreds-deploy.yml       # Project-specific pipeline
├── docs/                          # Documentation
│   ├── architecture.md            # System design and patterns
│   ├── deployment-guide.md        # Step-by-step deployment instructions
│   └── troubleshooting.md         # Diagnostics and common issues
├── projects/{name}/               # Project-specific configurations
│   ├── project.yaml               # Single source of truth
│   ├── docker-compose.generated.yaml  # Generated from project.yaml
│   ├── docker/dockerfiles/        # Dockerfile definitions
│   ├── manifests/                 # Kubernetes manifests
│   │   ├── base/                  # Environment-agnostic resources
│   │   └── overlays/              # Environment-specific overrides
│   │       ├── minikube/          # Local development
│   │       ├── dev/               # Azure dev environment
│   │       └── prod/              # Azure production
│   ├── scripts/                   # Setup and utility scripts
│   └── terraform/                 # Infrastructure definitions
│       ├── stacks.json            # Stack dependencies
│       ├── environments.json      # Environment configs
│       └── stacks/                # Terraform stack modules
├── terraform/
│   ├── modules/azure/             # Reusable Azure modules
│   └── state-backend/             # Terraform state backend setup
└── tools/
    ├── cli/                       # Main DevOps CLI
    ├── terraform-cli/             # Terraform orchestration CLI
    └── shared/                    # Shared utilities
```

---

## CLI Commands Reference

### Main CLI (`tools/cli/`)

```bash
# Generate docker-compose from project.yaml
npm run generate -p <project>

# Minikube deployment
npm run minikube -p <project>              # Start all profiles
npm run minikube -p <project> --build      # Rebuild images
npm run minikube -p <project> --profile infra  # Only infrastructure
npm run minikube -p <project> --recreate   # Force recreate containers

# Lifecycle management
npm run minikube:stop -p <project>         # Stop services (keep data)
npm run minikube:reset -p <project>        # Full reset (delete volumes)
npm run minikube:status -p <project>       # Show service status
npm run minikube:delete                    # Delete minikube cluster

# Configuration
npm run cli -- config:list                 # List available projects
```

### Terraform CLI (`tools/terraform-cli/`)

```bash
# Infrastructure deployment
npm run terraform -- init -p <project> <env>           # Initialize stacks
npm run terraform -- plan -p <project> <env>           # Preview changes
npm run terraform -- deploy -p <project> <env>         # Deploy stacks
npm run terraform -- destroy -p <project> <env>        # Destroy stacks

# State management
npm run terraform -- status -p <project> <env>         # Check status
npm run terraform -- state backup <env>                # Backup state
npm run terraform -- state recover <env> <stack>       # Recover state
npm run terraform -- output -p <project> <env>         # Get outputs

# Setup
npm run terraform -- bootstrap -p <project> <env>      # Setup state backend
npm run terraform -- fix-symlinks                      # Fix symlink issues
```

---

## Configuration Schema

### project.yaml Structure

```yaml
name: <project-name>
description: <human-readable description>

source:
  path: <relative-path-to-source-code>

images:
  <image-name>:
    dockerfile: <path-to-dockerfile>
    additionalContexts:
      <context-name>: <path>
    args:
      <ARG_NAME>: <value>
    dependsOn: <other-image>  # Build order dependency

services:
  <service-name>:
    image: <image-name-or-external-image>
    profiles: [<profile-names>]
    deploy: [minikube, dev, test, prod]  # Where this runs
    containerName: <container-name>
    ports: ['host:container']
    volumes: ['host:container']
    environment:
      KEY: value
    dependsOn:
      - service: <other-service>
        condition: service_completed_successfully
    healthcheck:
      test: ['CMD', 'command']
      interval: 10s
      timeout: 5s
      retries: 3

profiles:
  all: [infra, build, app]  # Composite profile
  infra: [<service-names>]
  build: [<service-names>]
  app: [<service-names>]

profileHooks:
  <profile-name>:
    postUp:
      - description: <what-it-does>
        script: <path-to-script>

networks:
  <network-name>:
    driver: bridge

environments:
  minikube:
    registry: local
    ingressClass: nginx
    namespace: <namespace>
  dev:
    registry: <acr-url>
    ingressClass: azure-application-gateway
    namespace: <namespace>

azure:
  prefix: <naming-prefix>
  appCode: <app-code>
  regionCode: <region-code>

terraform:
  stacksPath: terraform/stacks
  configPath: terraform
```

### Terraform Configuration

**stacks.json** - Stack definitions with dependencies:
```json
{
  "environments": ["dev", "test", "prod"],
  "stacks": [
    { "name": "networking", "path": "stacks/networking", "dependencies": [] },
    { "name": "aks", "path": "stacks/aks", "dependencies": ["networking", "acr"] }
  ]
}
```

**environments.json** - Environment-specific settings:
```json
{
  "dev": {
    "subscriptionId": "<azure-subscription-id>",
    "resourceGroupName": "<resource-group>",
    "stateBackendResourceGroup": "<state-rg>",
    "stateBackendStorageAccount": "<storage-account>"
  }
}
```

---

## Deployment Patterns

### Local Development (Minikube)

```
project.yaml → docker-compose.generated.yaml → Docker images → K8s manifests
     ↓
npm run generate -p <project>
     ↓
npm run minikube -p <project> --build
     ↓
Profile execution order: infra → (hooks) → build → app
     ↓
kubectl apply -k manifests/overlays/minikube
```

### Cloud Deployment (AKS)

```
GitHub push/tag → CI/CD workflow → ACR build → AKS deploy
     ↓
_reusable-docker-build.yml (build & push to ACR)
     ↓
_reusable-k8s-deploy.yml (kustomize apply to AKS)
     ↓
kubectl apply -k manifests/overlays/<env>
```

### Infrastructure (Terraform)

```
stacks.json (dependencies) → environments.json (config) → terraform apply
     ↓
Deployment order: networking → keyvault → acr → cosmosdb/redis → aks → ingress
     ↓
State stored in: Azure Storage (srvthredstfstatei274ht)
```

---

## Terraform Infrastructure Stacks

| Stack | Purpose | Dependencies |
|-------|---------|--------------|
| `networking` | VNet, subnets, NSGs | None |
| `keyvault` | Secret management | networking |
| `acr` | Container registry | networking |
| `cosmosdb` | MongoDB (Cosmos DB) | networking, keyvault |
| `redis` | Azure Cache for Redis | networking, keyvault, monitoring |
| `monitoring` | Log Analytics, App Insights | networking |
| `aks` | Kubernetes cluster | networking, acr |
| `nginx-ingress` | Ingress controller | aks, networking |

---

## Azure Naming Convention

Pattern: `{prefix}-{appCode}-{envCode}-{regionCode}-{resourceType}`

| Component | Source | Example |
|-----------|--------|---------|
| prefix | `azure.prefix` | CAZ |
| appCode | `azure.appCode` | SRVTHREDS |
| envCode | Environment | D (dev), T (test), P (prod) |
| regionCode | `azure.regionCode` | E (East US) |

Examples:
- Resource Group: `CAZ-SRVTHREDS-D-E-RG`
- AKS Cluster: `CAZ-SRVTHREDS-D-E-AKS`
- ACR (alphanumeric): `cazsrvthredsdeacr`

---

## Key Design Principles

1. **Configuration-driven** - No hardcoded values; all from project.yaml/stacks.json
2. **--project flag required** - All CLI commands require explicit project selection
3. **Generic deployers** - Deployers execute configs, not project-specific logic
4. **Profile-based orchestration** - Services grouped by profile with hooks between
5. **Kustomize overlays** - Base manifests + environment-specific patches
6. **Dependency-aware deployment** - Terraform stacks deploy in dependency order
7. **Generate then commit** - docker-compose.generated.yaml reviewed before use

---

## Common Tasks

### Adding a New Project

1. Create `projects/<name>/project.yaml`
2. Create `projects/<name>/manifests/base/` with K8s resources
3. Create `projects/<name>/manifests/overlays/{minikube,dev,prod}/`
4. Create `projects/<name>/terraform/stacks.json` and `environments.json`
5. Add npm scripts to package.json
6. Create `.github/workflows/<name>-deploy.yml`

### Adding a New Service

1. Add to `services:` section in project.yaml
2. Add to appropriate profile in `profiles:`
3. Run `npm run generate -p <project>`
4. Create K8s manifest in `manifests/base/`
5. Update overlay kustomization.yaml files

### Adding a New Terraform Stack

1. Create `projects/<project>/terraform/stacks/<name>/`
2. Add to `stacks.json` with dependencies
3. Run `npm run terraform -- init -p <project> <env>`

---

## Troubleshooting Quick Reference

```bash
# Cluster status
minikube status
kubectl cluster-info

# Pod health
kubectl get pods -n <namespace> -o wide
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous  # Crashed container

# Events (shows errors)
kubectl get events -n <namespace> --sort-by='.lastTimestamp'

# Service connectivity
kubectl get services -n <namespace>
kubectl get endpoints -n <namespace>

# Docker status (minikube)
eval $(minikube docker-env)
docker ps
docker logs <container>

# Reset everything
npm run minikube:reset -p <project>
minikube delete && minikube start
```

---

## Files You'll Work With Most

| Purpose | Location |
|---------|----------|
| Project config | `projects/<name>/project.yaml` |
| K8s base manifests | `projects/<name>/manifests/base/*.yaml` |
| Environment overlays | `projects/<name>/manifests/overlays/<env>/` |
| Terraform stacks | `projects/<name>/terraform/stacks/<stack>/` |
| CI/CD workflows | `.github/workflows/<name>-deploy.yml` |
| CLI commands | `tools/cli/commands/` |
| Terraform CLI | `tools/terraform-cli/commands/` |
| Shared utilities | `tools/shared/` |
