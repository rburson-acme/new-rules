# Troubleshooting Guide

Comprehensive troubleshooting guide for the DevOps deployment platform.

## Table of Contents

- [General Troubleshooting](#general-troubleshooting)
- [Minikube Issues](#minikube-issues)
- [Azure/AKS Issues](#azureaks-issues)
- [Terraform Issues](#terraform-issues)
- [Kubernetes Issues](#kubernetes-issues)
- [Docker Issues](#docker-issues)
- [Database Issues](#database-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [CLI Tool Issues](#cli-tool-issues)

## General Troubleshooting

### Diagnostic Commands

First steps when encountering any issue:

```bash
# Check overall system status
npm run check                    # TypeScript type checking
npm test                         # Run tests

# Check deployment status
npm run minikube:status         # Minikube
npm run aks:status -- dev       # AKS
npm run tf:status -- dev        # Terraform

# View logs
kubectl logs <pod-name> -n <namespace>
kubectl describe pod <pod-name> -n <namespace>
kubectl get events -n <namespace> --sort-by='.lastTimestamp'
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
# Verify all required tools are installed
docker --version
kubectl version --client
minikube version         # For local deployments
az --version            # For Azure deployments
terraform --version     # For infrastructure deployments
node --version
npm --version

# Check Docker is running
docker info

# Check kubectl can connect
kubectl cluster-info

# Check Azure login (for Azure deployments)
az account show
```

## Minikube Issues

### Issue: Minikube Won't Start

**Symptoms:**
```
❌ Exiting due to RSRC_INSUFFICIENT_CORES: Requested cpu count 4 is greater than available cpus
```

**Diagnosis:**
```bash
# Check available resources
sysctl -n hw.ncpu              # macOS - CPU count
sysctl hw.memsize              # macOS - Total memory
nproc                          # Linux - CPU count
free -h                        # Linux - Memory
```

**Solutions:**

1. **Reduce resource allocation:**
   ```bash
   minikube start --cpus=2 --memory=4096
   ```

2. **Close other applications** to free up resources

3. **Increase Docker Desktop resources:**
   - Docker Desktop > Preferences > Resources
   - Increase CPU and Memory limits
   - Apply & Restart

4. **Modify default settings** in [MinikubeDeployer.ts](../tools/kubernetes-deployer/src/deployers/MinikubeDeployer.ts):
   ```typescript
   this.minikubeConfig = {
     cpus: 2,      // Reduced from 4
     memory: 4096, // Reduced from 7836
     diskSize: '20g',
   };
   ```

### Issue: Minikube Cluster Not Accessible

**Symptoms:**
```
Unable to connect to the server: dial tcp: lookup minikube on 127.0.0.1:53: no such host
```

**Diagnosis:**
```bash
# Check Minikube status
minikube status

# Check kubectl context
kubectl config current-context
kubectl config get-contexts
```

**Solutions:**

1. **Start Minikube if stopped:**
   ```bash
   minikube start
   ```

2. **Set correct context:**
   ```bash
   kubectl config use-context minikube
   ```

3. **Restart Minikube:**
   ```bash
   minikube stop
   minikube start
   ```

4. **Delete and recreate cluster:**
   ```bash
   minikube delete
   npm run minikube:deploy
   ```

### Issue: Docker Daemon Not Running

**Symptoms:**
```
❌ Docker daemon is not running. Please start Docker Desktop.
```

**Solutions:**

1. **Start Docker Desktop:**
   ```bash
   open -a Docker  # macOS
   ```

2. **Wait for Docker to be ready:**
   ```bash
   while ! docker info > /dev/null 2>&1; do
     echo "Waiting for Docker..."
     sleep 1
   done
   ```

3. **Verify Docker is running:**
   ```bash
   docker info
   docker ps
   ```

### Issue: Images Not Found in Minikube

**Symptoms:**
```
Failed to pull image "srvthreds/engine:latest": rpc error: code = Unknown
```

**Diagnosis:**
```bash
# Check if Docker environment is set to Minikube
env | grep DOCKER

# List images in Minikube
eval $(minikube docker-env)
docker images | grep srvthreds
```

**Solutions:**

1. **Set Docker environment to Minikube:**
   ```bash
   eval $(minikube docker-env)
   ```

2. **Rebuild images:**
   ```bash
   cd ../srvthreds
   npm run deploymentCli -- minikube build_server
   ```

3. **Verify images exist:**
   ```bash
   docker images | grep srvthreds
   ```

4. **Ensure imagePullPolicy is correct** in manifests:
   ```yaml
   spec:
     containers:
       - name: engine
         image: srvthreds/engine:latest
         imagePullPolicy: Never  # Use local images
   ```

### Issue: Host Databases Not Accessible

**Symptoms:**
```
MongoNetworkError: failed to connect to server [host.minikube.internal:27017]
```

**Diagnosis:**
```bash
# Check if databases are running on host
docker ps | grep mongo
docker ps | grep redis

# Test connectivity from Minikube
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
telnet host.minikube.internal 27017
```

**Solutions:**

1. **Start host databases:**
   ```bash
   cd ../srvthreds
   npm run deploymentCli -- minikube s_a_dbs
   ```

2. **Verify MongoDB replica set:**
   ```bash
   docker exec mongo-repl-1 mongosh --eval "rs.status()"
   ```

3. **Initialize MongoDB replica set if needed:**
   ```bash
   cd ../srvthreds
   bash infrastructure/local/docker/scripts/setup-repl.sh
   ```

4. **Verify Redis:**
   ```bash
   docker exec redis redis-cli ping
   ```

5. **Check firewall** isn't blocking host.minikube.internal

### Issue: Namespace Stuck Terminating

**Symptoms:**
```bash
kubectl get ns
# srvthreds   Terminating   10m
```

**Solutions:**

1. **Wait longer** (can take a few minutes with persistent volumes)

2. **Force delete namespace:**
   ```bash
   kubectl delete namespace srvthreds --grace-period=0 --force
   ```

3. **Remove finalizers:**
   ```bash
   kubectl get namespace srvthreds -o json | \
     jq '.spec.finalizers = []' | \
     kubectl replace --raw "/api/v1/namespaces/srvthreds/finalize" -f -
   ```

4. **Check for stuck resources:**
   ```bash
   kubectl api-resources --verbs=list --namespaced -o name | \
     xargs -n 1 kubectl get --show-kind --ignore-not-found -n srvthreds
   ```

## Azure/AKS Issues

### Issue: Not Logged In to Azure

**Symptoms:**
```
ERROR: Please run 'az login' to setup account.
```

**Solutions:**

1. **Login to Azure:**
   ```bash
   az login
   ```

2. **Set correct subscription:**
   ```bash
   # List subscriptions
   az account list --output table

   # Set subscription
   az account set --subscription "<subscription-id-or-name>"

   # Verify
   az account show
   ```

3. **Refresh token if expired:**
   ```bash
   az account get-access-token
   ```

### Issue: AKS Cluster Not Found

**Symptoms:**
```
ERROR: AKS cluster 'CAZ-SRVTHREDS-D-E-AKS' not found in resource group 'CAZ-SRVTHREDS-D-E-RG'
```

**Diagnosis:**
```bash
# Check if cluster exists
az aks list --output table

# Check resource group
az group list --output table

# Check cluster details
az aks show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS
```

**Solutions:**

1. **Create infrastructure first:**
   ```bash
   npm run tf:init -- dev
   npm run tf:apply -- dev
   ```

2. **Verify naming conventions** match Terraform configuration

3. **Check correct subscription:**
   ```bash
   az account show
   ```

### Issue: Cannot Get AKS Credentials

**Symptoms:**
```
ERROR: Failed to get AKS credentials
```

**Diagnosis:**
```bash
# Check AKS status
az aks show \
  --resource-group CAZ-SRVTHREDS-D-E-RG \
  --name CAZ-SRVTHREDS-D-E-AKS \
  --query powerState

# Check permissions
az role assignment list --assignee $(az account show --query user.name -o tsv)
```

**Solutions:**

1. **Get credentials manually:**
   ```bash
   az aks get-credentials \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --name CAZ-SRVTHREDS-D-E-AKS \
     --overwrite-existing
   ```

2. **Verify cluster is running:**
   ```bash
   az aks show \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --name CAZ-SRVTHREDS-D-E-AKS \
     --query powerState.code
   ```

3. **Check RBAC permissions:**
   ```bash
   # Need at least "Azure Kubernetes Service Cluster User Role"
   az role assignment create \
     --assignee <user-principal-id> \
     --role "Azure Kubernetes Service Cluster User Role" \
     --scope <aks-resource-id>
   ```

### Issue: ACR Access Denied

**Symptoms:**
```
Failed to pull image from ACR: unauthorized: authentication required
```

**Diagnosis:**
```bash
# Check ACR exists
az acr list --output table

# Check ACR login server
az acr show --name cazsrvthredsdeacr --query loginServer

# Test ACR connection
az acr check-health --name cazsrvthredsdeacr
```

**Solutions:**

1. **Login to ACR:**
   ```bash
   az acr login --name cazsrvthredsdeacr
   ```

2. **Attach ACR to AKS:**
   ```bash
   az aks update \
     --resource-group CAZ-SRVTHREDS-D-E-RG \
     --name CAZ-SRVTHREDS-D-E-AKS \
     --attach-acr cazsrvthredsdeacr
   ```

3. **Create image pull secret** (alternative):
   ```bash
   # Get ACR credentials
   ACR_UNAME=$(az acr credential show -n cazsrvthredsdeacr --query username -o tsv)
   ACR_PASSWD=$(az acr credential show -n cazsrvthredsdeacr --query passwords[0].value -o tsv)

   # Create secret
   kubectl create secret docker-registry acr-secret \
     --docker-server=cazsrvthredsdeacr.azurecr.io \
     --docker-username=$ACR_UNAME \
     --docker-password=$ACR_PASSWD \
     -n srvthreds

   # Reference in deployment
   # spec:
   #   imagePullSecrets:
   #     - name: acr-secret
   ```

### Issue: Image Push to ACR Failing

**Symptoms:**
```
Error response from daemon: Get https://cazsrvthredsdeacr.azurecr.io/v2/: unauthorized
```

**Solutions:**

1. **Ensure logged into ACR:**
   ```bash
   az acr login --name cazsrvthredsdeacr
   ```

2. **Check ACR admin user is enabled:**
   ```bash
   az acr update --name cazsrvthredsdeacr --admin-enabled true
   ```

3. **Verify image tag format:**
   ```bash
   # Correct format:
   docker tag local-image:latest cazsrvthredsdeacr.azurecr.io/srvthreds/engine:dev
   ```

4. **Check network connectivity:**
   ```bash
   ping cazsrvthredsdeacr.azurecr.io
   ```

## Terraform Issues

### Issue: Terraform State Locked

**Symptoms:**
```
Error: Error locking state: Error acquiring the state lock: storage: service returned error: StatusCode=409
```

**Diagnosis:**
```bash
# Check who has the lock
az storage blob show \
  --account-name <storage-account> \
  --container-name tfstate \
  --name <state-file> \
  --query metadata

# This shows the lock ID and who acquired it
```

**Solutions:**

1. **Wait for other operation to complete** (recommended)

2. **Force unlock** (use with extreme caution):
   ```bash
   cd cloud/terraform/stacks/dev
   terraform force-unlock <lock-id>
   ```

3. **Manual unlock** (if force-unlock fails):
   ```bash
   az storage blob lease break \
     --account-name <storage-account> \
     --container-name tfstate \
     --blob-name <state-file>
   ```

**Prevention:**
- Always let Terraform operations complete
- Don't kill Terraform processes
- Use proper CI/CD pipelines with locking mechanisms

### Issue: Terraform State Drift

**Symptoms:**
```
Warning: Inconsistent dependency lock file
Error: Resource <resource> has been deleted outside of Terraform
```

**Diagnosis:**
```bash
# Check for drift
npm run tf:plan -- dev

# List current state
npm run terraform -- state list dev

# Show specific resource
npm run terraform -- state show dev <resource-address>
```

**Solutions:**

1. **Refresh state:**
   ```bash
   cd cloud/terraform/stacks/dev
   terraform refresh
   ```

2. **Import manually deleted resources:**
   ```bash
   npm run tf:import -- <stack> <resource-type> <resource-name> <azure-id>

   # Example:
   npm run tf:import -- aks azurerm_kubernetes_cluster aks_cluster \
     "/subscriptions/.../resourceGroups/.../providers/Microsoft.ContainerService/managedClusters/..."
   ```

3. **Remove deleted resources from state:**
   ```bash
   npm run terraform -- state rm dev <resource-address>
   ```

### Issue: Terraform Provider Errors

**Symptoms:**
```
Error: Failed to instantiate provider "azurerm"
```

**Solutions:**

1. **Re-initialize Terraform:**
   ```bash
   npm run tf:init -- dev
   ```

2. **Clear provider cache:**
   ```bash
   rm -rf cloud/terraform/stacks/dev/.terraform
   npm run tf:init -- dev
   ```

3. **Update provider version:**
   ```hcl
   # In versions.tf
   terraform {
     required_providers {
       azurerm = {
         source  = "hashicorp/azurerm"
         version = "~> 3.0"  # Update version
       }
     }
   }
   ```

### Issue: Insufficient Azure Quota

**Symptoms:**
```
Error: creating Kubernetes Cluster: compute.VirtualMachinesClient#CreateOrUpdate:
Failure responding to request: StatusCode=400 -- Original Error:
OperationNotAllowed: Operation could not be completed as it results in exceeding approved quota.
```

**Diagnosis:**
```bash
# Check current quotas
az vm list-usage --location eastus --output table

# Check specific quota
az quota show \
  --scope "/subscriptions/<subscription-id>/providers/Microsoft.Compute/locations/eastus" \
  --resource-name standardDSv3Family
```

**Solutions:**

1. **Request quota increase:**
   ```bash
   # Via Azure Portal:
   # 1. Go to Subscriptions
   # 2. Select subscription
   # 3. Usage + quotas
   # 4. Request increase
   ```

2. **Use different VM size:**
   ```hcl
   # In terraform.tfvars
   aks_vm_size = "Standard_D2s_v3"  # Smaller size
   ```

3. **Reduce node count:**
   ```hcl
   # In terraform.tfvars
   aks_node_count = 1  # Fewer nodes
   ```

4. **Use different region:**
   ```hcl
   # In terraform.tfvars
   location = "westus2"  # Different region might have quota
   ```

## Kubernetes Issues

### Issue: Pods Stuck in Pending

**Symptoms:**
```
NAME                    READY   STATUS    RESTARTS   AGE
srvthreds-engine-xxx    0/1     Pending   0          5m
```

**Diagnosis:**
```bash
# Check pod details
kubectl describe pod <pod-name> -n srvthreds

# Check events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Check node resources
kubectl top nodes
kubectl describe nodes
```

**Common Causes & Solutions:**

1. **Insufficient resources:**
   ```bash
   # Event: "0/1 nodes are available: 1 Insufficient memory."

   # Solution: Scale cluster or reduce pod requests
   kubectl scale deployment <deployment> --replicas=0 -n srvthreds
   # Reduce resource requests in deployment
   # Or scale cluster:
   az aks scale --node-count 2 ...  # AKS
   minikube start --memory=8192     # Minikube
   ```

2. **Image pull error:**
   ```bash
   # Event: "Failed to pull image"

   # Check image exists
   docker images | grep srvthreds  # Minikube
   az acr repository list --name cazsrvthredsdeacr  # AKS

   # Rebuild/push images
   ```

3. **PVC not bound:**
   ```bash
   # Event: "pod has unbound immediate PersistentVolumeClaims"

   # Check PVCs
   kubectl get pvc -n srvthreds

   # Check storage class exists
   kubectl get storageclass
   ```

### Issue: Pods Crashing (CrashLoopBackOff)

**Symptoms:**
```
srvthreds-engine-xxx   0/1   CrashLoopBackOff   5   10m
```

**Diagnosis:**
```bash
# Check pod logs
kubectl logs <pod-name> -n srvthreds

# Check previous container logs
kubectl logs <pod-name> -n srvthreds --previous

# Describe pod
kubectl describe pod <pod-name> -n srvthreds

# Check liveness/readiness probes
kubectl get pod <pod-name> -n srvthreds -o yaml | grep -A 10 probe
```

**Common Causes & Solutions:**

1. **Application error:**
   ```bash
   # Check logs for error messages
   kubectl logs <pod-name> -n srvthreds | grep -i error

   # Debug with shell access (if pod stays up long enough)
   kubectl exec -it <pod-name> -n srvthreds -- sh
   ```

2. **Database connection failure:**
   ```bash
   # Test database connectivity
   kubectl run -it --rm debug --image=busybox -n srvthreds -- sh
   telnet mongodb-service 27017
   telnet redis-service 6379

   # Check connection strings in ConfigMap
   kubectl get configmap srvthreds-config -n srvthreds -o yaml
   ```

3. **Missing environment variables:**
   ```bash
   # Check env vars
   kubectl exec <pod-name> -n srvthreds -- env

   # Compare with ConfigMap/Secret
   kubectl get configmap -n srvthreds
   kubectl get secret -n srvthreds
   ```

4. **Probe failures:**
   ```bash
   # Increase probe delays
   livenessProbe:
     initialDelaySeconds: 60  # Give more time to start
     periodSeconds: 10
     failureThreshold: 3
   ```

### Issue: Service Not Accessible

**Symptoms:**
```
curl: (7) Failed to connect to <service-ip> port 3000: Connection refused
```

**Diagnosis:**
```bash
# Check service
kubectl get svc -n srvthreds

# Check endpoints
kubectl get endpoints -n srvthreds

# Describe service
kubectl describe svc <service-name> -n srvthreds

# Check if pods are ready
kubectl get pods -n srvthreds

# Test from within cluster
kubectl run -it --rm debug --image=nicolaka/netshoot -n srvthreds -- bash
curl http://<service-name>:3000/health
```

**Solutions:**

1. **Check selector matches pods:**
   ```bash
   # Service selector
   kubectl get svc <service-name> -n srvthreds -o yaml | grep -A 5 selector

   # Pod labels
   kubectl get pods -n srvthreds --show-labels

   # They must match!
   ```

2. **Verify port configuration:**
   ```yaml
   # Service
   spec:
     ports:
       - port: 3000        # Service port
         targetPort: 3000  # Container port

   # Must match deployment container port
   ```

3. **Check pod readiness:**
   ```bash
   kubectl get pods -n srvthreds

   # All pods should be READY
   # If not, check readiness probe
   ```

4. **For LoadBalancer services (AKS):**
   ```bash
   # Check if external IP is assigned
   kubectl get svc -n srvthreds

   # If stuck in <pending>, check Azure limits
   az network lb list --output table
   ```

## Docker Issues

### Issue: Docker Build Failures

**Symptoms:**
```
ERROR: failed to solve: failed to compute cache key
```

**Solutions:**

1. **Clear Docker cache:**
   ```bash
   docker builder prune -a
   ```

2. **Build without cache:**
   ```bash
   docker build --no-cache -t image:tag .
   ```

3. **Check Dockerfile syntax:**
   ```bash
   docker build --check .
   ```

4. **Verify file paths** in COPY/ADD commands exist

5. **Check .dockerignore** isn't excluding needed files

### Issue: Docker Out of Disk Space

**Symptoms:**
```
ERROR: failed to export image: failed to create image: write /var/lib/docker/...: no space left on device
```

**Solutions:**

1. **Clean up Docker:**
   ```bash
   # Remove unused data
   docker system prune -a --volumes

   # Clean builder cache
   docker builder prune -a
   ```

2. **Check disk usage:**
   ```bash
   docker system df
   ```

3. **Increase Docker disk size:**
   - Docker Desktop > Preferences > Resources > Disk image size
   - Increase and Apply

4. **For Minikube:**
   ```bash
   minikube delete
   minikube start --disk-size=40g
   ```

## Database Issues

### Issue: MongoDB Connection Refused

**Symptoms:**
```
MongoNetworkError: connect ECONNREFUSED
```

**Diagnosis:**
```bash
# Check MongoDB is running
docker ps | grep mongo  # For Minikube host databases
kubectl get pods -n srvthreds | grep mongo  # For in-cluster MongoDB

# Check MongoDB logs
docker logs mongo-repl-1
kubectl logs <mongo-pod> -n srvthreds

# Test connection
mongosh "mongodb://host.minikube.internal:27017"  # Minikube
mongosh "<cosmos-connection-string>"  # Azure
```

**Solutions:**

1. **For Minikube host databases:**
   ```bash
   # Start databases
   cd ../srvthreds
   npm run deploymentCli -- minikube s_a_dbs

   # Verify running
   docker ps | grep mongo
   ```

2. **Check replica set status:**
   ```bash
   docker exec mongo-repl-1 mongosh --eval "rs.status()"

   # If not initialized
   cd ../srvthreds
   bash infrastructure/local/docker/scripts/setup-repl.sh
   ```

3. **Verify connection string:**
   ```bash
   # Should match environment
   kubectl get configmap srvthreds-config -n srvthreds -o yaml
   ```

### Issue: Redis Connection Refused

**Symptoms:**
```
Error: Redis connection to host.minikube.internal:6379 failed - connect ECONNREFUSED
```

**Solutions:**

1. **Check Redis is running:**
   ```bash
   docker ps | grep redis
   docker logs redis
   ```

2. **Test Redis:**
   ```bash
   docker exec redis redis-cli ping
   # Should return PONG
   ```

3. **Restart Redis:**
   ```bash
   docker restart redis
   ```

4. **For Azure Redis:**
   ```bash
   # Check Redis status
   az redis show \
     --name <redis-name> \
     --resource-group <rg-name> \
     --query provisioningState

   # Get connection details
   az redis show \
     --name <redis-name> \
     --resource-group <rg-name> \
     --query hostName

   # Test with redis-cli
   redis-cli -h <hostname> -p 6380 -a <password> --tls ping
   ```

## Network Issues

### Issue: DNS Resolution Failing

**Symptoms:**
```
Error: getaddrinfo ENOTFOUND mongodb-service.srvthreds.svc.cluster.local
```

**Diagnosis:**
```bash
# Test DNS resolution
kubectl run -it --rm debug --image=busybox -n srvthreds -- sh
nslookup mongodb-service
nslookup mongodb-service.srvthreds
nslookup mongodb-service.srvthreds.svc.cluster.local

# Check CoreDNS pods
kubectl get pods -n kube-system | grep coredns

# Check CoreDNS logs
kubectl logs -n kube-system -l k8s-app=kube-dns
```

**Solutions:**

1. **Restart CoreDNS:**
   ```bash
   kubectl delete pod -n kube-system -l k8s-app=kube-dns
   ```

2. **Verify service exists:**
   ```bash
   kubectl get svc -n srvthreds
   ```

3. **Check network policy** isn't blocking DNS:
   ```bash
   kubectl get networkpolicy -n srvthreds
   ```

### Issue: Pod-to-Pod Communication Failing

**Symptoms:**
```
Error: connect ETIMEDOUT
```

**Diagnosis:**
```bash
# Test from one pod to another
kubectl exec -it <source-pod> -n srvthreds -- sh
wget -O- http://<target-pod-ip>:3000/health

# Check network policies
kubectl get networkpolicy -n srvthreds

# Check Calico (if using)
kubectl get felixconfiguration -n kube-system
```

**Solutions:**

1. **Review network policies:**
   ```bash
   kubectl describe networkpolicy <policy-name> -n srvthreds
   ```

2. **Temporarily remove policies** to test:
   ```bash
   kubectl delete networkpolicy <policy-name> -n srvthreds
   ```

3. **Check firewall rules** (Azure):
   ```bash
   az network nsg list --output table
   az network nsg rule list --nsg-name <nsg-name> --resource-group <rg-name>
   ```

## Performance Issues

### Issue: Slow Pod Startup

**Solutions:**

1. **Reduce image size:**
   - Use multi-stage builds
   - Use alpine base images
   - Remove unnecessary dependencies

2. **Increase resource limits:**
   ```yaml
   resources:
     limits:
       cpu: "1000m"    # Increased
       memory: "1Gi"   # Increased
   ```

3. **Adjust probe timings:**
   ```yaml
   livenessProbe:
     initialDelaySeconds: 90  # Increased
   ```

4. **Pre-pull images:**
   ```bash
   # For Minikube
   eval $(minikube docker-env)
   docker pull <image>

   # For AKS
   # Use DaemonSet to pre-pull images
   ```

### Issue: High Memory Usage

**Diagnosis:**
```bash
# Check pod memory usage
kubectl top pods -n srvthreds

# Check node memory
kubectl top nodes

# Detailed metrics
kubectl describe node <node-name>
```

**Solutions:**

1. **Set appropriate resource limits:**
   ```yaml
   resources:
     requests:
       memory: "256Mi"
     limits:
       memory: "512Mi"
   ```

2. **Check for memory leaks** in application

3. **Increase node size:**
   ```bash
   # AKS
   az aks nodepool update \
     --resource-group <rg> \
     --cluster-name <cluster> \
     --name <nodepool> \
     --node-vm-size Standard_D4s_v3
   ```

4. **Scale horizontally** instead of vertically

## CLI Tool Issues

### Issue: npm Commands Failing

**Symptoms:**
```
Error: Cannot find module 'tsx'
```

**Solutions:**

1. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   npm install
   ```

3. **Check Node version:**
   ```bash
   node --version  # Should be v18+
   ```

### Issue: TypeScript Errors

**Symptoms:**
```
error TS2304: Cannot find name 'X'
```

**Solutions:**

1. **Run type checking:**
   ```bash
   npm run check
   ```

2. **Rebuild:**
   ```bash
   npm run build
   ```

3. **Check tsconfig.json** is correct

## Getting Help

If you're still stuck after trying these solutions:

1. **Check logs thoroughly:**
   - Application logs: `kubectl logs`
   - System logs: `kubectl logs -n kube-system`
   - Docker logs: `docker logs`
   - Terraform logs: add `--debug` flag

2. **Search existing issues:**
   - Check project issue tracker
   - Search Stack Overflow
   - Check Kubernetes/Azure documentation

3. **Create detailed bug report:**
   - Describe the issue
   - Include error messages
   - List steps to reproduce
   - Include environment details
   - Attach relevant logs

4. **Ask for help:**
   - Create issue in repository
   - Contact DevOps team
   - Reference this guide

## Additional Resources

- [Kubernetes Troubleshooting](https://kubernetes.io/docs/tasks/debug/)
- [Azure AKS Troubleshooting](https://docs.microsoft.com/en-us/azure/aks/troubleshooting)
- [Terraform Troubleshooting](https://developer.hashicorp.com/terraform/tutorials/configuration-language/troubleshooting-workflow)
- [Docker Troubleshooting](https://docs.docker.com/config/daemon/troubleshoot/)
- [Minikube Issues](https://minikube.sigs.k8s.io/docs/handbook/troubleshooting/)

## Next Steps

- Return to [README](../README.md)
- Check [Minikube Deployment Guide](MINIKUBE_DEPLOYMENT.md)
- Check [Azure Deployment Guide](AZURE_DEPLOYMENT.md)
- Review [Project Configuration Guide](PROJECT_CONFIGURATION.md)
