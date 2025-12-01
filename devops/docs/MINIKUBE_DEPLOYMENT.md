# Minikube Deployment Guide

Comprehensive guide for deploying applications to a local Minikube Kubernetes cluster.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Deployment Workflows](#deployment-workflows)
- [Configuration](#configuration)
- [Operations](#operations)
- [Debugging](#debugging)
- [Advanced Topics](#advanced-topics)
- [Troubleshooting](#troubleshooting)

## Overview

Minikube provides a local Kubernetes cluster for development and testing. This deployment platform:

- Automatically creates and configures a Minikube cluster
- Builds Docker images in Minikube's Docker environment
- Deploys applications using Kustomize manifests
- Sets up databases (MongoDB, Redis) on the host Docker
- Provides port forwarding for local access

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Host Machine                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Host Docker                                 │  │
│  │  ┌────────────┐   ┌────────────┐            │  │
│  │  │  MongoDB   │   │   Redis    │            │  │
│  │  └────────────┘   └────────────┘            │  │
│  └──────────────────────────────────────────────┘  │
│                        ▲                            │
│                        │                            │
│  ┌─────────────────────┼─────────────────────────┐ │
│  │  Minikube Cluster   │ host.minikube.internal  │ │
│  │                     │                         │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │  Namespace: srvthreds                   │ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────┐│ │ │
│  │  │  │  Engine  │  │ Session  │  │Persist││ │ │
│  │  │  │   Pod    │  │   Pod    │  │  Pod  ││ │ │
│  │  │  └──────────┘  └──────────┘  └───────┘│ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────────────────────────────┐  │ │ │
│  │  │  │       RabbitMQ                   │  │ │ │
│  │  │  │      (StatefulSet)               │  │ │ │
│  │  │  └──────────────────────────────────┘  │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

- **Databases on Host**: MongoDB and Redis run on host Docker (not Minikube) for better performance and persistence
- **Services in Minikube**: Application services run in Minikube cluster
- **Host Communication**: Services connect to databases via `host.minikube.internal`
- **RabbitMQ in Cluster**: RabbitMQ runs as a StatefulSet in Minikube for service-to-service messaging

## Prerequisites

### Required Software

1. **Docker Desktop** (v20.10+)
   ```bash
   # Verify installation
   docker --version
   docker info
   ```

2. **Minikube** (v1.30+)
   ```bash
   # Verify installation
   minikube version
   ```

3. **kubectl** (v1.26+)
   ```bash
   # Verify installation
   kubectl version --client
   ```

4. **Node.js** (v18+)
   ```bash
   # Verify installation
   node --version
   npm --version
   ```

### System Requirements

- **CPU**: 4+ cores (6+ recommended)
- **Memory**: 8GB+ RAM (12GB+ recommended)
- **Disk**: 20GB+ free space
- **OS**: macOS, Linux, or Windows with WSL2

### Installation

#### macOS (Homebrew)

```bash
# Install Docker Desktop
brew install --cask docker

# Install Minikube
brew install minikube

# Install kubectl
brew install kubectl

# Install Node.js
brew install node
```

#### Linux

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Minikube
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

#### Windows (WSL2)

Use WSL2 with Ubuntu and follow Linux instructions above.

## Quick Start

### First-Time Setup

```bash
# 1. Navigate to devops directory
cd devops

# 2. Install dependencies
npm install

# 3. Start Docker Desktop (if not running)
# Click Docker Desktop app icon

# 4. Deploy to Minikube (creates cluster automatically)
npm run minikube:deploy

# 5. Wait for deployment to complete
# This may take 5-10 minutes on first run

# 6. Verify deployment
npm run minikube:status
```

### What Happens During First Deploy

1. **Pre-deployment Checks**
   - Verifies Docker is running
   - Checks Minikube installation
   - Creates Minikube cluster with:
     - 4 CPUs
     - 7836 MB memory
     - 20GB disk
     - Docker driver
   - Configures kubectl context

2. **Build Images**
   - Sets Docker environment to Minikube
   - Builds all service images
   - Images are stored in Minikube's Docker daemon

3. **Setup Databases**
   - Starts MongoDB replica set on host Docker
   - Starts Redis on host Docker
   - Initializes MongoDB replica set
   - Verifies database health

4. **Apply Manifests**
   - Creates `srvthreds` namespace
   - Applies ConfigMaps
   - Creates Deployments and Services
   - Starts RabbitMQ StatefulSet

5. **Wait for Readiness**
   - Monitors deployment rollout
   - Waits for all pods to be ready
   - Validates health checks pass

6. **Validation**
   - Checks pod status
   - Verifies services are running
   - Reports deployment health

### Accessing Services

Once deployed, access services via port forwarding:

```bash
# Forward session-agent to localhost:3000
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000

# Access in browser
open http://localhost:3000
```

## Deployment Workflows

### Standard Deployment

Full deployment with all steps:

```bash
npm run minikube:deploy
```

### Dry Run

Preview what would happen without making changes:

```bash
npm run k8s -- minikube deploy --dry-run
```

### Verbose Mode

Enable detailed logging for debugging:

```bash
npm run k8s -- minikube deploy -v
```

### Deploy Specific Project

Deploy a different project (if configured):

```bash
npm run k8s -- minikube deploy --project demo-env
```

## Configuration

### Minikube Cluster Settings

Default cluster configuration (can be modified in [MinikubeDeployer.ts](../tools/kubernetes-deployer/src/deployers/MinikubeDeployer.ts)):

```typescript
{
  cpus: 4,           // CPU cores allocated
  memory: 7836,      // Memory in MB
  diskSize: '20g'    // Disk size
}
```

To change these settings, modify the `MinikubeDeployer` constructor options or pass them programmatically.

### Database Configuration

Databases run on host Docker and are accessible to Minikube services via `host.minikube.internal`.

**MongoDB:**
- Port: 27017
- Connection: `host.minikube.internal:27017`
- Replica Set: `rs0`
- Container: `mongo-repl-1`

**Redis:**
- Port: 6379
- Connection: `host.minikube.internal:6379`
- Container: `redis`

**RabbitMQ:**
- AMQP Port: 5672
- Management Port: 15672
- Connection: `rabbitmq-service:5672` (in-cluster)
- Type: StatefulSet (persistent)

### Service Configuration

Services are configured in [config-registry.yaml](../configs/config-registry.yaml):

```yaml
services:
  engine:
    ports:
      http: 8082
    resources:
      memory:
        request: 256Mi
        limit: 512Mi
      cpu:
        request: 200m
        limit: 500m
    replicas:
      dev: 1
```

### Manifest Customization

Manifests are in `local/minikube/<project>/manifests/minikube/`:

```bash
# View manifests
ls local/minikube/srvthreds/manifests/minikube/

# View rendered manifests
kubectl kustomize local/minikube/srvthreds/manifests/minikube/
```

To customize:
1. Edit YAML files in the manifest directory
2. Redeploy to apply changes

## Operations

### Cluster Management

```bash
# Start Minikube cluster (if stopped)
minikube start

# Stop Minikube cluster (preserves data)
minikube stop

# Delete Minikube cluster
minikube delete

# View cluster status
minikube status

# Get cluster IP
minikube ip

# SSH into cluster node
minikube ssh
```

### Deployment Management

```bash
# Deploy application
npm run minikube:deploy

# Check deployment status
npm run minikube:status

# Reset deployment (delete namespace, keep cluster)
npm run minikube:reset

# Full cleanup (destroy cluster and optionally databases)
npm run minikube:cleanup

# Cleanup with databases
npm run k8s -- minikube cleanup --delete-dbs
```

### Image Management

```bash
# Set Docker environment to Minikube
eval $(minikube docker-env)

# List images in Minikube
docker images

# Build new images
cd ../srvthreds
npm run deploymentCli -- minikube build_server

# Reset Docker environment to host
eval $(minikube docker-env -u)
```

### Database Management

```bash
# Start databases
cd ../srvthreds
npm run deploymentCli -- minikube s_a_dbs

# Stop databases
npm run deploymentCli -- minikube d_a_dbs

# Connect to MongoDB
docker exec -it mongo-repl-1 mongosh

# Connect to Redis
docker exec -it redis redis-cli

# View database logs
docker logs mongo-repl-1
docker logs redis
```

### Pod Management

```bash
# List pods
kubectl get pods -n srvthreds

# View pod details
kubectl describe pod <pod-name> -n srvthreds

# View pod logs
kubectl logs <pod-name> -n srvthreds

# Follow pod logs
kubectl logs -f <pod-name> -n srvthreds

# Execute command in pod
kubectl exec -it <pod-name> -n srvthreds -- sh

# Delete pod (triggers restart)
kubectl delete pod <pod-name> -n srvthreds
```

### Service Management

```bash
# List services
kubectl get svc -n srvthreds

# View service details
kubectl describe svc <service-name> -n srvthreds

# Port forward to service
kubectl port-forward -n srvthreds svc/<service-name> <local-port>:<service-port>

# Example: Forward session-agent
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000
```

### Namespace Management

```bash
# View all namespaces
kubectl get namespaces

# View resources in namespace
kubectl get all -n srvthreds

# Describe namespace
kubectl describe namespace srvthreds

# Delete namespace (removes all resources)
kubectl delete namespace srvthreds
```

## Debugging

### Check Deployment Status

```bash
# Quick status check
npm run minikube:status

# Detailed pod status
kubectl get pods -n srvthreds -o wide

# Watch pod status (updates in real-time)
kubectl get pods -n srvthreds -w

# Check deployment rollout status
kubectl rollout status deployment/<deployment-name> -n srvthreds
```

### View Logs

```bash
# View logs for all pods in deployment
kubectl logs -n srvthreds -l app=srvthreds-engine

# View logs with timestamps
kubectl logs -n srvthreds <pod-name> --timestamps

# View previous container logs (after restart)
kubectl logs -n srvthreds <pod-name> --previous

# Stream logs from multiple pods
kubectl logs -n srvthreds -l app=srvthreds-engine -f --max-log-requests=10
```

### Inspect Resources

```bash
# View ConfigMaps
kubectl get configmap -n srvthreds
kubectl describe configmap <configmap-name> -n srvthreds

# View Secrets
kubectl get secrets -n srvthreds
kubectl describe secret <secret-name> -n srvthreds

# View Events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# View Resource Usage
kubectl top pods -n srvthreds
kubectl top nodes
```

### Common Debugging Commands

```bash
# Check why pod is not starting
kubectl describe pod <pod-name> -n srvthreds
kubectl logs <pod-name> -n srvthreds

# Check image pull issues
kubectl describe pod <pod-name> -n srvthreds | grep -A 10 Events

# Check resource constraints
kubectl top pod <pod-name> -n srvthreds
kubectl describe node minikube

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup mongodb-service.srvthreds.svc.cluster.local

# Test network connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash
```

### Minikube Dashboard

Access the Kubernetes dashboard:

```bash
# Start dashboard (opens in browser)
minikube dashboard

# Get dashboard URL without opening browser
minikube dashboard --url
```

### Minikube Addons

```bash
# List enabled addons
minikube addons list

# Enable metrics-server
minikube addons enable metrics-server

# View metrics
kubectl top nodes
kubectl top pods -n srvthreds
```

## Advanced Topics

### Custom Resource Configuration

Override default Minikube resources:

```typescript
// Modify in tools/kubernetes-deployer/src/deployers/MinikubeDeployer.ts
const deployer = new MinikubeDeployer({
  cpus: 6,          // More CPU
  memory: 12288,    // More memory (12GB)
  diskSize: '40g'   // More disk
});
```

### Multi-Node Cluster

Create a multi-node cluster (experimental):

```bash
# Start with multiple nodes
minikube start --nodes 3

# View nodes
kubectl get nodes
```

### Persistent Volumes

RabbitMQ uses persistent volumes:

```bash
# List persistent volumes
kubectl get pv

# List persistent volume claims
kubectl get pvc -n srvthreds

# Describe PVC
kubectl describe pvc <pvc-name> -n srvthreds
```

### Custom Docker Registry

Use a custom registry:

```bash
# Set registry
minikube addons configure registry-creds

# Pull images from private registry
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n srvthreds
```

### Resource Monitoring

Set up monitoring:

```bash
# Enable metrics-server
minikube addons enable metrics-server

# View resource usage
kubectl top nodes
kubectl top pods -n srvthreds --containers

# Get detailed metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

### Ingress Configuration

Enable ingress for external access:

```bash
# Enable ingress addon
minikube addons enable ingress

# Create ingress resource
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: srvthreds-ingress
  namespace: srvthreds
spec:
  rules:
  - host: srvthreds.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: srvthreds-session-agent-service
            port:
              number: 3000
EOF

# Get ingress address
kubectl get ingress -n srvthreds

# Add to /etc/hosts
echo "$(minikube ip) srvthreds.local" | sudo tee -a /etc/hosts
```

### Profile Management

Use different Minikube profiles:

```bash
# Create new profile
minikube start -p dev-profile

# List profiles
minikube profile list

# Switch profile
minikube profile dev-profile

# Delete profile
minikube delete -p dev-profile
```

### Tunnel for LoadBalancer Services

Expose LoadBalancer services:

```bash
# Start tunnel (requires sudo)
minikube tunnel

# In another terminal, check service
kubectl get svc -n srvthreds

# Access via EXTERNAL-IP
curl http://<external-ip>:3000
```

## Troubleshooting

### Common Issues

#### Issue: Minikube Won't Start

**Symptoms:**
```
❌ Exiting due to RSRC_INSUFFICIENT_CORES: Requested cpu count 4 is greater than the available cpus of 2
```

**Solution:**
```bash
# Check available resources
sysctl -n hw.ncpu  # macOS
nproc              # Linux

# Start with fewer resources
minikube start --cpus=2 --memory=4096

# Or modify MinikubeDeployer constructor defaults
```

#### Issue: Docker Not Running

**Symptoms:**
```
❌ Docker daemon is not running. Please start Docker Desktop.
```

**Solution:**
```bash
# Start Docker Desktop
open -a Docker  # macOS

# Wait for Docker to start
while ! docker info > /dev/null 2>&1; do
  echo "Waiting for Docker..."
  sleep 1
done

# Retry deployment
npm run minikube:deploy
```

#### Issue: Images Not Found

**Symptoms:**
```
Failed to pull image "srvthreds/engine:latest": rpc error: code = Unknown desc = Error response from daemon: pull access denied
```

**Solution:**
```bash
# Set Docker environment to Minikube
eval $(minikube docker-env)

# Rebuild images
cd ../srvthreds
npm run deploymentCli -- minikube build_server

# Verify images exist
docker images | grep srvthreds

# Redeploy
cd ../devops
npm run minikube:deploy
```

#### Issue: Pods Not Starting

**Symptoms:**
```
srvthreds-engine-xxx   0/1   CrashLoopBackOff
```

**Solution:**
```bash
# Check pod logs
kubectl logs <pod-name> -n srvthreds

# Check pod events
kubectl describe pod <pod-name> -n srvthreds

# Common causes:
# 1. Database connection issues
# 2. Missing environment variables
# 3. Image errors
# 4. Resource constraints

# Check database connectivity from pod
kubectl exec -it <pod-name> -n srvthreds -- sh
ping host.minikube.internal
nc -zv host.minikube.internal 27017
```

#### Issue: Database Connection Failed

**Symptoms:**
```
MongoNetworkError: failed to connect to server [host.minikube.internal:27017]
```

**Solution:**
```bash
# Check databases are running on host
docker ps | grep mongo
docker ps | grep redis

# If not running, start them
cd ../srvthreds
npm run deploymentCli -- minikube s_a_dbs

# Verify MongoDB replica set
docker exec mongo-repl-1 mongosh --eval "rs.status()"

# Verify Redis
docker exec redis redis-cli ping

# Test from Minikube
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
telnet host.minikube.internal 27017
```

#### Issue: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3001:3000
```

#### Issue: Namespace Stuck Terminating

**Symptoms:**
```bash
kubectl get ns
# srvthreds   Terminating   10m
```

**Solution:**
```bash
# Force delete namespace
kubectl delete namespace srvthreds --grace-period=0 --force

# If still stuck, remove finalizers
kubectl get namespace srvthreds -o json | jq '.spec.finalizers = []' | kubectl replace --raw "/api/v1/namespaces/srvthreds/finalize" -f -
```

#### Issue: Out of Disk Space

**Symptoms:**
```
Evicted pod due to disk pressure
```

**Solution:**
```bash
# Clean up unused images
eval $(minikube docker-env)
docker system prune -a

# Increase disk size (requires cluster recreation)
minikube delete
minikube start --disk-size=40g

# Check disk usage
minikube ssh
df -h
```

### Performance Optimization

#### Slow Builds

```bash
# Use BuildKit
export DOCKER_BUILDKIT=1

# Cache dependencies
# Ensure multi-stage builds copy package.json first

# Use faster disk location (macOS)
# Docker Desktop > Preferences > Resources > File Sharing
# Limit to necessary directories
```

#### Slow Pod Startup

```bash
# Increase resources
minikube start --cpus=6 --memory=12288

# Reduce image size
# Use alpine base images
# Multi-stage builds
# Remove unnecessary files

# Adjust health check delays
# In deployment.yaml:
livenessProbe:
  initialDelaySeconds: 60  # Increase for slow starts
```

#### High Memory Usage

```bash
# Check pod memory usage
kubectl top pods -n srvthreds

# Reduce memory limits if too high
# Edit deployment and reduce limits

# Reduce replicas for development
replicas: 1  # Instead of 3
```

### Cleanup and Reset

#### Full Cleanup

```bash
# Delete everything
npm run minikube:cleanup -- --delete-dbs

# Manually verify
minikube status  # Should show "Stopped" or error
docker ps | grep mongo  # Should be empty
docker ps | grep redis  # Should be empty

# Clean Docker system
docker system prune -a --volumes
```

#### Reset to Clean State

```bash
# Delete cluster
minikube delete

# Clean Docker
docker system prune -a --volumes

# Remove all Minikube data
rm -rf ~/.minikube

# Start fresh
npm run minikube:deploy
```

## Best Practices

1. **Resource Management**
   - Allocate sufficient resources for smooth operation
   - Monitor resource usage regularly
   - Clean up unused resources

2. **Image Management**
   - Use `eval $(minikube docker-env)` before building
   - Tag images consistently
   - Clean up old images regularly

3. **Database Management**
   - Keep databases running between deployments
   - Backup data before cleanup
   - Monitor database health

4. **Development Workflow**
   - Use `--dry-run` to preview changes
   - Use `-v` for detailed logs when debugging
   - Reset deployment instead of full cleanup when possible

5. **Troubleshooting**
   - Check logs first: `kubectl logs`
   - Check events: `kubectl get events`
   - Use `kubectl describe` for details
   - Test connectivity with debug pods

## Next Steps

- Configure additional projects: [Project Configuration Guide](PROJECT_CONFIGURATION.md)
- Deploy to Azure: [Azure Deployment Guide](AZURE_DEPLOYMENT.md)
- Troubleshoot issues: [Troubleshooting Guide](TROUBLESHOOTING.md)

For questions or issues, refer to the main [README](../README.md) or create an issue in the repository.
