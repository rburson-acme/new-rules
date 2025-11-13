# Kubernetes Deployer Commands

This document provides a mapping between the old shell script/CLI commands and the new TypeScript deployer commands.

## Quick Reference

| Old Command | New TypeScript Command | Description |
|------------|------------------------|-------------|
| `npm run minikube-create` | `npm run minikube-deploy-ts` | Deploy to Minikube (creates cluster if needed) |
| `npm run minikube-reset` | `npm run minikube-reset-ts` | Reset deployment (delete namespace, keep cluster) |
| `npm run minikube-cleanup` | `npm run minikube-cleanup-ts` | Full cleanup (delete cluster) |
| `npm run minikube-validate` | (built into deploy) | Validation runs automatically |
| `npm run minikube-apply` | `npm run minikube-deploy-ts` | Apply manifests and deploy |

## Detailed Commands

### 1. Deploy to Minikube

**New Command:**
```bash
npm run minikube-deploy-ts
```

**What it does:**
- Checks if Minikube cluster exists, creates it if not
- Configures cluster with correct resources and restart policy
- Builds Docker images in Minikube environment
- Sets up host databases (MongoDB, Redis, RabbitMQ)
- Applies Kubernetes manifests with kustomize
- Waits for all deployments to be ready
- Runs validation checks

**Options:**
```bash
# Dry run (no changes)
npm run minikube-deploy-ts -- --dry-run --verbose

# Skip database setup (if already running)
npm run minikube-deploy-ts -- --skip-db

# Verbose logging
npm run minikube-deploy-ts -- --verbose
```

**Replaces:**
- `npm run minikube-create`
- `npm run minikube-apply`
- Shell script: `infrastructure/local/minikube/scripts/setup-minikube.sh`

---

### 2. Reset Deployment

**New Command:**
```bash
npm run minikube-reset-ts
```

**What it does:**
- Deletes the `srvthreds` namespace and all resources
- Keeps Minikube cluster running (fast reset)
- Keeps host databases running
- Useful for quick redeployment without cluster restart

**Options:**
```bash
# Dry run
npm run minikube-reset-ts -- --dry-run

# Verbose logging
npm run minikube-reset-ts -- --verbose
```

**Replaces:**
- `npm run minikube-reset`
- Shell script: `infrastructure/local/minikube/scripts/reset-minikube.sh`

---

### 3. Full Cleanup (Destroy Cluster)

**New Command:**
```bash
npm run minikube-cleanup-ts
```

**What it does:**
- Deletes the `srvthreds` namespace
- Stops the Minikube cluster
- Deletes the Minikube cluster completely
- Optionally stops host databases (with `--delete-databases` flag)
- Prompts for confirmation (use `--force` to skip)

**Options:**
```bash
# Cleanup with confirmation
npm run minikube-cleanup-ts

# Also stop databases
npm run minikube-cleanup-ts -- --delete-databases

# Force without confirmation
npm run minikube-cleanup-ts -- --force

# Dry run
npm run minikube-cleanup-ts -- --dry-run --verbose
```

**Replaces:**
- `npm run minikube-cleanup`
- Shell script: `infrastructure/local/minikube/scripts/cleanup-minikube.sh`

---

### 4. Validation

**Built into deployment** - validation runs automatically as part of `npm run minikube-deploy-ts`

**What it checks:**
- All pods are ready
- Services are created
- Deployments have correct replica counts

**Replaces:**
- `npm run minikube-validate`
- Shell script: `infrastructure/local/minikube/scripts/validate-minikube.sh`

---

### 5. Set Context

**Use kubectl directly:**
```bash
kubectl config use-context minikube
```

The deployer automatically switches context during deployment, so manual context switching is rarely needed.

**Replaces:**
- `npm run minikube-set-context`
- Shell script: `infrastructure/local/minikube/scripts/switch-to-minikube.sh`

---

## Workflow Comparison

### Old Workflow (Shell Scripts)

```bash
# Full deployment
npm run minikube-create

# Reset and redeploy
npm run minikube-reset
npm run minikube-apply

# Validate
npm run minikube-validate

# Full cleanup
npm run minikube-cleanup
```

### New Workflow (TypeScript Deployer)

```bash
# Full deployment
npm run minikube-deploy-ts

# Reset and redeploy
npm run minikube-reset-ts
npm run minikube-deploy-ts

# Validation is automatic

# Full cleanup
npm run minikube-cleanup-ts
```

---

## Advanced Usage

### Direct Script Access

You can run the TypeScript scripts directly for more control:

```bash
# Deploy
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --help

# Reset
npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts --help

# Cleanup
npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts --help
```

### Programmatic Usage

You can also use the deployer programmatically in your TypeScript code:

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({
  verbose: true,
  manifestPath: 'infrastructure/local/minikube/manifests/minikube/',
});

// Deploy
const result = await deployer.deploy();

// Reset
await deployer.resetDeployment();

// Cleanup
await deployer.destroyCluster({ deleteDatabases: true });
```

---

## Migration Notes

### Benefits of New TypeScript Deployer

1. **Type Safety** - Catch errors at compile time
2. **Better Error Messages** - Clear error context and suggestions
3. **Programmatic Access** - Use in code, not just CLI
4. **Dry Run Support** - Test deployments without changes
5. **Automatic Retry Logic** - Waits for resources with exponential backoff
6. **State Management** - Tracks deployed resources for rollback
7. **Unified Logging** - Consistent, structured logs with levels

### Backward Compatibility

The old commands still work and will continue to work:
- `npm run minikube-create` → Uses old shell scripts
- `npm run minikube-deploy-ts` → Uses new TypeScript deployer

Both achieve the same result, but the TypeScript deployer provides better error handling, logging, and extensibility.

### When to Use Which

**Use TypeScript deployer when:**
- Developing new features
- Need programmatic control
- Want better error messages
- Testing with dry-run mode
- Need to extend deployment logic

**Use old scripts when:**
- Quick manual deployments
- Familiar with existing workflow
- Script-based automation

---

## Troubleshooting

### Common Issues

**Error: Minikube cluster not found**
```bash
# The new deployer automatically creates the cluster
npm run minikube-deploy-ts
```

**Error: kubectl context not set**
```bash
# The deployer automatically switches context
# Or switch manually:
kubectl config use-context minikube
```

**Error: MongoDB replica set not healthy**
```bash
# Reset databases and redeploy
npm run deploy-local-down-databases
npm run minikube-deploy-ts
```

**Need to start completely fresh**
```bash
# Full cleanup and redeploy
npm run minikube-cleanup-ts -- --delete-databases
npm run minikube-deploy-ts
```

---

## Next Steps

- See [QUICK-TEST.md](./QUICK-TEST.md) for testing the new deployer
- See [TESTING.md](./TESTING.md) for comprehensive testing guide
- See [README.md](./README.md) for architecture and implementation details
