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

### Phase 3: Kubernetes Deployment
Migration and validation of Kubernetes manifests and deployment CLI.

- [x] Reorganize from `cloud/kubernetes/` to `kubernetes/srvthreds/` structure
- [ ] Copy `tools/kubernetes-deployer/` to `devops/tools/`
- [ ] Update import paths in kubernetes-deployer
- [ ] **TEST**: Deploy artifacts to AKS using CLI from devops

### Phase 4: Minikube (Local K8s)
Migration of local Kubernetes simulation environment.

- [ ] Copy `local/minikube/` to `devops/minikube/srvthreds/`
- [ ] Copy relevant configs from `local/configs/`
- [ ] Update minikube scripts for new paths
- [ ] **TEST**: Spin up minikube and deploy locally

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

1. Reorganize existing `cloud/` directories to new structure
2. Migrate terraform-cli and shared tools
3. Test terraform commands work from new location
4. Proceed to kubernetes deployment migration
