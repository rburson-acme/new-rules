# DevOps Migration Plan

This document outlines the migration of infrastructure code from `srvthreds/infrastructure/` to the `devops/` project, along with consolidation efforts to prepare for an enterprise-ready solution.

## Current State Summary

### What's Done
- Phases 1-4 complete: Project setup, Terraform, Kubernetes, Minikube structure migrated
- Phase 5.1/5.2 complete: Removed migrated cloud/terraform and cloud/kubernetes from srvthreds

### What's Blocked
- Phase 5.3: Cannot remove `deployment-cli` from srvthreds because devops deployers still call it
- Enterprise patterns: No project abstraction, hardcoded paths, duplicate utilities

### Key Problems to Solve
1. **Two logger implementations** - Neither uses thredlib's standard Logger
2. **Shell scripts scattered** - Bash scripts in minikube/ and terraform/ should be TypeScript
3. **CLI/Deployer coupling** - CLIs are thin wrappers with manual arg parsing
4. **No unit test coverage** - Only 4 test files exist
5. **deploymentCli dependency** - Bidirectional dependency between devops and srvthreds
6. **Docker compose generation complexity** - Adds indirection, merge conflicts

---

## Revised Action Plan

### Phase A: Quick Wins - Logger Consolidation ✅ COMPLETE

**Goal:** Single logger implementation using thredlib's Logger pattern

**Tasks:**
- [x] A.1: Add thredlib as dependency to devops
- [x] A.2: Create `tools/shared/logger.ts` wrapper that uses thredlib's Logger
- [x] A.3: Update `tools/terraform-cli/` to use shared logger
- [x] A.4: Update `tools/kubernetes-deployer/` to use shared logger
- [x] A.5: CLI files use the shared logger
- [x] A.6: Delete `tools/kubernetes-deployer/src/utils/logger.ts` (consolidated into shared)
- [x] A.7: Updated tests to mock thredlib's Logger

**Result:** Single `ContextLogger` class in `tools/shared/logger.ts` that:
- Wraps thredlib's Logger for consistency across monorepo
- Provides context-aware prefixing (`[ContextName] message`)
- Exports both singleton `logger` and `ContextLogger` class

**Outcome:** One logger implementation, all tests passing.

---

### Phase B: Script Migration to TypeScript

**Goal:** Eliminate bash scripts, move logic into TypeScript commands

#### B.1: Minikube Scripts ✅ COMPLETE
| Script | Status |
|--------|--------|
| `setup-minikube.sh` | ✅ DELETED - covered by MinikubeDeployer.startMinikube() |
| `reset-minikube.sh` | ✅ DELETED - covered by MinikubeDeployer.resetDeployment() |
| `cleanup-minikube.sh` | ✅ DELETED - covered by MinikubeDeployer.destroyCluster() |
| `validate-minikube.sh` | ✅ DELETED - covered by MinikubeDeployer.runValidation() |
| `switch-to-minikube.sh` | ✅ DELETED - use `kubectl config use-context minikube` |
| `list-contexts.sh` | ✅ DELETED - use `kubectl config get-contexts` |
| `debug-mongodb.sh` | KEPT - useful troubleshooting utility |

#### B.2: Terraform Scripts
| Script | Action |
|--------|--------|
| `pre-commit-hook.sh` | Keep - git hooks need to be shell |
| `install-git-hooks.sh` | Keep - installs shell hooks |
| `validate-security.sh` | Move to terraform-cli `validate` command |
| `fix-symlink-consistency.sh` | Move to terraform-cli `fix-symlinks` command |
| `recover-state.sh` | Move to terraform-cli `recover` command |
| `import-resource.sh` | Move to terraform-cli `import` command |

**Outcome:** Only git hook scripts remain as bash.

---

### Phase C: CLI Simplification

**Goal:** Clean CLI layer with proper arg parsing, minimal duplication

**Current Problems:**
- Manual `process.argv` parsing
- Duplicate output formatting in each CLI
- Some CLIs call deployers, some call bash scripts

**Tasks:**
- [ ] C.1: Create unified CLI entry point using yargs (already a dependency)
- [ ] C.2: Define subcommands: `minikube`, `aks`, `terraform`
- [ ] C.3: Each subcommand delegates to appropriate deployer/tool
- [ ] C.4: Shared output formatting in one place
- [ ] C.5: Remove individual CLI files, update package.json scripts

**Target CLI Structure:**
```
npm run devops -- minikube deploy [--dry-run] [--skip-db] [-v]
npm run devops -- minikube reset
npm run devops -- minikube cleanup [--delete-dbs]
npm run devops -- aks deploy <env> [--dry-run] [-v]
npm run devops -- terraform plan <env>
npm run devops -- terraform apply <env>
```

**Outcome:** Single CLI entry point, consistent UX, less code duplication.

---

### Phase D: Unit Test Foundation

**Goal:** Test coverage for core utilities, enabling safe refactoring

**Priority Order:**
1. `tools/shared/shell.ts` - Most critical, used everywhere
2. `tools/shared/logger.ts` - After consolidation
3. `tools/shared/error-handler.ts` - Error patterns
4. `tools/shared/config-loader.ts` - Config parsing
5. `tools/kubernetes-deployer/src/utils/retry.ts` - Already has tests, expand
6. `tools/kubernetes-deployer/src/operations/KubernetesClient.ts` - Mock kubectl

**Tasks:**
- [ ] D.1: Set up vitest config with coverage reporting
- [ ] D.2: Write tests for shell.ts with mocked child_process
- [ ] D.3: Write tests for config-loader.ts
- [ ] D.4: Write tests for error-handler.ts
- [ ] D.5: Expand KubernetesClient tests
- [ ] D.6: Add pre-commit hook to run tests

**Target:** 80% coverage on shared utilities.

---

### Phase E: Decouple from deploymentCli

**Goal:** devops can build/deploy without calling srvthreds' deploymentCli

**Current Dependency:**
- MinikubeDeployer calls `npm run deploymentCli -- minikube build_server`
- MinikubeDeployer calls `npm run deploymentCli -- minikube s_a_dbs`
- AKSDeployer calls `npm run deploymentCli -- aks build_server`

**Key Insight:** deploymentCli's value is its config-driven approach (build.json, databases.json). We should either:
1. Port the config executor to devops (preserves pattern)
2. Call docker compose directly with the same configs (simpler but loses pre/post commands)

**Recommended Approach:** Port a simplified config executor to devops

**Tasks:**
- [ ] E.1: Create `tools/shared/docker-compose-executor.ts` that reads deployment configs
- [ ] E.2: Support `composeFile`, `deployCommand`, `defaultArgs` from config
- [ ] E.3: Support `preBuildCommands` and `postUpCommands` execution
- [ ] E.4: Support `environmentOverrides` for target-specific behavior
- [ ] E.5: Update MinikubeDeployer to use executor instead of deploymentCli
- [ ] E.6: Update AKSDeployer to use executor instead of deploymentCli
- [ ] E.7: Test full deployment flow without srvthreds dependency

**Outcome:** devops is self-contained for K8s deployments.

---

### Phase F: Simplify Local Development (srvthreds)

**Goal:** Developers can run `npm run dev` without understanding deploymentCli

**Current Complexity:**
- deploymentCli requires knowing deployment names (`build_server`, `s_a_dbs`)
- Config-driven flexibility is overkill for "start everything locally"

**Tasks:**
- [ ] F.1: Create `npm run dev:start` in srvthreds that starts DBs + services
- [ ] F.2: Create `npm run dev:stop` that stops everything
- [ ] F.3: Create `npm run dev:reset` that cleans volumes and restarts
- [ ] F.4: Keep deploymentCli for advanced use cases
- [ ] F.5: Document simple vs advanced workflows in README

**Outcome:** Simple developer experience, advanced options still available.

---

### Phase G: Docker Compose Generation Decision

**Current State:**
- `config-registry.yaml` → `generator.ts` → `docker-compose-*.yml`
- Dockerfiles are static

**Options:**

**Option 1: Keep Generation (Current)**
- Pros: Single source of truth, consistency
- Cons: Generated files cause merge conflicts, harder to understand

**Option 2: Static Compose Files**
- Pros: Developers can read/edit directly, no generation step
- Cons: Manual sync needed, duplication risk

**Option 3: Hybrid - Generate at Runtime**
- Pros: No committed generated files, config-driven
- Cons: More complexity, debugging harder

**Recommendation:** Option 2 (Static) for simplicity. Use config-registry.yaml for K8s manifests only.

**Tasks:**
- [ ] G.1: Evaluate if generated compose files are actively used
- [ ] G.2: If keeping generation, add `.gitignore` for generated files
- [ ] G.3: If going static, manually create compose files and remove generator
- [ ] G.4: Document the chosen approach

---

### Phase H: Project Configuration Abstraction

**Goal:** Support multiple projects without hardcoded paths

**Tasks:**
- [ ] H.1: Define project config schema (`projects/{project}/project.yaml`)
- [ ] H.2: Create ProjectLoader that reads project configs
- [ ] H.3: Refactor deployers to accept project config instead of hardcoded paths
- [ ] H.4: Create srvthreds project config as first implementation
- [ ] H.5: Document how to add new projects

**Project Config Example:**
```yaml
# projects/srvthreds/project.yaml
name: srvthreds
source:
  path: ../srvthreds
  composePath: infrastructure/local/docker/compose
docker:
  builderImage: srvthreds/builder
  services:
    - engine
    - session-agent
    - persistence-agent
kubernetes:
  namespace: srvthreds
  manifestPath: kubernetes/srvthreds
minikube:
  manifestPath: minikube/srvthreds
```

**Outcome:** Framework supports any project, not just srvthreds.

---

## Phase Summary & Priority

| Phase | Effort | Impact | Dependencies |
|-------|--------|--------|--------------|
| A: Logger Consolidation | Small | Medium | None |
| B: Script Migration | Small | Medium | None |
| C: CLI Simplification | Medium | Medium | A |
| D: Unit Tests | Medium | High | A, B |
| E: Decouple deploymentCli | Large | High | D |
| F: Simplify Local Dev | Small | High | None (srvthreds) |
| G: Docker Compose Decision | Small | Medium | F |
| H: Project Abstraction | Large | High | E |

**Recommended Order:** A → B → D → C → F → G → E → H

Start with A and B (quick wins), add tests (D), then tackle the larger structural changes.

---

## Success Criteria

1. **Single logger** across all devops tools (thredlib-based)
2. **No bash scripts** except git hooks
3. **Single CLI entry point** with consistent UX
4. **80% test coverage** on shared utilities
5. **No deploymentCli dependency** for K8s deployments
6. **Simple `npm run dev`** for srvthreds developers
7. **Project abstraction** that supports multiple projects

---

## Open Decisions Needed

1. **Docker compose generation** - Keep, go static, or runtime generation?
2. **deploymentCli fate** - Port executor to devops, or keep in srvthreds for local-only?
3. **Monorepo structure** - Should devops become a workspace in a larger monorepo?
