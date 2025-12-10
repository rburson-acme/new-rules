# Troubleshooting and Environment Evaluation Guide

This guide covers how to diagnose issues, evaluate deployed environments, and verify that deployments are functioning correctly.

## Quick Diagnostics Checklist

Before diving deep, run through this checklist:

| Check | Minikube | AKS |
|-------|----------|-----|
| Cluster running | `minikube status` | `az aks show --name <cluster> --resource-group <rg> --query powerState` |
| kubectl context | `kubectl config current-context` | Same |
| Namespace exists | `kubectl get ns srvthreds` | Same |
| Pods running | `kubectl get pods -n srvthreds` | Same |
| Services exposed | `kubectl get svc -n srvthreds` | Same |
| Recent events | `kubectl get events -n srvthreds --sort-by='.lastTimestamp'` | Same |

---

## Environment Evaluation

After deploying, use these commands to verify your environment is healthy.

### 1. Overall Deployment Status

```bash
# Minikube
npm run k8s -- minikube status -p srvthreds

# AKS
npm run k8s -- aks status dev -p srvthreds
```

### 2. Pod Health Check

```bash
# List all pods with status
kubectl get pods -n srvthreds -o wide

# Check for pods not in Running state
kubectl get pods -n srvthreds --field-selector=status.phase!=Running

# Get detailed pod status
kubectl describe pods -n srvthreds
```

**What to look for:**
- All pods should be `Running` with `READY` showing `1/1` (or `n/n`)
- `RESTARTS` should be 0 or very low
- `AGE` should match when you deployed

### 3. Service Verification

```bash
# List services and their endpoints
kubectl get svc -n srvthreds

# Verify endpoints are bound
kubectl get endpoints -n srvthreds

# Check if service has pods backing it
kubectl describe svc <service-name> -n srvthreds
```

**What to look for:**
- Services should have `CLUSTER-IP` assigned
- `EXTERNAL-IP` for LoadBalancer services (AKS)
- Endpoints should list pod IPs (not `<none>`)

### 4. Resource Usage

```bash
# Node resources (Minikube)
kubectl top nodes

# Pod resource usage
kubectl top pods -n srvthreds

# Check resource requests vs limits
kubectl describe pods -n srvthreds | grep -A 5 "Requests\|Limits"
```

### 5. Log Analysis

```bash
# Stream logs from a deployment
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Get logs from all pods with a label
kubectl logs -l app=srvthreds-engine -n srvthreds

# Get logs from crashed container (previous instance)
kubectl logs <pod-name> -n srvthreds --previous

# Get logs with timestamps
kubectl logs <pod-name> -n srvthreds --timestamps
```

---

## Common Issues and Solutions

### Pod Issues

#### Pods Stuck in `Pending`

**Symptoms:** Pod status shows `Pending` indefinitely

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds
# Look at Events section at bottom
```

**Common causes:**
| Event Message | Solution |
|--------------|----------|
| `Insufficient cpu` / `Insufficient memory` | Scale down other pods or increase cluster resources |
| `no nodes available` | Minikube: `minikube start`. AKS: Check node pool status |
| `PersistentVolumeClaim not found` | Create the PVC or check storage class |

#### Pods Stuck in `ContainerCreating`

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n srvthreds
kubectl get events -n srvthreds --field-selector involvedObject.name=<pod-name>
```

**Common causes:**
| Event Message | Solution |
|--------------|----------|
| `ImagePullBackOff` | Image doesn't exist or auth failed (see Image Pull Errors below) |
| `configmap not found` | Create missing ConfigMap |
| `secret not found` | Create missing Secret |

#### Pods in `CrashLoopBackOff`

**Diagnosis:**
```bash
# Check exit code and reason
kubectl describe pod <pod-name> -n srvthreds | grep -A 10 "Last State"

# Check logs from crashed container
kubectl logs <pod-name> -n srvthreds --previous
```

**Common causes:**
| Exit Code | Meaning | Solution |
|-----------|---------|----------|
| 1 | Application error | Check logs for stack trace |
| 137 | OOMKilled | Increase memory limits |
| 139 | Segmentation fault | Check application code |
| 143 | SIGTERM (graceful) | Usually normal during updates |

### Image Pull Errors

#### Minikube

**Symptoms:** `ImagePullBackOff` or `ErrImagePull`

**Solutions:**

1. **Build images in Minikube's Docker:**
```bash
# Switch to Minikube's Docker
eval $(minikube docker-env)

# Rebuild images
npm run k8s -- minikube run build_server -p srvthreds --use-minikube-docker

# Verify images exist
docker images | grep srvthreds
```

2. **Check imagePullPolicy:**
```bash
# Should be Never or IfNotPresent for local images
kubectl get pod <pod-name> -n srvthreds -o jsonpath='{.spec.containers[*].imagePullPolicy}'
```

#### AKS

**Symptoms:** `ImagePullBackOff` with ACR authentication errors

**Solutions:**

1. **Re-authenticate to ACR:**
```bash
az acr login --name <acr-name>
```

2. **Verify image exists:**
```bash
az acr repository show-tags --name <acr-name> --repository <image-name>
```

3. **Check AKS-ACR integration:**
```bash
# Verify AKS can pull from ACR
az aks check-acr --name <aks-cluster> --resource-group <rg> --acr <acr-name>
```

4. **Attach ACR to AKS (if not done):**
```bash
az aks update --name <aks-cluster> --resource-group <rg> --attach-acr <acr-name>
```

### Database Connectivity Issues

#### MongoDB Not Connecting

**From application pods:**
```bash
# Check if MongoDB is reachable
kubectl exec -it <app-pod> -n srvthreds -- nc -zv mongo-repl-1 27017

# Check MongoDB connection string in pod
kubectl exec -it <app-pod> -n srvthreds -- printenv | grep MONGO
```

**From host (Minikube):**
```bash
# Check MongoDB containers running
docker ps | grep mongo

# Check MongoDB replica set status
docker exec mongo-repl-1 mongosh --eval "rs.status()"

# Check logs
docker logs mongo-repl-1
```

**Common issues:**
| Issue | Solution |
|-------|----------|
| `connect ECONNREFUSED` | MongoDB not running - run `npm run k8s -- minikube run s_a_dbs -p srvthreds` |
| `ReplicaSetNoPrimary` | Re-initialize replica set - run the init script |
| `authentication failed` | Check MONGO_URI has correct credentials |

#### Redis Not Connecting

```bash
# Check Redis container
docker ps | grep redis

# Test Redis connectivity
docker exec -it srvthreds-redis redis-cli ping
# Should return: PONG

# Check logs
docker logs srvthreds-redis
```

### Network Issues

#### Service Not Accessible

```bash
# Check service exists
kubectl get svc <service-name> -n srvthreds

# Check endpoints
kubectl get endpoints <service-name> -n srvthreds

# Port forward to test locally
kubectl port-forward svc/<service-name> 8080:80 -n srvthreds
# Then test: curl http://localhost:8080
```

#### DNS Resolution Failing

```bash
# Test DNS from within a pod
kubectl exec -it <pod-name> -n srvthreds -- nslookup <service-name>

# Check CoreDNS is running
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

---

## Minikube-Specific Issues

### Minikube Won't Start

```bash
# Check Docker is running
docker info

# Check Minikube status
minikube status

# Delete and recreate (clean start)
minikube delete
minikube start --driver=docker --memory=4096 --cpus=2
```

### Minikube Out of Disk Space

```bash
# Check disk usage
minikube ssh "df -h"

# Clean up Docker images
minikube ssh "docker system prune -a"

# Or recreate with more disk
minikube delete
minikube start --disk-size=50g
```

### Cannot Access Services

**Option 1: Port Forwarding**
```bash
kubectl port-forward svc/<service-name> <local-port>:<service-port> -n srvthreds
```

**Option 2: Minikube Service**
```bash
minikube service <service-name> -n srvthreds
```

**Option 3: Minikube Tunnel (for LoadBalancer)**
```bash
minikube tunnel
# Keep running in background, then access via EXTERNAL-IP
```

---

## AKS-Specific Issues

### Authentication/Authorization

```bash
# Re-authenticate Azure CLI
az login

# Get fresh AKS credentials
az aks get-credentials --resource-group <rg> --name <cluster> --overwrite-existing

# Verify current context
kubectl config current-context

# Test access
kubectl get nodes
```

### Node Pool Issues

```bash
# Check node status
kubectl get nodes

# Check node pool scaling
az aks nodepool list --resource-group <rg> --cluster-name <cluster> -o table

# Check node conditions
kubectl describe nodes | grep -A 5 "Conditions:"
```

### Ingress Not Working

```bash
# Check ingress controller pods
kubectl get pods -n ingress-nginx

# Check ingress resources
kubectl get ingress -n srvthreds

# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

---

## Terraform Issues

### State Lock

**Symptoms:** `Error acquiring the state lock`

```bash
# Break the lock (use carefully)
npm run terraform -- state unlock dev <lock-id>
```

### State Drift

**Symptoms:** Resources exist in Azure but not in state

```bash
# Import existing resource
terraform import -var-file=... <resource_address> <azure_resource_id>

# Or recover state
npm run terraform -- state recover dev <stack>
```

### Backend Configuration

**Symptoms:** Backend initialization fails

```bash
# Verify symlinks
npm run terraform -- symlinks verify -p srvthreds

# Fix symlinks
npm run terraform -- symlinks fix -p srvthreds
```

---

## Log Aggregation Commands

### Collecting All Logs

```bash
# All pods in namespace
kubectl logs -n srvthreds --all-containers=true -l app.kubernetes.io/part-of=srvthreds > all-logs.txt

# With timestamps for correlation
kubectl logs -n srvthreds --all-containers=true --timestamps -l app.kubernetes.io/part-of=srvthreds > all-logs.txt
```

### Filtering Logs

```bash
# Errors only
kubectl logs deployment/srvthreds-engine -n srvthreds | grep -i error

# Last 100 lines
kubectl logs deployment/srvthreds-engine -n srvthreds --tail=100

# Since specific time
kubectl logs deployment/srvthreds-engine -n srvthreds --since=1h
```

---

## Health Check Verification

### HTTP Health Endpoints

```bash
# Port forward first
kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds &

# Then check health
curl http://localhost:3000/health
curl http://localhost:3000/ready
```

### Readiness/Liveness Probes

```bash
# Check probe configuration
kubectl get pod <pod-name> -n srvthreds -o jsonpath='{.spec.containers[*].readinessProbe}'
kubectl get pod <pod-name> -n srvthreds -o jsonpath='{.spec.containers[*].livenessProbe}'

# Check probe status in events
kubectl describe pod <pod-name> -n srvthreds | grep -A 2 "Liveness\|Readiness"
```

---

## Cleanup and Reset

### Minikube Full Reset

```bash
# Full cleanup (removes cluster and data)
npm run k8s -- minikube cleanup -p srvthreds --delete-dbs --db-stop-deployment d_a_dbs

# Namespace-only reset (keeps cluster)
npm run k8s -- minikube reset -p srvthreds
```

### AKS Namespace Reset

```bash
# Delete and recreate namespace
kubectl delete namespace srvthreds
kubectl create namespace srvthreds

# Then redeploy
npm run k8s -- aks deploy dev -p srvthreds -d build_server
```

---

## Quick Reference Commands

| Task | Command |
|------|---------|
| Check cluster status | `minikube status` / `az aks show...` |
| List all resources | `kubectl get all -n srvthreds` |
| Get pod logs | `kubectl logs <pod> -n srvthreds` |
| Describe pod | `kubectl describe pod <pod> -n srvthreds` |
| Get events | `kubectl get events -n srvthreds --sort-by='.lastTimestamp'` |
| Shell into pod | `kubectl exec -it <pod> -n srvthreds -- /bin/sh` |
| Port forward | `kubectl port-forward svc/<svc> <local>:<remote> -n srvthreds` |
| Watch pods | `kubectl get pods -n srvthreds -w` |
| Resource usage | `kubectl top pods -n srvthreds` |
| Config map values | `kubectl get configmap <name> -n srvthreds -o yaml` |
| Secret values | `kubectl get secret <name> -n srvthreds -o jsonpath='{.data}'` |
