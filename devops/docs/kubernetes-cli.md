# Kubernetes CLI Guide

The Kubernetes CLI (`k8s`) provides commands for deploying applications to both local Minikube clusters and Azure Kubernetes Service (AKS).

## Usage

```bash
npm run k8s -- <command> [options]

# Or directly:
tsx tools/kubernetes-cli/cli.ts <command> [options]
```

## Global Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--verbose` | `-v` | Enable verbose logging |
| `--help` | `-h` | Show help message |

---

## Minikube Commands

Commands for local development using Minikube.

**Important:** There are two distinct commands for different purposes:

| Command | Purpose | Uses |
|---------|---------|------|
| `minikube deploy` | Full Kubernetes deployment workflow | K8s manifests from `minikube.manifestPath` |
| `minikube run` | Execute Docker Compose deployments | Deployment configs from `deployments/*.json` |

---

### minikube deploy

**Full Kubernetes deployment workflow.** Deploys to Minikube's K8s cluster using manifests.

```bash
npm run k8s -- minikube deploy -p <project> -d <deployment> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--deployment`, `-d` | Deployment shortName for building images (required) | - |
| `--dry-run` | Preview changes without applying | `false` |
| `--skip-db` | Skip database setup | `false` |

**Example:**

```bash
# Full deployment with build config
npm run k8s -- minikube deploy -p srvthreds -d build_server

# Dry run to preview
npm run k8s -- minikube deploy -p srvthreds -d build_server --dry-run

# Skip database setup (assumes DBs are running)
npm run k8s -- minikube deploy -p srvthreds -d build_server --skip-db
```

**What it does:**
1. Verifies Docker is running
2. Starts Minikube cluster if not running
3. Sets kubectl context to minikube
4. Creates namespace if needed
5. Builds Docker images using the specified deployment config
6. Applies Kubernetes manifests from `minikube.manifestPath`
7. Waits for pods to be ready
8. Runs health checks

---

### minikube run

**Execute Docker Compose deployments.** Runs deployment configurations defined in `deployments/*.json` files.

Use this for:
- Starting/stopping databases on the host
- Building Docker images
- Running multi-step orchestrated deployments
- Any Docker Compose-based workflow

```bash
npm run k8s -- minikube run <deployment> -p <project> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `deployment` | Deployment shortName from `deployments/*.json` |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--dry-run` | Preview changes without applying | `false` |
| `--use-minikube-docker` | Use Minikube's Docker environment | `false` |

**Example:**

```bash
# Start databases on host Docker
npm run k8s -- minikube run s_a_dbs -p srvthreds

# Start all (databases + services) with orchestrated setup
npm run k8s -- minikube run s_a_dbs_s -p srvthreds

# Build services using Minikube Docker (for K8s deployment)
npm run k8s -- minikube run build_server -p srvthreds --use-minikube-docker

# Stop databases
npm run k8s -- minikube run d_a_dbs -p srvthreds
```

**What it does for each compose file in a deployment:**
1. Runs `preBuildCommands` (with environment overrides if minikube)
2. Executes `docker compose -f <file> <deployCommand> <args>`
3. Runs `postUpCommands` (with environment overrides if minikube)
4. Moves to next compose file (if multi-file deployment)

---

### minikube reset

Reset the deployment while keeping the Minikube cluster running.

```bash
npm run k8s -- minikube reset -p <project>
```

**Example:**

```bash
npm run minikube:srvthreds:reset
```

**What it does:**
1. Deletes the project namespace (removes all K8s resources)
2. Keeps Minikube cluster running
3. Faster than full cleanup for quick redeployment

---

### minikube cleanup

Full cleanup - deletes the Minikube cluster.

```bash
npm run k8s -- minikube cleanup -p <project> [options]
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--delete-dbs` | Also delete host databases | `false` |
| `--db-stop-deployment` | Deployment shortName for stopping DBs | - |

**Example:**

```bash
# Cleanup cluster only (keep host databases)
npm run minikube:srvthreds:cleanup

# Cleanup everything including databases
npm run k8s -- minikube cleanup -p srvthreds --delete-dbs --db-stop-deployment d_a_dbs
```

**What it does:**
1. Deletes the Kubernetes namespace
2. Stops and deletes the Minikube cluster
3. Optionally stops host databases

---

### minikube status

Show the status of a Minikube deployment.

```bash
npm run k8s -- minikube status -p <project>
```

**Example:**

```bash
npm run minikube:srvthreds:status
```

**Shows:**
- Minikube cluster status
- Pods in the project namespace
- Services
- Deployments

---

## AKS Commands

Commands for deploying to Azure Kubernetes Service.

### aks deploy

Deploy a project to an AKS environment.

```bash
npm run k8s -- aks deploy <env> -p <project> -d <deployment> [options]
```

**Arguments:**

| Argument | Description |
|----------|-------------|
| `env` | Environment: `dev`, `test`, or `prod` |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--project`, `-p` | Project name (required) | - |
| `--deployment`, `-d` | Deployment shortName for building images (required) | - |
| `--dry-run` | Preview changes without applying | `false` |
| `--tag` | Docker image tag | `latest` |

**Example:**

```bash
# Deploy to dev with build config
npm run k8s -- aks deploy dev -p srvthreds -d build_server

# Deploy specific tag to prod
npm run k8s -- aks deploy prod -p srvthreds -d build_server --tag v1.2.3
```

**What it does:**
1. Verifies Azure CLI authentication
2. Gets AKS cluster credentials
3. Sets kubectl context
4. Builds and pushes images to ACR
5. Applies Kubernetes manifests
6. Waits for pods to be ready
7. Runs health checks

---

### aks status

Show the status of an AKS deployment.

```bash
npm run k8s -- aks status <env> -p <project>
```

**Example:**

```bash
npm run aks:srvthreds:status -- dev
```

**Shows:**
- Pods in the project namespace
- Services
- Deployments

---

### aks restart

Rollout restart all deployments in an AKS environment.

```bash
npm run k8s -- aks restart <env> -p <project>
```

**Example:**

```bash
npm run k8s -- aks restart dev -p srvthreds
```

**What it does:**
1. Gets AKS cluster credentials
2. Performs rollout restart on each deployment
3. Pods are recreated with latest configuration

---

## Config Commands

Commands for viewing project configuration.

### config list

List all available projects.

```bash
npm run k8s -- config list
```

### config show

Show detailed configuration for a project.

```bash
npm run k8s -- config show <project>
```

---

## Understanding the Two Deployment Approaches

This CLI supports two distinct deployment mechanisms:

### Docker Compose Deployments (`minikube run`)

Use `minikube run` when you want to:
- Run Docker containers directly on host or Minikube's Docker daemon
- Start/stop databases (MongoDB, Redis, etc.)
- Execute multi-step orchestrated setups (databases → services)
- Build images without deploying to Kubernetes

**Configuration:** `deployments/*.json` files define these deployments with:
- Single or multiple compose files
- Pre/post commands per compose file
- Environment-specific overrides

**Example use cases:**
```bash
# Start databases on host Docker
npm run k8s -- minikube run s_a_dbs -p srvthreds

# Start everything (DBs + services) in one command
npm run k8s -- minikube run s_a_dbs_s -p srvthreds

# Build images in Minikube's Docker
npm run k8s -- minikube run build_server -p srvthreds --use-minikube-docker
```

### Kubernetes Deployments (`minikube deploy`, `aks deploy`)

Use `deploy` commands when you want to:
- Deploy to a Kubernetes cluster (Minikube or AKS)
- Apply Kubernetes manifests (Deployments, Services, ConfigMaps, etc.)
- Build images and deploy in one workflow
- Leverage K8s features (rolling updates, health checks, scaling)

**Configuration:**
- K8s manifests from `minikube.manifestPath` or `aks.manifestPath`
- Build config from `deployments/*.json` (via `--deployment` flag)

**Example use cases:**
```bash
# Full K8s deployment to Minikube
npm run k8s -- minikube deploy -p srvthreds -d build_server

# Deploy to AKS dev environment
npm run k8s -- aks deploy dev -p srvthreds -d build_server
```

### When to Use Which

| Scenario | Command |
|----------|---------|
| Start local databases | `minikube run s_a_dbs -p <project>` |
| Quick local development with Docker Compose | `minikube run s_a_dbs_s -p <project>` |
| Deploy to Minikube K8s cluster | `minikube deploy -p <project> -d <deployment>` |
| Deploy to Azure AKS | `aks deploy <env> -p <project> -d <deployment>` |
| Build images only | `minikube run build_server -p <project> --use-minikube-docker` |

---

## Deployment Workflow

### Local Development (Minikube)

```bash
# 1. Start databases on host
npm run k8s -- minikube run s_a_dbs -p srvthreds

# 2. Deploy to Minikube (with build config)
npm run k8s -- minikube deploy -p srvthreds -d build_server

# 3. Check status
npm run minikube:srvthreds:status

# 4. View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# 5. Port forward to access locally
kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds

# 6. Access at http://localhost:3000

# 7. Cleanup when done
npm run minikube:srvthreds:cleanup
```

### Cloud Deployment (AKS)

```bash
# 1. Ensure Azure login
az login
az account set --subscription <subscription-id>

# 2. Deploy to dev (with build config)
npm run k8s -- aks deploy dev -p srvthreds -d build_server

# 3. Check status
npm run aks:srvthreds:status -- dev

# 4. View logs
kubectl logs -f deployment/srvthreds-engine -n srvthreds

# 5. Promote to test
npm run k8s -- aks deploy test -p srvthreds -d build_server

# 6. Promote to prod with specific tag
npm run k8s -- aks deploy prod -p srvthreds -d build_server --tag v1.0.0
```

---

## Troubleshooting

### Minikube Issues

**Minikube won't start:**
```bash
# Check Docker is running
docker info

# Delete and recreate cluster
minikube delete
npm run k8s -- minikube deploy -p srvthreds -d build_server
```

**Images not found:**
```bash
# Ensure using Minikube's Docker
eval $(minikube docker-env)
docker images
```

**Pods stuck in Pending:**
```bash
kubectl describe pod <pod-name> -n srvthreds
# Check events for resource constraints
```

### AKS Issues

**Authentication failed:**
```bash
# Re-authenticate
az login
az aks get-credentials --resource-group <rg> --name <cluster>
```

**Image pull errors:**
```bash
# Check ACR authentication
az acr login --name <acr-name>

# Verify image exists
az acr repository show-tags --name <acr-name> --repository <image>
```

**Pods not ready:**
```bash
# Check pod events
kubectl describe pods -n srvthreds

# Check logs
kubectl logs <pod-name> -n srvthreds --previous
```

---

## Azure Naming Convention

The CLI generates Azure resource names using this pattern:

```
{prefix}-{appCode}-{envCode}-{regionCode}-{resourceType}
```

| Component | Source | Example |
|-----------|--------|---------|
| `prefix` | `azure.prefix` in project.yaml | `CAZ` |
| `appCode` | `azure.appCode` in project.yaml | `SRVTHREDS` |
| `envCode` | Environment mapping | `D` (dev), `T` (test), `P` (prod) |
| `regionCode` | `azure.regionCode` in project.yaml | `E` |
| `resourceType` | Resource being created | `RG`, `AKS`, `ACR` |

**Examples:**
- Resource Group: `CAZ-SRVTHREDS-D-E-RG`
- AKS Cluster: `CAZ-SRVTHREDS-D-E-AKS`
- Container Registry: `cazsrvthredsdeacr`
