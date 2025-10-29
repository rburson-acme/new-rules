# Developer Deployment Patterns

This document describes the **3 deployment patterns** available to developers working on SrvThreds.

---

## Pattern 1: Direct Code Execution (Hot Reload Development)

**Use When**: Active code development with hot reloading

**Scripts**: `start-*` prefix in package.json

**What Runs**:
- TypeScript code directly via `tsx`
- No containers
- Hot reload on file changes
- Requires databases running separately

**Commands**:
```bash
# Start all services (all-in-one dev server)
npm run start-dev

# Start individual components
npm run start-engine-dev
npm run start-session-agent-dev
npm run start-persistence-agent-dev

# With debugging
npm run start-dev-debug  # Debug on port 9229
```

**Prerequisites**:
- Databases must be running (use Pattern 2 to start databases)
- `.env` file configured with connection strings

**Typical Workflow**:
```bash
# Terminal 1: Start databases
npm run deploy-dev-databases

# Terminal 2: Start dev server with hot reload
npm run start-dev

# Make code changes → automatic restart
```

---

## Pattern 2: Docker Containers (Adhoc Testing)

**Use When**:
- Testing containerized deployment locally
- Running demo clients or test clients
- Need isolated environment without K8s complexity

**Scripts**: `deploy-*` prefix in package.json

**What Runs**:
- Docker Compose
- All services in containers
- Databases in containers (MongoDB replica set, Redis, RabbitMQ)
- Uses host Docker, not Minikube

**Commands**:
```bash
# Start everything (databases + services)
npm run deploy-dev-up-all

# Start only databases (useful for Pattern 1)
npm run deploy-dev-databases

# Start only services (if databases already running)
npm run deploy-dev-services

# Stop everything
npm run deploy-dev-down-all

# Stop only services (keep databases running)
npm run deploy-dev-down-services

# Interactive deployment menu
npm run deploymentCli
```

**What Gets Built**:
- `srvthreds-builder` image (base image with compiled code)
- Service containers: engine, session-agent, persistence-agent

**Configuration**:
- Uses `.env` files from `infrastructure/local/configs/`
- Docker Compose files in `infrastructure/local/compose/`

**Typical Workflow**:
```bash
# Start all services for testing
npm run deploy-dev-up-all

# Run your test client (e.g., demo-env, thredclient)
cd demo-env
npm start

# Stop when done
npm run deploy-dev-down-all
```

---

## Pattern 3: Minikube Kubernetes (Pre-Production Testing)

**Use When**:
- Testing Kubernetes deployments before cloud deployment
- Validating K8s manifests and ConfigMaps
- Testing clients against production-like environment
- Running integration tests in K8s

**Scripts**: `minikube-*` prefix in package.json

**What Runs**:
- Minikube Kubernetes cluster
- Services deployed as K8s Deployments
- RabbitMQ as StatefulSet (in cluster)
- **Databases on host Docker** (MongoDB, Redis via host.minikube.internal)

**Important**: Databases do NOT run in Kubernetes (matches production where managed databases are external)

**Commands**:
```bash
# Full setup (starts Minikube, builds images, deploys everything)
npm run minikube-create

# Apply manifest changes (cluster already running)
npm run minikube-apply

# Reset deployment (delete pods, keep cluster)
npm run minikube-reset

# Full cleanup (stop cluster, delete everything)
npm run minikube-cleanup

# Switch kubectl context to Minikube
npm run minikube-set-context

# Validate deployment
npm run minikube-validate
```

**What Gets Built**:
- Builds `srvthreds-builder` image in Minikube's Docker
- Tags as `srvthreds:dev` for K8s deployment

**Configuration**:
- Kubernetes manifests: `infrastructure/kubernetes/base/`
- Minikube overlay: `infrastructure/kubernetes/overlays/minikube/`
- Uses ConfigMap (not .env files)

**Typical Workflow**:
```bash
# One-time setup
npm run minikube-create

# Run your tests
cd thredclient
npm test

# Make manifest changes
vim infrastructure/kubernetes/base/srvthreds-engine.yaml

# Apply changes
npm run minikube-apply

# Check logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# Cleanup when done
npm run minikube-cleanup
```

**Useful kubectl Commands**:
```bash
# View all pods
kubectl get pods -n srvthreds

# Check pod status
kubectl describe pod -n srvthreds <pod-name>

# View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds
kubectl logs -f deployment/srvthreds-session-agent -n srvthreds

# Port forward for local access
kubectl port-forward svc/session-agent 3000:3000 -n srvthreds

# Execute commands in pod
kubectl exec -it -n srvthreds <pod-name> -- /bin/bash
```

---

## Comparison Matrix

| Feature | Pattern 1 (start-*) | Pattern 2 (deploy-*) | Pattern 3 (minikube-*) |
|---------|---------------------|----------------------|------------------------|
| **Hot Reload** | ✅ Yes | ❌ No | ❌ No |
| **Build Required** | ❌ No | ✅ Yes (Docker) | ✅ Yes (Docker) |
| **Startup Time** | Fast (5-10s) | Medium (30-60s) | Slow (2-5min) |
| **Databases** | External required | In Docker | On host Docker |
| **Isolation** | Low (shared host) | Medium (containers) | High (K8s cluster) |
| **Matches Production** | ❌ No | ⚠️ Partially | ✅ Yes |
| **Use For** | Active coding | Adhoc testing | Pre-prod validation |
| **Debugging** | Easy (tsx debug) | Medium (attach to container) | Hard (K8s context) |

---

## Choosing the Right Pattern

### Use Pattern 1 (start-*) when:
- ✅ You're actively writing code and need hot reload
- ✅ You want fast iteration cycles
- ✅ You're debugging TypeScript/Node.js issues
- ❌ NOT for: Testing deployment, testing clients

### Use Pattern 2 (deploy-*) when:
- ✅ You need to test containerized services
- ✅ You're running demo/test clients locally
- ✅ You want isolated environment without K8s overhead
- ✅ You need all services but don't care about K8s specifics
- ❌ NOT for: Testing K8s manifests, production-like testing

### Use Pattern 3 (minikube-*) when:
- ✅ You're testing Kubernetes manifests before pushing to cloud
- ✅ You're validating ConfigMaps, Services, Deployments
- ✅ You need production-like environment
- ✅ You're running integration tests that require K8s
- ✅ You're testing clients against K8s deployment
- ❌ NOT for: Quick tests, active development (too slow)

---

## Switching Between Patterns

**Pattern 1 → Pattern 2**:
```bash
# Stop dev server (Ctrl+C)
npm run deploy-dev-up-all
```

**Pattern 2 → Pattern 3**:
```bash
# Stop Docker services
npm run deploy-dev-down-services

# Keep databases running (minikube uses them)
# Start Minikube
npm run minikube-create
```

**Pattern 3 → Pattern 1**:
```bash
# Cleanup Minikube
npm run minikube-cleanup

# Start dev server
npm run start-dev
```

---

## CI/CD (Phase 3 - Future)

**NOT a developer pattern** - managed by automated CI/CD pipelines

Cloud deployments will:
- Use Terraform for infrastructure provisioning
- Deploy to managed Kubernetes (EKS/GKE/AKS)
- Use managed databases (MongoDB Atlas, Redis Cloud)
- Apply manifests from `infrastructure/kubernetes/overlays/prod/`

See [INFRASTRUCTURE-ROADMAP.md](../INFRASTRUCTURE-ROADMAP.md) Phase 3 for details.

---

## Troubleshooting

### Pattern 1 Issues
- **Port conflicts**: Check if Pattern 2 services are still running
- **Database connection errors**: Start databases with `npm run deploy-dev-databases`

### Pattern 2 Issues
- **Port conflicts**: Stop Pattern 1 dev server or existing containers
- **Image build errors**: Run `npm run build` first
- **Database init errors**: See [TROUBLESHOOTING-RABBITMQ.md](TROUBLESHOOTING-RABBITMQ.md)

### Pattern 3 Issues
- **Minikube won't start**: Check Docker Desktop is running
- **Pods in CrashLoopBackOff**: Check databases are running on host
- **Image pull errors**: Did you run `npm run minikube-create` (not just `minikube-apply`)?
- **RabbitMQ routing errors**: See [TROUBLESHOOTING-RABBITMQ.md](TROUBLESHOOTING-RABBITMQ.md)

---

## Quick Reference

```bash
# Pattern 1: Hot reload development
npm run start-dev

# Pattern 2: Docker containers
npm run deploy-dev-up-all
npm run deploy-dev-down-all

# Pattern 3: Minikube K8s
npm run minikube-create
npm run minikube-cleanup
```
