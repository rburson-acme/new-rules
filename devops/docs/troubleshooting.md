# Troubleshooting Guide

This guide covers common issues and their solutions when working with the DevOps toolkit.

## Quick Diagnostics

### Check Overall Status

```bash
# Minikube cluster health
minikube status

# Kubernetes cluster info
kubectl cluster-info

# Pod status in namespace
kubectl get pods -n srvthreds -o wide

# Recent events (shows errors)
kubectl get events -n srvthreds --sort-by='.lastTimestamp' | tail -20

# Docker containers (minikube host)
eval $(minikube docker-env)
docker ps
```

### Full Status Check

```bash
npm run minikube:status -p srvthreds
```

## Minikube Issues

### Minikube Won't Start

**Symptoms:**
- `minikube start` hangs
- "apiserver not responding" errors
- Connection refused errors

**Solutions:**

1. **Delete and recreate cluster:**
```bash
npm run minikube:delete
minikube start --cpus 4 --memory 8192
```

2. **Check system resources:**
```bash
# Ensure Docker has enough resources
docker system info | grep -E 'CPUs|Memory'
```

3. **Reset Docker (macOS):**
```bash
# Restart Docker Desktop
# Or from command line:
osascript -e 'quit app "Docker"'
open -a Docker
```

4. **Clean up old clusters:**
```bash
minikube delete --all
rm -rf ~/.minikube
```

### Docker Environment Not Set

**Symptoms:**
- "Cannot connect to Docker daemon"
- Images not visible in minikube

**Solution:**
```bash
# Set Docker to use minikube's daemon
eval $(minikube docker-env)

# Verify
docker images | grep srvthreds
```

### Minikube IP Changed

**Symptoms:**
- Services unreachable after restart
- DNS resolution failures

**Solution:**
```bash
# Get new IP
minikube ip

# Restart tunnel if needed
minikube tunnel
```

## Pod Issues

### Pods Stuck in Pending

**Symptoms:**
- Pod stays in `Pending` state
- No events showing scheduling

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds
```

**Common Causes & Solutions:**

1. **Insufficient resources:**
```bash
# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# Reduce resource requests in manifests or increase minikube resources
minikube stop
minikube start --cpus 4 --memory 8192
```

2. **PersistentVolumeClaim not bound:**
```bash
kubectl get pvc -n srvthreds
# If pending, check storage class
kubectl get sc
```

### Pods in CrashLoopBackOff

**Symptoms:**
- Pod repeatedly restarts
- Status shows `CrashLoopBackOff`

**Diagnosis:**
```bash
# Check current logs
kubectl logs <pod-name> -n srvthreds

# Check previous container logs (after crash)
kubectl logs <pod-name> -n srvthreds --previous

# Describe pod for events
kubectl describe pod <pod-name> -n srvthreds
```

**Common Causes & Solutions:**

1. **Application error:**
- Check logs for stack traces
- Verify environment variables in ConfigMap
- Ensure dependencies (databases) are running

2. **Wrong entrypoint/command:**
```bash
# Check the command in manifest
kubectl get deployment <name> -n srvthreds -o yaml | grep -A 10 "containers:"
```

3. **Missing dependencies:**
```bash
# Verify bootstrap completed
kubectl logs deployment/srvthreds-bootstrap -n srvthreds

# Check services are running
kubectl get services -n srvthreds
```

### ImagePullBackOff

**Symptoms:**
- Pod stuck in `ImagePullBackOff` or `ErrImagePull`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds | grep -A 10 "Events:"
```

**Solutions:**

1. **Minikube - Image not built:**
```bash
# Set Docker env and rebuild
eval $(minikube docker-env)
npm run minikube -p srvthreds --build
```

2. **Minikube - imagePullPolicy wrong:**
```bash
# Should be Never or IfNotPresent for local images
# Check overlay kustomization.yaml
```

3. **AKS - ACR authentication:**
```bash
# Login to ACR
az acr login --name cazsrvthredsdeacr

# Verify AKS can pull
az aks check-acr --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --acr cazsrvthredsdeacr.azurecr.io
```

### OOMKilled

**Symptoms:**
- Pod terminated with `OOMKilled`
- Container restarting frequently

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds | grep -i oom
```

**Solution:**
```bash
# Increase memory limits in manifests
# Edit manifests/base/<service>.yaml
resources:
  requests:
    memory: 512Mi
  limits:
    memory: 1Gi
```

## Service Connectivity Issues

### Cannot Connect to Service

**Symptoms:**
- Connection refused
- Timeout when accessing service

**Diagnosis:**
```bash
# Check service exists
kubectl get services -n srvthreds

# Check endpoints (should have pod IPs)
kubectl get endpoints -n srvthreds

# Test from within cluster
kubectl run test --rm -it --image=busybox -- wget -O- http://srvthreds-engine-service:8082/health
```

**Solutions:**

1. **No endpoints:**
- Check pod labels match service selector
- Ensure pods are Running

2. **Port forwarding:**
```bash
kubectl port-forward -n srvthreds svc/srvthreds-engine-service 8082:8082
```

### Database Connection Failed

**Symptoms:**
- Application logs show "connection refused" to MongoDB/Redis

**For Minikube:**
```bash
# Check Docker containers are running
docker ps | grep -E 'mongo|redis'

# Check logs
docker logs srvthreds-mongo-repl-1
docker logs srvthreds-redis

# Verify replica set initialized
docker exec srvthreds-mongo-repl-1 mongosh --eval "rs.status()"
```

**ConfigMap check:**
```bash
kubectl get configmap srvthreds-config -n srvthreds -o yaml
```

For minikube, hosts should use `host.minikube.internal` to reach Docker containers.

## Docker Compose Issues

### Profile Not Starting

**Symptoms:**
- Services not appearing
- "no such service" errors

**Diagnosis:**
```bash
# List services by profile
docker compose -f projects/srvthreds/docker-compose.generated.yaml config --profiles

# Check profile assignment
grep -A 5 "profiles:" projects/srvthreds/docker-compose.generated.yaml
```

**Solution:**
```bash
# Start specific profile
docker compose -f projects/srvthreds/docker-compose.generated.yaml --profile infra up -d
```

### Build Context Errors

**Symptoms:**
- "unable to prepare context" errors
- "no such file or directory"

**Solutions:**

1. **Regenerate compose file:**
```bash
npm run generate -p srvthreds
```

2. **Check source path exists:**
```bash
# Verify source directory
ls -la $(grep "context:" projects/srvthreds/docker-compose.generated.yaml | head -1 | awk '{print $2}')
```

3. **Check additional contexts:**
```bash
# Verify all additional_contexts paths exist
cat projects/srvthreds/project.yaml | grep -A 5 "additionalContexts:"
```

### Container Name Conflicts

**Symptoms:**
- "container name already in use"

**Solution:**
```bash
# Stop and remove conflicting containers
docker compose -f projects/srvthreds/docker-compose.generated.yaml down

# Or force remove
docker rm -f srvthreds-mongo-repl-1 srvthreds-redis
```

## Terraform Issues

### State Lock

**Symptoms:**
- "Error acquiring the state lock"

**Solutions:**

1. **Wait for other operation to complete**

2. **Force unlock (careful!):**
```bash
cd projects/srvthreds/terraform/stacks/<stack>
terraform force-unlock <LOCK_ID>
```

### Backend Authentication

**Symptoms:**
- "Error configuring the backend"
- "access denied" to storage account

**Solutions:**
```bash
# Re-authenticate
az login

# Set correct subscription
az account set --subscription <subscription-id>

# Verify access
az storage account show --name srvthredstfstatei274ht
```

### State Drift

**Symptoms:**
- Resources exist in Azure but not in state
- "resource already exists" errors

**Solutions:**
```bash
# Import existing resource
npm run terraform -- import -p srvthreds dev <stack> <resource_address> <resource_id>

# Or refresh state
cd projects/srvthreds/terraform/stacks/<stack>
terraform refresh -var-file=../../../environments.json
```

### Dependency Errors

**Symptoms:**
- "data source not found"
- Stack fails because dependency not deployed

**Solution:**
```bash
# Deploy dependencies first
npm run terraform -- deploy -p srvthreds dev networking

# Then deploy dependent stack
npm run terraform -- deploy -p srvthreds dev aks
```

## CI/CD Issues

### Workflow Not Triggering

**Check:**
1. Path filters in workflow file match changed files
2. Branch protection rules allow the workflow
3. Workflow is on default branch

### OIDC Authentication Failed

**Symptoms:**
- "AADSTS700016: Application not found"
- "Failed to get federated token"

**Solutions:**

1. **Verify GitHub OIDC configuration:**
```bash
# Check Azure AD app registration
az ad app list --display-name "github-actions-srvthreds"
```

2. **Check federated credentials:**
- Azure Portal → App Registrations → Certificates & secrets → Federated credentials
- Verify subject matches: `repo:org/repo:ref:refs/heads/main`

### ACR Push Failed

**Symptoms:**
- "unauthorized: authentication required"

**Solutions:**
```bash
# Verify ACR credentials in GitHub secrets
# Check AZURE_CLIENT_ID has AcrPush role

az role assignment list --assignee <client-id> --scope /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ContainerRegistry/registries/<acr>
```

### AKS Deploy Failed

**Symptoms:**
- "error: unable to connect to the server"

**Solutions:**

1. **Check AKS credentials:**
```bash
az aks get-credentials --resource-group CAZ-SRVTHREDS-D-E-RG --name CAZ-SRVTHREDS-D-E-AKS
```

2. **Verify cluster is running:**
```bash
az aks show --resource-group CAZ-SRVTHREDS-D-E-RG --name CAZ-SRVTHREDS-D-E-AKS --query powerState
```

## Reset Procedures

### Full Minikube Reset

```bash
# Stop everything
npm run minikube:reset -p srvthreds

# If that fails, force clean
docker compose -f projects/srvthreds/docker-compose.generated.yaml down -v --remove-orphans
kubectl delete namespace srvthreds --ignore-not-found

# Nuclear option
npm run minikube:delete
rm -rf ~/.minikube
minikube start --cpus 4 --memory 8192
```

### Regenerate All Configuration

```bash
# Regenerate docker-compose
npm run generate -p srvthreds

# Rebuild everything
npm run minikube -p srvthreds --build --recreate
```

### Clean Docker System

```bash
# Remove unused resources
docker system prune -a --volumes

# Reset minikube docker
minikube ssh -- docker system prune -a
```

## Getting Help

### Collecting Debug Information

```bash
# Full status dump
kubectl get all -n srvthreds -o yaml > debug-k8s.yaml
docker compose -f projects/srvthreds/docker-compose.generated.yaml ps > debug-compose.txt
kubectl describe nodes > debug-nodes.txt
kubectl get events -n srvthreds --sort-by='.lastTimestamp' > debug-events.txt
```

### Log Locations

| Component | Location |
|-----------|----------|
| Minikube | `~/.minikube/logs/` |
| Docker | `docker logs <container>` |
| Kubernetes | `kubectl logs -n srvthreds <pod>` |
| CLI | Console output (use `--verbose` flag) |

### Common Environment Variables

```bash
# Enable verbose output
DEBUG=true npm run minikube -p srvthreds

# Dry run (show commands without executing)
npm run minikube -p srvthreds --dry-run
npm run terraform -- plan -p srvthreds dev --dry-run
```
