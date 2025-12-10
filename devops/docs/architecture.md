# Architecture Overview

This document describes the architecture of the DevOps toolkit, including system design, component relationships, and deployment patterns.

## System Goals

1. **Local-to-Cloud Parity**: Minikube deployments mirror AKS cloud deployments using identical patterns
2. **Configuration-Driven**: All behavior derived from configuration files, not hardcoded values
3. **Multi-Project Support**: Single toolkit supporting multiple independent projects
4. **Reusable Infrastructure**: Terraform modules extensible across projects and environments

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DevOps Toolkit                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │   Main CLI      │    │  Terraform CLI  │    │  GitHub Actions │        │
│  │  (tools/cli/)   │    │ (terraform-cli/)│    │   (.github/)    │        │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘        │
│           │                      │                      │                  │
│           ▼                      ▼                      ▼                  │
│  ┌─────────────────────────────────────────────────────────────────┐      │
│  │                    Shared Utilities (tools/shared/)              │      │
│  │              Logger │ Shell │ Error Handler │ Config Loader      │      │
│  └─────────────────────────────────────────────────────────────────┘      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Configuration Layer                                 │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │  project.yaml   │    │   stacks.json   │    │ environments.json│        │
│  │ (services,      │    │ (terraform      │    │ (Azure config)  │        │
│  │  images,        │    │  dependencies)  │    │                 │        │
│  │  profiles)      │    │                 │    │                 │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           Deployment Targets                                 │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐        │
│  │    Minikube     │    │   Azure AKS     │    │   Azure Infra   │        │
│  │ (local K8s)     │    │  (cloud K8s)    │    │   (Terraform)   │        │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Main CLI (`tools/cli/`)

The main CLI orchestrates local development workflows.

```
tools/cli/
├── cli.ts                    # Entry point (yargs)
├── commands/
│   ├── generate.ts           # Generate docker-compose from project.yaml
│   └── minikube.ts           # Minikube deployment orchestration
├── generators/
│   └── docker-compose.ts     # YAML generation logic
├── schemas/
│   └── project-config.ts     # TypeScript interfaces
└── utils/
    └── project-loader.ts     # YAML loading & validation
```

**Command Flow:**
```
npm run minikube -p srvthreds --build
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ 1. runPreflightChecks()                                 │
│    - Verify Docker, minikube, kubectl installed         │
│                                                         │
│ 2. startMinikube()                                      │
│    - Start cluster if not running                       │
│    - Configure CPU, memory, addons                      │
│                                                         │
│ 3. expandProfileOrder() → [infra, build, app]           │
│                                                         │
│ 4. For each profile:                                    │
│    ├─ infra:  startInfrastructure() [Docker Compose]    │
│    │          runProfileHooks() [setup-repl.sh]         │
│    ├─ build:  buildImages() [Minikube Docker daemon]    │
│    └─ app:    deployToKubernetes() [kubectl apply -k]   │
└─────────────────────────────────────────────────────────┘
```

### 2. Terraform CLI (`tools/terraform-cli/`)

Orchestrates Azure infrastructure deployment with dependency management.

```
tools/terraform-cli/
├── cli.ts                    # Entry point (custom dispatcher)
├── commands/
│   ├── deploy.ts             # Deploy with dependencies
│   ├── destroy.ts            # Destroy in reverse order
│   ├── init.ts               # Initialize & pull state
│   ├── plan.ts               # Preview changes
│   ├── state.ts              # State management
│   ├── bootstrap.ts          # Setup backend
│   └── ...                   # Other commands
├── utils/
│   ├── terraform.ts          # TerraformManager class
│   └── args.ts               # Argument parsing
└── types/
    └── *.types.ts            # TypeScript interfaces
```

**Dependency Resolution:**
```
┌───────────────────────────────────────────────────────────┐
│                    stacks.json                            │
│                                                           │
│  networking ──┬─► keyvault                                │
│               ├─► acr ────────────┐                       │
│               ├─► cosmosdb        │                       │
│               ├─► redis           ▼                       │
│               ├─► monitoring      aks ──► nginx-ingress   │
│               └─► servicebus                              │
│                                                           │
│  Deployment Order (topological sort):                     │
│  1. networking                                            │
│  2. keyvault, acr, cosmosdb, redis, monitoring (parallel) │
│  3. aks                                                   │
│  4. nginx-ingress                                         │
│                                                           │
│  Destruction Order (reverse):                             │
│  1. nginx-ingress                                         │
│  2. aks                                                   │
│  3. redis, cosmosdb, acr, keyvault, monitoring (parallel) │
│  4. networking                                            │
└───────────────────────────────────────────────────────────┘
```

### 3. Shared Utilities (`tools/shared/`)

Common functionality used across all CLIs.

| Module | Purpose |
|--------|---------|
| `logger.ts` | Context-aware logging with levels (DEBUG, INFO, WARN, ERROR) |
| `shell.ts` | Sync/async command execution with streaming output |
| `error-handler.ts` | Error hierarchy (CLIError, ValidationError, etc.) |
| `config-loader.ts` | JSON config loading with caching |

### 4. GitHub Actions (`.github/workflows/`)

CI/CD pipelines for automated cloud deployments.

```
.github/workflows/
├── _reusable-docker-build.yml   # Build & push to ACR
├── _reusable-k8s-deploy.yml     # Deploy to AKS
└── srvthreds-deploy.yml         # Project-specific orchestration
```

**Pipeline Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│                    srvthreds-deploy.yml                     │
│                                                             │
│  Triggers:                                                  │
│  - Push to main (projects/srvthreds/**)                     │
│  - Tags (v*)                                                │
│  - Manual (workflow_dispatch)                               │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ prepare │───►│  build  │───►│ dev     │───►│ test    │  │
│  │ (tag)   │    │ (ACR)   │    │ (AKS)   │    │ (AKS)   │  │
│  └─────────┘    └─────────┘    └─────────┘    └────┬────┘  │
│                                                     │       │
│                                              ┌──────▼──────┐│
│                                              │    prod     ││
│                                              │   (AKS)     ││
│                                              │ + approval  ││
│                                              └─────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Configuration Architecture

### project.yaml - Single Source of Truth

```yaml
# Metadata
name: srvthreds
description: Event-driven workflow automation backend

# Source code location
source:
  path: ../../../srvthreds

# Docker images to build
images:
  builder:
    dockerfile: docker/dockerfiles/Dockerfile.builder
    additionalContexts:
      thredlib: ../../../thredlib
  app:
    dockerfile: docker/dockerfiles/Dockerfile
    dependsOn: builder

# Services and their deployment targets
services:
  mongo-repl-1:
    image: mongo:latest
    profiles: [infra]
    deploy: [minikube]        # Infrastructure only in local

  srvthreds-engine:
    image: app
    profiles: [app]
    deploy: [minikube, dev, test, prod]  # All environments

# Profile execution order
profiles:
  all: [infra, build, app]
  infra: [mongo-repl-1, redis]
  build: [srvthreds-builder]
  app: [srvthreds-bootstrap, srvthreds-engine, ...]

# Hooks between profiles
profileHooks:
  infra:
    postUp:
      - script: scripts/setup-repl.sh

# Environment-specific configuration
environments:
  minikube:
    registry: local
    namespace: srvthreds
  dev:
    registry: cazsrvthredsdeacr.azurecr.io
    namespace: srvthreds
```

### Configuration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Configuration Flow                                 │
│                                                                          │
│  project.yaml ──► npm run generate ──► docker-compose.generated.yaml    │
│       │                                          │                       │
│       │                                          ▼                       │
│       │          ┌───────────────────────────────────────────────┐      │
│       │          │         Docker Compose                        │      │
│       │          │  - Services filtered by deploy: [minikube]    │      │
│       │          │  - Build contexts resolved to absolute paths  │      │
│       │          │  - Profiles for selective startup             │      │
│       │          └───────────────────────────────────────────────┘      │
│       │                                                                  │
│       ▼                                                                  │
│  ┌───────────────────────────────────────────────────────────────┐      │
│  │                   Kubernetes Manifests                         │      │
│  │                                                                │      │
│  │  manifests/base/           manifests/overlays/                 │      │
│  │  ├─ namespace.yaml         ├─ minikube/                       │      │
│  │  ├─ configmap.yaml         │  ├─ kustomization.yaml           │      │
│  │  ├─ srvthreds-engine.yaml  │  ├─ rabbitmq.yaml                │      │
│  │  └─ ...                    │  └─ configmap-minikube.yaml      │      │
│  │                            ├─ dev/                            │      │
│  │                            │  ├─ kustomization.yaml           │      │
│  │                            │  └─ image-pull-policy.yaml       │      │
│  │                            └─ prod/                           │      │
│  │                               ├─ kustomization.yaml           │      │
│  │                               └─ configmap-prod.yaml          │      │
│  └───────────────────────────────────────────────────────────────┘      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

## Kubernetes Architecture

### Kustomize Overlay Strategy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Base Manifests                                   │
│                                                                         │
│  manifests/base/                                                        │
│  ├─ namespace.yaml      → Creates srvthreds namespace                   │
│  ├─ configmap.yaml      → Base environment variables                    │
│  ├─ srvthreds-engine.yaml                                               │
│  │    └─ image: srvthreds:dev  (generic placeholder)                    │
│  │    └─ imagePullPolicy: Never (local default)                         │
│  └─ kustomization.yaml  → Lists all resources                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│    Minikube     │    │        Dev          │    │       Prod          │
│                 │    │                     │    │                     │
│ images:         │    │ images:             │    │ images:             │
│  srvthreds →    │    │  srvthreds →        │    │  srvthreds →        │
│  srvthreds/app  │    │  cazsrvthredsdeacr  │    │  cazsrvthredspacr   │
│  :latest        │    │  .azurecr.io/...    │    │  .azurecr.io/...    │
│                 │    │                     │    │                     │
│ patches:        │    │ patches:            │    │ replicas:           │
│  configmap-     │    │  imagePullPolicy:   │    │  engine: 3          │
│  minikube.yaml  │    │  Always             │    │  session-agent: 2   │
│                 │    │                     │    │  persistence: 2     │
│ resources:      │    │                     │    │                     │
│  + rabbitmq.yaml│    │                     │    │ patches:            │
│                 │    │                     │    │  configmap-prod     │
└─────────────────┘    └─────────────────────┘    └─────────────────────┘
```

### Service Deployment Pattern

All environments use the same deployment approach:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Deployment Pattern                                    │
│                                                                         │
│  1. kubectl apply -k manifests/overlays/<env>                           │
│     └─► Kustomize merges base + overlay                                 │
│                                                                         │
│  2. Resources created:                                                  │
│     ├─ Namespace: srvthreds                                             │
│     ├─ ConfigMap: srvthreds-config                                      │
│     ├─ Deployments: engine, session-agent, persistence-agent            │
│     └─ Services: ClusterIP for each deployment                          │
│                                                                         │
│  3. Image resolution:                                                   │
│     ├─ Minikube: srvthreds/app:latest (local Docker daemon)             │
│     ├─ Dev: cazsrvthredsdeacr.azurecr.io/srvthreds/app:sha-abc123       │
│     └─ Prod: cazsrvthredspacr.azurecr.io/srvthreds/app:1.2.3            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Terraform Infrastructure Architecture

### Stack Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Stacks                                 │
│                                                                         │
│                          ┌─────────────┐                                │
│                          │  networking │ (foundation)                   │
│                          └──────┬──────┘                                │
│                                 │                                       │
│         ┌───────────┬───────────┼───────────┬───────────┐              │
│         ▼           ▼           ▼           ▼           ▼              │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────────┐        │
│    │keyvault │ │   acr   │ │cosmosdb │ │  redis  │ │monitoring│        │
│    └────┬────┘ └────┬────┘ └─────────┘ └─────────┘ └──────────┘        │
│         │           │                                                   │
│         │           │    ┌─────────────────────────────────────┐       │
│         └───────────┴───►│              aks                    │       │
│                          │  - Private cluster                  │       │
│                          │  - Workload Identity                │       │
│                          │  - Key Vault CSI provider           │       │
│                          └─────────────┬───────────────────────┘       │
│                                        │                                │
│                                        ▼                                │
│                              ┌─────────────────┐                        │
│                              │  nginx-ingress  │                        │
│                              │  (Helm chart)   │                        │
│                              └─────────────────┘                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Azure Resources by Stack

| Stack | Resources Created |
|-------|-------------------|
| **networking** | VNet, 5 Subnets, 5 NSGs |
| **keyvault** | Key Vault + Private Endpoint |
| **acr** | Container Registry + Private Endpoint |
| **cosmosdb** | Cosmos DB (MongoDB API) + Private Endpoint |
| **redis** | Azure Cache for Redis + Private Endpoint + Diagnostics |
| **monitoring** | Log Analytics Workspace + Application Insights |
| **aks** | AKS Cluster + Node Pool + Namespace + Workload Identity |
| **nginx-ingress** | NGINX Ingress Controller (Helm) |

### State Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Terraform State Backend                               │
│                                                                         │
│  Azure Storage Account: srvthredstfstatei274ht                          │
│  Container: tfstate                                                     │
│                                                                         │
│  State File Pattern: stacks/{stack-name}/{environment}.tfstate          │
│                                                                         │
│  Examples:                                                              │
│  ├─ stacks/networking/dev.tfstate                                       │
│  ├─ stacks/aks/dev.tfstate                                              │
│  ├─ stacks/networking/prod.tfstate                                      │
│  └─ stacks/aks/prod.tfstate                                             │
│                                                                         │
│  Features:                                                              │
│  ├─ Blob versioning (30-day retention)                                  │
│  ├─ Geo-redundant storage (GRS)                                         │
│  ├─ Management lock (CanNotDelete)                                      │
│  └─ TLS 1.2 minimum                                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Architecture

### Network Security

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Network Security Model                                │
│                                                                         │
│  VNet: CAZ-SRVTHREDS-{ENV}-E-NET-VNET                                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Gateway Subnet                                                  │   │
│  │  └─ NSG: Allow 80/443/65200-65535 from Internet                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  ┌───────────────────────────▼─────────────────────────────────────┐   │
│  │  AKS Subnet                                                      │   │
│  │  └─ NSG: Allow from Gateway, AKS internal, Internet, LB         │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│  ┌───────────────────────────▼─────────────────────────────────────┐   │
│  │  Private Endpoint Subnet                                         │   │
│  │  └─ NSG: Allow from AKS and Support subnets only                │   │
│  │  └─ Services: ACR, Key Vault, Cosmos DB, Redis, Service Bus     │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Data Subnet                                                     │   │
│  │  └─ NSG: Allow from Private Endpoint subnet only                │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Workload Identity Flow                                │
│                                                                         │
│  ┌─────────────────┐                                                    │
│  │  AKS Pod        │                                                    │
│  │  (srvthreds-    │                                                    │
│  │   engine)       │                                                    │
│  └────────┬────────┘                                                    │
│           │                                                             │
│           │ ServiceAccount: srvthreds-workload                          │
│           │ Annotation: azure.workload.identity/client-id               │
│           ▼                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐     │
│  │ Azure AD OIDC   │───►│ User-Assigned   │───►│   Key Vault     │     │
│  │ Token Exchange  │    │ Managed Identity│    │   (Secrets)     │     │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘     │
│                                                          │              │
│                                                          ▼              │
│                                               ┌─────────────────┐       │
│                                               │ SecretProvider  │       │
│                                               │ Class (CSI)     │       │
│                                               │ - mongo-conn    │       │
│                                               │ - redis-pass    │       │
│                                               └─────────────────┘       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Naming Conventions

### Azure Resources

Pattern: `{prefix}-{appCode}-{envCode}-{regionCode}-{resourceType}`

| Component | Values | Example |
|-----------|--------|---------|
| prefix | CAZ | CAZ |
| appCode | SRVTHREDS | SRVTHREDS |
| envCode | D, T, P | D (dev) |
| regionCode | E | E (East US) |
| resourceType | RG, AKS, KEY, etc. | AKS |

**Examples:**
- `CAZ-SRVTHREDS-D-E-RG` (Resource Group)
- `CAZ-SRVTHREDS-D-E-AKS` (AKS Cluster)
- `cazsrvthredsdeacr` (ACR - alphanumeric only)

### Kubernetes Resources

| Resource | Naming Pattern | Example |
|----------|---------------|---------|
| Namespace | `{project}` | `srvthreds` |
| Deployment | `{project}-{service}` | `srvthreds-engine` |
| Service | `{deployment}-service` | `srvthreds-engine-service` |
| ConfigMap | `{project}-config` | `srvthreds-config` |

### Docker Images

| Context | Pattern | Example |
|---------|---------|---------|
| Local | `{project}/{image}:latest` | `srvthreds/app:latest` |
| ACR | `{registry}/{project}/{image}:{tag}` | `cazsrvthredsdeacr.azurecr.io/srvthreds/app:sha-abc123` |
