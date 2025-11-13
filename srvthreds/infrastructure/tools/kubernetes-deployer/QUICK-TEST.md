# Quick Test Guide - New TypeScript Deployer

## Testing the New MinikubeDeployer Against Your Real Minikube Cluster

Since you already have working Minikube and local deployments, here's how to test the **new TypeScript deployer** works with your existing setup:

---

## Option 1: Dry Run (Safest - No Changes) ✅

Test the complete workflow without making any actual changes:

```bash
npm run minikube-deploy-ts -- --dry-run --verbose
```

**What this does:**
- ✅ Checks Docker is running
- ✅ Verifies Minikube cluster status
- ✅ Validates kubectl context
- ✅ Simulates image building
- ✅ Simulates database setup
- ✅ Simulates manifest application
- ✅ Shows what would happen without actually doing it

**Expected:** Complete workflow executes, shows all logs, exits successfully

---

## Option 2: Deploy to Existing Minikube (Real Test) 🚀

Deploy using the new TypeScript deployer to your actual Minikube cluster:

```bash
# Full deployment (including database setup)
npm run minikube-deploy-ts -- --verbose

# Or skip database setup if already running
npm run minikube-deploy-ts -- --skip-db --verbose
```

**What this does:**
- Starts Minikube if not running
- Builds images in Minikube Docker
- Sets up host databases (MongoDB, Redis, RabbitMQ)
- Applies Kubernetes manifests
- Waits for all pods to be ready
- Runs validation checks

**Expected Output:**
```
🚀 Deploying SrvThreds to Minikube using TypeScript deployer

============================================================
  DEPLOYING TO MINIKUBE (minikube)
============================================================

[Pre-deployment checks, building, deploying...]

============================================================
✅ DEPLOYMENT SUCCESSFUL
============================================================
⏱️  Duration: 45.32s
🏷️  Image Tag: dev
📊 Status: deployed
📦 Resources Deployed: 3

Deployed Resources:
  - Deployment/srvthreds-engine (srvthreds)
  - Deployment/srvthreds-session-agent (srvthreds)
  - Deployment/srvthreds-persistence-agent (srvthreds)
```

---

## Option 3: Compare with Old Script

To verify the new deployer works the same as the old shell script:

### Old Way (Shell Script):
```bash
npm run minikube-create
```

### New Way (TypeScript):
```bash
npm run minikube-deploy-ts
```

Both should produce the same result!

---

## Verification Commands

After deployment (with either method), verify everything works:

```bash
# Check deployment status
kubectl get deployments -n srvthreds

# Check pods are running
kubectl get pods -n srvthreds

# Check services
kubectl get services -n srvthreds

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Test endpoints
kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds &
curl http://localhost:3000/health
```

---

## What You're Testing

1. **✅ Module Loading** - Can TypeScript import and instantiate the deployer
2. **✅ Pre-Deploy Checks** - Docker, Minikube, kubectl validation works
3. **✅ Image Building** - Builds images in Minikube's Docker environment
4. **✅ Database Setup** - Starts and validates MongoDB replica set
5. **✅ Manifest Application** - Applies Kubernetes manifests with kustomize
6. **✅ Readiness Waiting** - Waits for deployments with retry logic
7. **✅ Validation** - Checks pod and service health
8. **✅ Error Handling** - Proper error messages and cleanup

---

## Troubleshooting

### "Docker daemon is not running"
```bash
# Start Docker Desktop
open -a Docker
```

### "Minikube cluster not found"
```bash
# Your existing cluster should work, but if needed:
minikube start
```

### "MongoDB replica set not healthy"
```bash
# Run your existing setup script
bash infrastructure/local/docker/scripts/setup-repl.sh
```

### Want to see what would happen first?
```bash
# Run in dry-run mode
npm run minikube-deploy-ts -- --dry-run --verbose
```

---

## Direct Script Access

You can also run the deployment script directly with more control:

```bash
# Show help
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --help

# Dry run
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --dry-run

# Skip database setup
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --skip-db

# Verbose logging
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --verbose

# Combine options
npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts --dry-run --verbose
```

---

## Quick Test Checklist

- [ ] **Dry run completes successfully** - `npm run minikube-deploy-ts -- --dry-run`
- [ ] **Real deployment works** - `npm run minikube-deploy-ts`
- [ ] **Pods are running** - `kubectl get pods -n srvthreds`
- [ ] **Services are accessible** - `kubectl get svc -n srvthreds`
- [ ] **Produces same result as old script** - Compare with `npm run minikube-create`

---

## Success Criteria

✅ **The new TypeScript deployer is working if:**

1. Dry run completes without errors
2. Real deployment succeeds
3. All 3 pods reach Running status
4. Services are created
5. Can access session-agent on port 3000
6. Result matches what the old shell script produces

---

## Recommended Test Order

1. **Start Here:** `npm run minikube-deploy-ts -- --dry-run` (safest, fastest)
2. **Then Try:** `npm run minikube-deploy-ts -- --skip-db` (faster, assumes DBs running)
3. **Full Test:** `npm run minikube-deploy-ts` (complete deployment)
4. **Verify:** Use kubectl commands to check pods and services
5. **Compare:** Run old script `npm run minikube-create` to verify same behavior

Total time: ~3-5 minutes for complete test

---

## Getting Help

If you encounter issues:

1. Check logs with `--verbose` flag
2. Verify prerequisites (Docker, Minikube, kubectl)
3. Try dry-run mode first to isolate issues
4. Compare with working old script behavior
5. Check the detailed [TESTING.md](./TESTING.md) guide
