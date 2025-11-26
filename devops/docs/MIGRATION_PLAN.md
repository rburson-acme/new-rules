# DevOps Migration Plan

This document outlines the migration of infrastructure code from `srvthreds/infrastructure/` to the new `devops/` project. This project will handle deployments for all projects in the monorepo.

## Current State

The `srvthreds/infrastructure/` folder contains:

| Component | Description | Lines of Code |
|-----------|-------------|---------------|
| `tools/terraform-cli/` | Azure infrastructure management CLI | ~1,500 |
| `tools/deployment-cli/` | Interactive deployment orchestration | ~800 |
| `tools/kubernetes-deployer/` | TypeScript K8s deployment framework | ~3,500 |
| `tools/shared/` | Common utilities (logger, shell, config) | ~2,000 |
| `cloud/terraform/` | 13 Azure modules, 12 deployment stacks | - |
| `cloud/kubernetes/` | AKS manifests (base/dev/test/prod) | - |
| `local/minikube/` | Local Kubernetes configurations | - |
| `local/docker/` | Docker Compose for local development | - |
| `local/configs/` | Environment files and agent configs | - |
| `config-registry.yaml` | Single source of truth for all configs | - |

---

## Target Structure

```
devops/
├── package.json
├── tsconfig.json
├── CLAUDE.md
├── README.md
│
├── terraform/                    # Infrastructure as Code
│   ├── modules/                  # Reusable, parameterized building blocks
│   │   └── azure/
│   │       ├── aks/
│   │       ├── acr/
│   │       ├── redis/
│   │       ├── cosmosdb/
│   │       └── ...
│   ├── stacks/                   # Project-specific deployment configs
│   │   └── srvthreds/            # srvthreds infrastructure stacks
│   │       ├── networking/
│   │       ├── aks/
│   │       ├── redis/
│   │       └── ...
│   └── state-backend/            # Terraform state storage setup
│
├── kubernetes/                   # Cloud K8s deployments (AKS)
│   ├── base/                     # Shared base manifests (optional)
│   └── srvthreds/                # Project-specific manifests
│       ├── dev/
│       ├── test/
│       └── prod/
│
├── minikube/                     # Local K8s simulation
│   └── srvthreds/                # Project-specific local configs
│
├── tools/                        # CLI tooling
│   ├── terraform-cli/            # Terraform wrapper CLI
│   ├── kubernetes-deployer/      # K8s deployment framework
│   └── shared/                   # Common utilities
│       ├── logger.ts
│       ├── shell.ts
│       ├── config-loader.ts
│       └── error-handler.ts
│
├── configs/                      # Central configuration
│   └── config-registry.yaml      # Single source of truth
│
├── test/
└── docs/
```

### Design Principles

1. **Function-first organization**: Top-level folders represent functionality (`terraform/`, `kubernetes/`, `minikube/`)
2. **Project isolation**: Each project owns its deployment stacks under `{function}/{project}/`
3. **Modules vs Stacks**:
   - **Modules** = Generic, reusable, parameterized building blocks
   - **Stacks** = Project-specific deployment configurations that consume modules
4. **Independent deployments**: Projects can deploy independently without affecting others
5. **Acceptable duplication**: Some duplication across projects is preferred over tight coupling

---

## What Stays in srvthreds

```
srvthreds/
└── infrastructure/
    └── local/
        └── docker/
            ├── compose/
            │   ├── docker-compose-db.yml
            │   └── docker-compose-services.yml
            ├── dockerfiles/
            │   ├── Dockerfile
            │   ├── Dockerfile.builder
            │   └── Dockerfile.cmdRunner
            └── configs/
                ├── .env.local
                └── .env.docker
```

**Rationale:** Local Docker development should be self-contained within the project for quick developer onboarding and testing.

---

## Migration Phases

### Phase 1: Project Setup ✅ COMPLETE
- [x] Create `devops/` directory
- [x] Create `package.json` with dependencies
- [x] Create `tsconfig.json`
- [x] Create `CLAUDE.md` with project instructions
- [x] Create `README.md`

### Phase 2: Terraform Infrastructure ✅ COMPLETE
Migration and validation of Terraform modules and CLI tooling.

- [x] Copy terraform modules to `devops/terraform/modules/`
- [x] Copy terraform stacks to `devops/terraform/stacks/srvthreds/`
- [x] Reorganize from `cloud/terraform/` to `terraform/` structure
- [x] Copy `tools/terraform-cli/` to `devops/tools/`
- [x] Copy `tools/shared/` to `devops/tools/`
- [x] Copy `configs/` (config-registry, terraform configs)
- [x] Update import paths in terraform-cli
- [x] **TEST**: Run terraform-cli commands from devops

### Phase 3: Kubernetes Deployment ✅ COMPLETE
Migration and validation of Kubernetes manifests and deployment CLI.

- [x] Reorganize from `cloud/kubernetes/` to `kubernetes/srvthreds/` structure
- [x] Copy `tools/kubernetes-deployer/` to `devops/tools/`
- [x] Update import paths in kubernetes-deployer
- [x] **TEST**: AKS deployer CLI runs from devops (`npm run aks:deploy -- --help`)

### Phase 4: Minikube (Local K8s) ✅ COMPLETE
Migration of local Kubernetes simulation environment.

- [x] Copy `local/minikube/` to `devops/minikube/srvthreds/`
- [x] Copy relevant configs from `local/configs/` (.env.minikube, .env.kubernetes, agents/)
- [x] Update minikube scripts for new paths
- [x] **TEST**: Minikube CLI runs from devops (`npm run minikube:deploy -- --help`)

### Phase 5: Cleanup srvthreds
Remove migrated code from source project.

- [ ] Remove migrated folders from `srvthreds/infrastructure/`
- [ ] Update `srvthreds/package.json` scripts
- [ ] Keep only local Docker configurations
- [ ] Test local development workflow still works

### Phase 6: Multi-Project Support (Future)
Refactor tooling for enterprise multi-project support.

- [ ] Refactor terraform-cli for project selection
- [ ] Refactor kubernetes-deployer for project context
- [ ] Add support for thredclient, demo-env projects
- [ ] Document project onboarding process

### Phase 7: Cleanup & Documentation (Future)
Code consolidation and documentation.

- [ ] Consolidate duplicate utilities (logger, shell, etc.)
- [ ] Remove redundant code paths
- [ ] Standardize error handling
- [ ] Write comprehensive documentation

---

## Cleanup Opportunities

### Duplicate Code to Consolidate

1. **Logger implementations**
   - `tools/shared/logger.ts`
   - `tools/kubernetes-deployer/src/utils/Logger.ts`
   → Consolidate to single `tools/shared/logger.ts`

2. **Shell execution**
   - `tools/shared/shell.ts`
   - `tools/kubernetes-deployer/src/utils/Shell.ts`
   → Consolidate to single `tools/shared/shell.ts`

3. **Error handling**
   - `tools/shared/error-handler.ts`
   - `tools/kubernetes-deployer/src/utils/Errors.ts`
   → Unify error classes

### Configuration Simplification

1. **Environment files** - Too many `.env.*` variants
   - Consolidate to template-based generation

2. **Agent configs** - Duplicated across locations
   - Single source in config-registry

3. **Kustomize overlays** - Redundant base configurations
   - Better use of patches

---

## npm Scripts Design

### devops/package.json

```json
{
  "name": "devops",
  "scripts": {
    "terraform": "tsx tools/terraform-cli/cli.ts",
    "k8s": "tsx tools/kubernetes-deployer/src/index.ts",

    "tf:plan": "npm run terraform -- plan",
    "tf:apply": "npm run terraform -- deploy",
    "tf:destroy": "npm run terraform -- destroy",
    "tf:status": "npm run terraform -- status",

    "minikube:create": "npm run k8s -- minikube create",
    "minikube:apply": "npm run k8s -- minikube apply",

    "aks:deploy": "npm run k8s -- aks deploy",
    "aks:status": "npm run k8s -- aks status",

    "config:generate": "tsx tools/shared/config/generator.ts",
    "config:validate": "tsx tools/shared/config/validator.ts",

    "test": "vitest --run",
    "check": "tsc --noEmit"
  }
}
```

---

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Project name | `devops` | Industry standard, not specific to one area |
| Local Docker location | Stay in srvthreds | Developer convenience for quick testing |
| Package manager | npm | Consistency with existing projects |
| Config registry | Move to devops | Central location for all projects |
| Directory structure | Function-first (`terraform/`, `kubernetes/`) | Cleaner navigation, less nesting |
| Stack organization | Per-project (`stacks/srvthreds/`) | Independent deployments, no coupling |
| Migration approach | Incremental with testing | Validate each piece before proceeding |

---

## Next Steps

1. ~~Reorganize existing `cloud/` directories to new structure~~
2. ~~Migrate terraform-cli and shared tools~~
3. ~~Test terraform commands work from new location~~
4. ~~Proceed to kubernetes deployment migration~~
5. Complete Phase 5 cleanup of srvthreds
6. Begin Unified Deployment Framework analysis (Phase 8)

---

## Phase 8: Future Vision - Unified Deployment Framework

### Overview

This phase outlines a strategic vision for consolidating the deployment infrastructure into a unified framework that serves multiple deployment targets while maintaining separation of concerns between developers and DevOps.

### Goals

1. **Clean Developer Experience**: Developers focus on code, not infrastructure. Local development "just works" with containers.
2. **Clean DevOps Patterns**: Standardized, repeatable patterns for cloud infrastructure and application deployments.
3. **Unified CLI Interface**: Single entry point for all deployment operations across environments.
4. **Testing First**: Comprehensive TypeScript testing ensures framework reliability and maintainability.
5. **Minimal Project Coupling**: Projects define only what's unique; framework handles the rest.

### Key Deliverables by Resource Type

| Resource Type | Developer Concern | DevOps Concern |
|--------------|-------------------|----------------|
| **Local (Minikube)** | `npm run dev` starts everything | Simulate cloud-like K8s environment |
| **Cloud Infrastructure** | None | Terraform modules, state management, networking |
| **Cloud Applications** | Container builds via srvthreds | K8s manifests, secrets, scaling, ingress |

### Architecture: Layered Deployment Framework

```
┌─────────────────────────────────────────────────────────────────┐
│                    Unified CLI Interface                         │
│         npm run deploy -- <target> <environment> <action>        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Deployment Orchestrator                       │
│  • Reads project configs from projects/{project}/deployment.yaml │
│  • Resolves dependencies between infrastructure and applications │
│  • Coordinates multi-step deployments                            │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ InfraDeployer   │ │   AppDeployer   │ │  LocalDeployer  │
│ (Terraform)     │ │  (Kubernetes)   │ │   (Minikube)    │
│                 │ │                 │ │                 │
│ • Plan/Apply    │ │ • Build images  │ │ • Start cluster │
│ • State mgmt    │ │ • Push to ACR   │ │ • Setup DBs     │
│ • Outputs       │ │ • Apply manifests│ │ • Apply manifests│
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Infrastructure                         │
│  • ShellExecutor (unified command execution)                     │
│  • Logger (consistent logging across all deployers)              │
│  • ConfigLoader (project + environment config resolution)        │
│  • StateManager (deployment state tracking)                      │
│  • ErrorHandler (consistent error patterns)                      │
└─────────────────────────────────────────────────────────────────┘
```

### Project Configuration Contract

Each project that uses the deployment framework must provide minimal configuration. The goal is to keep this as small as possible while allowing project-specific customization.

**Location**: `devops/projects/{project}/deployment.yaml`

```yaml
# projects/srvthreds/deployment.yaml
project:
  name: srvthreds
  description: Event-driven workflow automation backend

# Reference to source project for container builds
source:
  path: ../srvthreds
  buildCommand: npm run deploymentCli -- {environment} build_server

# Services this project deploys
services:
  - name: engine
    image: srvthreds/engine
  - name: session-agent
    image: srvthreds/session-agent
  - name: persistence-agent
    image: srvthreds/persistence-agent
  - name: bootstrap
    image: srvthreds/bootstrap
    type: job  # One-time execution

# Infrastructure requirements (references terraform stacks)
infrastructure:
  stacks:
    - networking
    - aks
    - acr
    - cosmosdb
    - redis
    - keyvault

# Environment-specific overrides
environments:
  dev:
    replicas: 1
  test:
    replicas: 2
  prod:
    replicas: 3
    resources:
      limits:
        cpu: "2"
        memory: "4Gi"
```

### Consolidation Targets

#### 1. Unified Base Deployer

Currently we have separate deployer implementations with duplicated logic. Consolidate into:

```
tools/deployment-framework/
├── src/
│   ├── core/
│   │   ├── BaseDeployer.ts      # Abstract base with shared lifecycle
│   │   ├── DeploymentState.ts   # Track deployment progress
│   │   └── DeploymentConfig.ts  # Load and validate project configs
│   ├── deployers/
│   │   ├── InfraDeployer.ts     # Terraform operations
│   │   ├── AppDeployer.ts       # Kubernetes operations (AKS)
│   │   └── LocalDeployer.ts     # Minikube operations
│   ├── shared/
│   │   ├── shell.ts             # Single shell executor
│   │   ├── logger.ts            # Single logger
│   │   └── errors.ts            # Unified error classes
│   └── cli/
│       └── index.ts             # Unified CLI entry point
└── test/
    ├── unit/
    └── integration/
```

#### 2. Configuration Flow

```
config-registry.yaml (global)
        │
        ▼
projects/{project}/deployment.yaml (project-specific)
        │
        ▼
Environment resolution (dev/test/prod)
        │
        ▼
Generated configs (K8s ConfigMaps, Terraform vars)
```

#### 3. Build Responsibility Matrix

| Concern | Owner | Location |
|---------|-------|----------|
| Dockerfile definitions | Project (srvthreds) | `srvthreds/infrastructure/local/docker/` |
| docker-compose files | Project (srvthreds) | `srvthreds/infrastructure/local/docker/` |
| Build orchestration | Project (deploymentCli) | `srvthreds/infrastructure/tools/deployment-cli/` |
| K8s manifests | DevOps | `devops/kubernetes/{project}/` |
| Terraform modules | DevOps | `devops/terraform/modules/` |
| Deployment automation | DevOps | `devops/tools/deployment-framework/` |

### Testing Strategy

Testing is critical for framework reliability. All TypeScript code must have comprehensive tests.

#### Test Categories

| Category | Purpose | Location |
|----------|---------|----------|
| Unit Tests | Test individual functions/classes in isolation | `tools/*/test/unit/` |
| Integration Tests | Test deployer workflows with mocked infrastructure | `tools/*/test/integration/` |
| E2E Tests | Full deployment cycles (manual or CI) | `test/e2e/` |

#### Testing Requirements

1. **Minimum 80% code coverage** for shared utilities
2. **Mock-based testing** for shell commands and external APIs
3. **Snapshot testing** for generated configurations
4. **Pre-commit hooks** to run tests before pushes

#### Example Test Structure

```typescript
// tools/deployment-framework/test/unit/ConfigLoader.test.ts
describe('ConfigLoader', () => {
  it('should load project config from deployment.yaml', async () => {
    const config = await ConfigLoader.load('srvthreds');
    expect(config.project.name).toBe('srvthreds');
    expect(config.services).toHaveLength(4);
  });

  it('should merge environment-specific overrides', async () => {
    const config = await ConfigLoader.load('srvthreds', 'prod');
    expect(config.replicas).toBe(3);
  });

  it('should throw on missing project config', async () => {
    await expect(ConfigLoader.load('nonexistent'))
      .rejects.toThrow('Project config not found');
  });
});
```

### Implementation Phases

#### Phase 8.1: Analysis & Design
- [ ] Document all current deployment paths (local, minikube, AKS)
- [ ] Identify all duplicated code across tools
- [ ] Design unified deployer interface
- [ ] Define project configuration contract
- [ ] Create testing strategy document

#### Phase 8.2: Shared Infrastructure Consolidation
- [ ] Create single ShellExecutor with full feature set
- [ ] Create single Logger with configurable outputs
- [ ] Create unified error class hierarchy
- [ ] Create ConfigLoader for project configs
- [ ] Write unit tests for all shared utilities (80%+ coverage)

#### Phase 8.3: Deployer Unification
- [ ] Create BaseDeployer with lifecycle hooks
- [ ] Refactor MinikubeDeployer to extend BaseDeployer
- [ ] Refactor AKSDeployer to extend BaseDeployer
- [ ] Create InfraDeployer for Terraform operations
- [ ] Write integration tests for each deployer

#### Phase 8.4: Unified CLI
- [ ] Design CLI interface and command structure
- [ ] Implement deployment orchestrator
- [ ] Add project selection and environment targeting
- [ ] Create comprehensive help documentation
- [ ] Write CLI integration tests

#### Phase 8.5: Project Onboarding
- [ ] Create project config templates
- [ ] Document onboarding process
- [ ] Migrate srvthreds to new framework
- [ ] Validate thredclient can be onboarded
- [ ] Create demo-env project configuration

### Success Criteria

1. **Developer Experience**: Running `npm run dev` in project root starts local environment within 2 minutes
2. **DevOps Efficiency**: Single command deploys full stack to any environment
3. **Code Quality**: All TypeScript passes strict type checking with no errors
4. **Test Coverage**: 80%+ coverage on shared utilities, 60%+ on deployers
5. **Documentation**: All public APIs documented with JSDoc
6. **Maintainability**: New project onboarding takes < 1 hour with documentation

### Open Questions

1. **Build location**: Should all container builds happen via srvthreds' deploymentCli, or should devops have its own build capability?
   - Current decision: srvthreds owns builds, devops calls deploymentCli

2. **Config generation**: Should Kubernetes manifests be fully generated from deployment.yaml, or continue with Kustomize overlays?
   - Current decision: Kustomize overlays with generated patches

3. **State management**: How to track which infrastructure is deployed across projects?
   - Terraform state per stack, deployment state in local files

4. **Secret handling**: Unified approach to secrets across environments?
   - Azure Key Vault for cloud, local .env for development
