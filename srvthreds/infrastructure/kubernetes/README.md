# Kubernetes Deployment Guide

## Quick Start

### Deploy to Minikube (Full Setup)
```bash
npm run deploymentCli local k8s_minikube
```
This will:
- Start Minikube cluster
- Switch kubectl context
- Build Docker images
- Start host databases
- Deploy all services
- Wait for pods to be ready
- Setup port forwarding

### Apply Manifests Only
```bash
npm run deploymentCli local k8s_apply
```
Use this when Minikube is already running and you just want to update manifests.

## Cleanup Options

### Option 1: Soft Reset (Recommended for iterative development)
```bash
npm run deploymentCli local k8s_reset
```
- Deletes the `srvthreds` namespace and all resources
- Keeps Minikube cluster running
- Keeps databases running
- Fast - takes ~10 seconds

**Use when:** You want to redeploy quickly without restarting everything.

### Option 2: Delete Resources Only
```bash
npm run deploymentCli local k8s_delete
```
- Deletes the `srvthreds` namespace
- Same as reset but uses kubectl directly

### Option 3: Full Cleanup (Complete fresh start)
```bash
npm run deploymentCli local k8s_cleanup
```
- Deletes the entire Minikube cluster
- Removes all Docker images
- Optionally stops host databases
- Complete fresh slate

**Use when:** You want to start completely fresh or having cluster issues.

## Manual Operations

### Context Management
```bash
# List all contexts
./infrastructure/kubernetes/scripts/list-contexts.sh

# Switch to Minikube
./infrastructure/kubernetes/scripts/switch-to-minikube.sh

# Switch back to another context
kubectl config use-context <context-name>
```

### Useful kubectl Commands
```bash
# Check pod status
kubectl get pods -n srvthreds

# Watch pod status
kubectl get pods -n srvthreds -w

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
kubectl logs -f deployment/srvthreds-session-agent -n srvthreds
kubectl logs -f deployment/srvthreds-persistence-agent -n srvthreds

# Describe resources
kubectl describe deployment srvthreds-engine -n srvthreds
kubectl describe pod <pod-name> -n srvthreds

# Access services
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds

# Check all resources
kubectl get all -n srvthreds

# View configmap
kubectl get configmap srvthreds-config -n srvthreds -o yaml
```

### Minikube Commands
```bash
# Start Minikube
minikube start

# Stop Minikube (keeps cluster for later)
minikube stop

# Delete Minikube cluster completely
minikube delete

# Open Kubernetes dashboard
minikube dashboard

# Get Minikube IP
minikube ip

# SSH into Minikube
minikube ssh

# Check status
minikube status
```

## Troubleshooting

### Pods stuck in Pending
```bash
kubectl describe pod <pod-name> -n srvthreds
# Look for events - often resource constraints or image pull issues
```

### Image pull errors
```bash
# Rebuild images in Minikube's Docker environment
eval $(minikube docker-env)
docker compose -f infrastructure/local/compose/docker-compose-services.yml build srvthreds-builder
```

### Can't connect to databases
```bash
# Verify databases are running on host
docker ps | grep mongo
docker ps | grep redis
docker ps | grep rabbitmq

# Check ConfigMap has correct host
kubectl get configmap srvthreds-config -n srvthreds -o yaml
# Should show: host.minikube.internal:27017 for MongoDB
```

### Wrong kubectl context
```bash
# Check current context
kubectl config current-context

# Switch to Minikube
kubectl config use-context minikube
```

## Development Workflow

### Typical Iteration Cycle

1. **Initial Setup** (once)
   ```bash
   npm run deploymentCli local k8s_minikube
   ```

2. **Make code changes**

3. **Rebuild and redeploy**
   ```bash
   # Quick reset (keeps cluster running)
   npm run deploymentCli local k8s_reset

   # Rebuild images
   eval $(minikube docker-env)
   docker compose -f infrastructure/local/compose/docker-compose-services.yml build srvthreds-builder

   # Redeploy
   npm run deploymentCli local k8s_apply
   ```

4. **View logs and test**
   ```bash
   kubectl logs -f deployment/srvthreds-engine -n srvthreds
   ```

5. **Repeat steps 2-4**

### When to Use Full Cleanup

- After major configuration changes
- When experiencing persistent issues
- Before switching to different work
- End of day cleanup

```bash
npm run deploymentCli local k8s_cleanup
```

## Architecture

### What Runs Where

**In Minikube Cluster:**
- SrvThreds Engine (Deployment)
- Session Agent (Deployment)
- Persistence Agent (Deployment)
- RabbitMQ (Deployment)
- Bootstrap (Job - runs once)

**On Host Machine (Docker):**
- MongoDB (replica set)
- Redis

**Why?** Databases run on host for better performance and easier data persistence during development.

### Network Connectivity

Services in Minikube connect to host databases using:
- `host.minikube.internal:27017` - MongoDB
- `host.minikube.internal:6379` - Redis
- `rabbitmq:5672` - RabbitMQ (in cluster)

## Files and Structure

```
infrastructure/kubernetes/
├── base/                          # Base Kubernetes manifests
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── srvthreds-engine.yaml
│   ├── srvthreds-session-agent.yaml
│   ├── srvthreds-persistence-agent.yaml
│   └── srvthreds-bootstrap.yaml
├── overlays/
│   └── minikube/                  # Minikube-specific overrides
│       ├── kustomization.yaml
│       ├── configmap-minikube.yaml
│       └── rabbitmq.yaml
└── scripts/
    ├── setup-minikube.sh          # Full setup
    ├── cleanup-minikube.sh        # Full cleanup
    ├── reset-minikube.sh          # Quick reset
    ├── switch-to-minikube.sh      # Context switcher
    └── list-contexts.sh           # Context lister
```
