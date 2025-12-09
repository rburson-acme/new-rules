# Troubleshooting Guide

Common issues and solutions for the DevOps deployment platform.

## Table of Contents

- [General Troubleshooting](#general-troubleshooting)
- [Minikube Issues](#minikube-issues)
- [AKS Issues](#aks-issues)
- [Terraform Issues](#terraform-issues)
- [Kubernetes Issues](#kubernetes-issues)
- [Docker Issues](#docker-issues)
- [Database Issues](#database-issues)

## General Troubleshooting

### Diagnostic Commands

```bash
# Check system status
npm run check                    # TypeScript type checking
npm run test                     # Run tests

# Check deployment status
npm run minikube:status         # Minikube
npm run aks:status -- dev       # AKS
npm run tf:status -- dev        # Terraform

# View pod logs
kubectl logs <pod-name> -n srvthreds
kubectl describe pod <pod-name> -n srvthreds
kubectl get events -n srvthreds --sort-by='.lastTimestamp'
```

### Enable Verbose Logging

```bash
# Kubernetes deployments
npm run k8s -- minikube deploy -v
npm run k8s -- aks deploy dev -v

# Terraform operations
npm run terraform -- deploy dev --debug
```

### Check Prerequisites

```bash
docker --version
kubectl version --client
minikube version
az --version
terraform --version
node --version
```

## Minikube Issues

### Minikube Won't Start

**Symptoms:**
```
RSRC_INSUFFICIENT_CORES: Requested cpu count 4 is greater than available
```

**Solution:**
```bash
# Check resources
sysctl -n hw.ncpu  # macOS
nproc              # Linux

# Start with fewer resources
minikube start --cpus=2 --memory=4096
```

### Docker Not Running

**Symptoms:**
```
Docker daemon is not running
```

**Solution:**
```bash
open -a Docker  # macOS
docker info     # Verify
```

### Images Not Found

**Symptoms:**
```
Failed to pull image "srvthreds/engine:latest"
```

**Solution:**
```bash
eval $(minikube docker-env)
docker images | grep srvthreds

# Rebuild if needed
cd ../srvthreds
npm run deploymentCli -- minikube build_server
```

### Host Databases Not Accessible

**Symptoms:**
```
MongoNetworkError: failed to connect to server [host.minikube.internal:27017]
```

**Solution:**
```bash
# Check databases
docker ps | grep mongo
docker ps | grep redis

# Start databases
cd ../srvthreds
npm run deploymentCli -- minikube s_a_dbs

# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
telnet host.minikube.internal 27017
```

### Namespace Stuck Terminating

**Solution:**
```bash
kubectl delete namespace srvthreds --grace-period=0 --force

# If still stuck
kubectl get namespace srvthreds -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/srvthreds/finalize" -f -
```

## AKS Issues

### Not Logged In to Azure

**Symptoms:**
```
Please run 'az login' to setup account
```

**Solution:**
```bash
az login
az account set --subscription "<subscription-id>"
az account show
```

### AKS Cluster Not Found

**Symptoms:**
```
AKS cluster 'CAZ-SRVTHREDS-D-E-AKS' not found
```

**Solution:**
```bash
# Check cluster exists
az aks list --output table

# Deploy infrastructure first
npm run tf:init -- dev
npm run tf:apply -- dev
```

### Cannot Get AKS Credentials

**Solution:**
```bash
az aks get-credentials \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --overwrite-existing
```

### ACR Access Denied

**Symptoms:**
```
unauthorized: authentication required
```

**Solution:**
```bash
# Login to ACR
az acr login --name cazsrvthredsdeacr

# Attach ACR to AKS
az aks update \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --attach-acr cazsrvthredsdeacr
```

## Terraform Issues

### State Locked

**Symptoms:**
```
Error acquiring the state lock
```

**Solution:**
```bash
# Wait for other operation, or force unlock
cd terraform/stacks/srvthreds/<stack>
terraform force-unlock <lock-id>
```

### State Drift

**Symptoms:**
```
Resource has been deleted outside of Terraform
```

**Solution:**
```bash
# Refresh state
cd terraform/stacks/srvthreds/<stack>
terraform refresh

# Or remove from state
npm run terraform -- state rm dev <resource-address>
```

### Provider Errors

**Solution:**
```bash
# Re-initialize
npm run tf:init -- dev

# Clear cache
rm -rf terraform/stacks/srvthreds/<stack>/.terraform
npm run tf:init -- dev
```

### Insufficient Quota

**Symptoms:**
```
OperationNotAllowed: exceeding approved quota
```

**Solution:**
- Request quota increase via Azure Portal
- Use smaller VM size in tfvars
- Reduce node count

## Kubernetes Issues

### Pods Stuck in Pending

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds
kubectl get events -n srvthreds
kubectl top nodes
```

**Common Causes:**
- Insufficient resources - Scale cluster or reduce requests
- Image pull error - Check image exists
- PVC not bound - Check storage class

### Pods Crashing (CrashLoopBackOff)

**Diagnosis:**
```bash
kubectl logs <pod-name> -n srvthreds
kubectl logs <pod-name> -n srvthreds --previous
kubectl describe pod <pod-name> -n srvthreds
```

**Common Causes:**
- Application error - Check logs
- Database connection - Test connectivity
- Missing env vars - Check ConfigMaps

### Service Not Accessible

**Diagnosis:**
```bash
kubectl get svc -n srvthreds
kubectl get endpoints -n srvthreds
kubectl describe svc <service-name> -n srvthreds
```

**Solutions:**
- Check selector matches pod labels
- Verify port configuration
- Check pod readiness

## Docker Issues

### Build Failures

**Solution:**
```bash
# Clear cache
docker builder prune -a

# Build without cache
docker build --no-cache -t image:tag .
```

### Out of Disk Space

**Solution:**
```bash
docker system prune -a --volumes
docker builder prune -a
docker system df
```

## Database Issues

### MongoDB Connection Refused

**Solution:**
```bash
# Check MongoDB running
docker ps | grep mongo

# Start if needed
cd ../srvthreds
npm run deploymentCli -- minikube s_a_dbs

# Check replica set
docker exec mongo-repl-1 mongosh --eval "rs.status()"
```

### Redis Connection Refused

**Solution:**
```bash
# Check Redis running
docker ps | grep redis

# Test
docker exec redis redis-cli ping

# Restart if needed
docker restart redis
```

## Getting Help

1. Check logs: `kubectl logs`, `docker logs`, `--debug` flag
2. Check events: `kubectl get events`
3. Use verbose mode: `-v` flag
4. Validate config: `npm run config:validate`

## Related Guides

- [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md)
- [Azure Deployment Guide](AZURE_DEPLOYMENT.md)
- [Project Configuration Guide](PROJECT_CONFIGURATION.md)
