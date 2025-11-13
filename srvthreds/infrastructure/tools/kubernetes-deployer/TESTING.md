# Testing Guide for Kubernetes Deployer

This guide covers different levels of testing for the kubernetes-deployer framework.

## Level 1: Type Checking ✅

Verify that all TypeScript compiles without errors:

```bash
# From repository root
npm run check
```

**Expected:** No errors in `kubernetes-deployer/` files.

**Status:** ✅ Currently passing (49 tests)

---

## Level 2: Unit Tests ✅

Run the existing test suite:

```bash
# From repository root
npx vitest --run --no-file-parallelism infrastructure/tools/kubernetes-deployer/test/
```

**Expected Output:**
```
Test Files  4 passed (4)
Tests  49 passed (49)
```

**What's tested:**
- ✅ Logger utility (9 tests)
- ✅ Retry utility with exponential backoff (8 tests)
- ✅ Error classes and hierarchy (15 tests)
- ✅ KubernetesClient operations (17 tests)

**Status:** ✅ All passing

---

## Level 3: Import and Instantiation Test

Test that MinikubeDeployer can be imported and instantiated:

```bash
# From repository root
npx tsx infrastructure/tools/kubernetes-deployer/examples/test-minikube.ts
```

**Expected Output:**
```
🧪 Testing MinikubeDeployer...

Test 1: Instantiate MinikubeDeployer
✓ MinikubeDeployer instantiated successfully

Test 2: Run pre-deployment checks (dry-run mode)
[Log output from dry-run deployment...]
✓ Deployment simulation completed successfully

🎉 All tests passed!
```

**What's tested:**
- ✅ Module imports work correctly
- ✅ MinikubeDeployer instantiates without errors
- ✅ Dry-run mode executes the full workflow
- ✅ All dependencies are resolved

---

## Level 4: Pre-Deployment Checks (No Deployment)

Test that pre-deployment checks work with your actual environment:

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({ verbose: true });

// This will check Docker, Minikube, kubectl but not deploy
await deployer['preDeployChecks']();
```

**Prerequisites:**
- ✅ Docker Desktop running
- ✅ Minikube installed
- ✅ kubectl installed

**Expected:** Checks pass and report current environment status

**What's tested:**
- Docker daemon connectivity
- Minikube installation and status
- kubectl configuration
- Context switching

---

## Level 5: Dry-Run Deployment

Test the complete deployment workflow without making changes:

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({
  verbose: true,
  dryRun: true,
  skipDatabaseSetup: true,
});

const result = await deployer.deploy();
console.log('Dry-run result:', result);
```

**Prerequisites:** Same as Level 4

**Expected:** Full workflow executes, logs all steps, but makes no actual changes

**What's tested:**
- Complete deployment workflow
- Error handling
- State management
- Logging and progress reporting

---

## Level 6: Actual Deployment to Minikube

**⚠️ This will deploy to your local Minikube cluster**

### Prerequisites

1. **Start Docker Desktop**
   ```bash
   # Verify Docker is running
   docker info
   ```

2. **Ensure Minikube is installed**
   ```bash
   minikube version
   # Should show: minikube version: v1.x.x
   ```

3. **Start Minikube (if not running)**
   ```bash
   minikube start --driver=docker --cpus=4 --memory=7836 --disk-size=20g
   ```

4. **Set kubectl context**
   ```bash
   kubectl config use-context minikube
   kubectl cluster-info
   ```

### Option A: Using the Example Script

```bash
# Edit the script to remove dryRun
# Then run:
npx tsx infrastructure/tools/kubernetes-deployer/examples/test-minikube.ts
```

### Option B: Using Existing npm Scripts

```bash
# This uses the existing deployment-cli
npm run minikube-create
```

### Option C: Programmatic Deployment

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({
  verbose: true,
  manifestPath: 'infrastructure/local/minikube/manifests/minikube/',
});

try {
  const result = await deployer.deploy();

  if (result.success) {
    console.log('✅ Deployment successful!');
    console.log(`Duration: ${result.duration}ms`);
    console.log('State:', result.state);

    // Setup port forwarding
    await deployer.setupPortForwarding(3000);
    console.log('🌐 Access at: http://localhost:3000');
  }
} catch (error) {
  console.error('❌ Deployment failed:', error);
}
```

### What's Deployed

The deployment will:
1. ✅ Start/verify Minikube cluster
2. ✅ Build Docker images in Minikube
3. ✅ Start host databases (MongoDB, Redis, RabbitMQ)
4. ✅ Apply Kubernetes manifests
5. ✅ Deploy 3 services:
   - `srvthreds-engine`
   - `srvthreds-session-agent`
   - `srvthreds-persistence-agent`
6. ✅ Wait for all pods to be ready
7. ✅ Run validation checks

### Verification Commands

```bash
# Check deployment status
kubectl get deployments -n srvthreds

# Check pods
kubectl get pods -n srvthreds

# Check services
kubectl get services -n srvthreds

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
```

### Expected Output

```
DEPLOYING TO MINIKUBE (minikube)
🔍 DRY RUN MODE - No changes will be applied (if dryRun=true)

═══════════════════════════════════════════════════════════
  Pre-Deployment Checks
═══════════════════════════════════════════════════════════
✓ Docker daemon is running
✓ Minikube cluster is running
✓ kubectl context set to minikube
✓ Namespace srvthreds ready

═══════════════════════════════════════════════════════════
  Building Docker Images
═══════════════════════════════════════════════════════════
✓ Images built successfully

═══════════════════════════════════════════════════════════
  Setting Up Host Databases
═══════════════════════════════════════════════════════════
✓ Host databases are ready
✓ MongoDB replica set is healthy

═══════════════════════════════════════════════════════════
  Applying Kubernetes Manifests
═══════════════════════════════════════════════════════════
✓ Manifests applied successfully

═══════════════════════════════════════════════════════════
  Waiting for Deployments
═══════════════════════════════════════════════════════════
✓ srvthreds-engine is ready (1/1)
✓ srvthreds-session-agent is ready (1/1)
✓ srvthreds-persistence-agent is ready (1/1)
✓ All deployments are ready

═══════════════════════════════════════════════════════════
  Running Validation
═══════════════════════════════════════════════════════════
✓ All 3 pods are ready
✓ Found 3 services
✓ All validation checks passed

✅ Deployment completed in 45.67s
```

---

## Level 7: Integration Tests (Future)

**Status:** 🔜 Not yet implemented

These would test the deployment against actual services:

```typescript
describe('MinikubeDeployer Integration', () => {
  it('should deploy and services should respond', async () => {
    const deployer = new MinikubeDeployer();
    await deployer.deploy();

    // Test HTTP endpoints
    const response = await fetch('http://localhost:3000/health');
    expect(response.status).toBe(200);
  });
});
```

---

## Troubleshooting

### "Docker daemon is not running"

```bash
# Start Docker Desktop
open -a Docker

# Wait for Docker to start (whale icon in menu bar)
docker info
```

### "Minikube cluster not found"

```bash
# Create Minikube cluster
minikube start --driver=docker --cpus=4 --memory=7836
```

### "Cannot connect to Kubernetes API"

```bash
# Update Minikube context
minikube update-context

# Switch to minikube context
kubectl config use-context minikube

# Verify connection
kubectl cluster-info
```

### "MongoDB replica set not healthy"

```bash
# Run replica set setup
bash infrastructure/local/docker/scripts/setup-repl.sh

# Check status
docker exec mongo-repl-1 mongosh --eval "rs.status()"
```

### "Pods are not ready"

```bash
# Check pod status
kubectl get pods -n srvthreds

# View logs for failing pod
kubectl logs <pod-name> -n srvthreds

# Describe pod for more details
kubectl describe pod <pod-name> -n srvthreds
```

---

## Quick Test Summary

**Fastest → Slowest**

1. ✅ **Type Check** (5 seconds) - `npm run check`
2. ✅ **Unit Tests** (7 seconds) - `npx vitest --run infrastructure/tools/kubernetes-deployer/test/`
3. ✅ **Instantiation** (1 second) - `npx tsx examples/test-minikube.ts`
4. ⏳ **Dry-Run** (10 seconds) - Remove `dryRun` from test script
5. ⏳ **Pre-Deploy Checks** (30 seconds) - Requires Docker + Minikube
6. ⏳ **Full Deployment** (2-3 minutes) - Complete deployment to Minikube

**Recommended Testing Order:**
1. Start with Type Check and Unit Tests (always passing)
2. Test instantiation to verify imports
3. Run dry-run to test workflow
4. Finally, do actual deployment when ready

---

## Current Test Coverage

- ✅ **Type Safety**: 100% (compiles without errors)
- ✅ **Unit Tests**: 49 tests passing
- ✅ **Integration Tests**: KubernetesClient (mocked)
- ⏳ **E2E Tests**: Not yet implemented
- ⏳ **Real Deployment**: Manual testing required

**Total Lines of Test Code**: ~400 lines
**Total Lines of Production Code**: ~1,200 lines
**Test Coverage**: ~33% (unit tests only)
