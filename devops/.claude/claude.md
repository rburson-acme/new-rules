# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Build, Test, and Lint Commands

```bash
# Install dependencies
npm install

# Type checking
npm run check

# Run all tests
npm run test

# Run a specific test file
npx vitest run tools/terraform-cli/test/unit/init.test.ts

# Run tests with pattern matching
npx vitest run --grep "pattern"

# Format code
npm run format
```

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
npm run minikube:stop -p <project>         # Stop services (keep data) - handles host & minikube Docker
npm run minikube:reset -p <project>        # Full reset (delete volumes) - handles host & minikube Docker
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

## Architecture

### Configuration Flow

```
project.yaml → npm run generate → docker-compose.generated.yaml → Docker images → K8s manifests
```

### Minikube Deployment Flow

```
npm run minikube -p <project> --build
    ↓
1. runPreflightChecks() - Verify Docker, minikube, kubectl installed
    ↓
2. startMinikube() - Start cluster if not running
    ↓
3. Profile execution order:
   - infra:  Docker Compose infrastructure (MongoDB, Redis)
            Runtime: 'host' = host Docker (simulates managed services)
                     'minikube' = minikube's Docker daemon
   - (hooks) Run profile hooks (e.g., setup-repl.sh)
   - build:  Build images into minikube's Docker daemon
   - app:    kubectl apply -k manifests/overlays/minikube
```

### Profile Runtime Configuration

Profiles can specify where their services run via the `runtime` property:

```yaml
profiles:
  all: [infra, build, app]
  infra:
    services: [mongo-repl-1, redis]
    runtime: host      # Runs on host Docker (outside minikube)
  build:
    services: [srvthreds-builder]
    # runtime: minikube (default)
  app:
    services: [srvthreds-bootstrap, srvthreds-engine, ...]
```

| Runtime | Where it runs | Use case |
|---------|---------------|----------|
| `host` | Host Docker daemon | Infrastructure simulating Azure managed services (CosmosDB, Redis) |
| `minikube` | Minikube's Docker daemon | App images that need to be available to K8s pods (default) |

This allows infrastructure services to run outside minikube, simulating how managed services work in Azure (accessible via `host.minikube.internal` from K8s pods).

### Terraform Deployment Flow

```
stacks.json (dependencies) → environments.json (config) → terraform apply
    ↓
Deployment order: networking → keyvault → acr → cosmosdb/redis → aks → nginx-ingress
    ↓
State stored in: Azure Storage account
```

### CI/CD Pipeline (GitHub Actions)

```
GitHub push/tag → _reusable-docker-build.yml → _reusable-k8s-deploy.yml
    ↓
Build images → Push to ACR → Deploy to AKS via kustomize
```

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
