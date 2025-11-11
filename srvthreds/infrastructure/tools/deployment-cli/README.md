# Deployment CLI

Interactive command-line tool for deploying and managing SrvThreds infrastructure across different environments.

## Overview

The deployment CLI provides a unified interface for managing deployments to:

- **Local Docker** - Docker Compose-based local development
- **Minikube** - Local Kubernetes cluster for testing
- **Azure** - Production cloud infrastructure (via Terraform CLI)

It reads deployment configurations from JSON files and executes them with appropriate tooling (docker-compose, kubectl, shell scripts).

## Usage

### Interactive Menu

```bash
# Run the interactive CLI
npm run deploymentCli

# You'll see a menu like:
? Select a deployment:
1. Deploy Local Services - Start all local services with Docker Compose
2. Deploy Databases - Start databases only
3. Deploy Minikube - Deploy to local Kubernetes
4. Stop All Services - Tear down all deployments
5. Cancel
```

### Direct Commands

```bash
# Start all local services
npm run deploy-local-up-all

# Start databases only
npm run deploy-local-databases

# Deploy to Minikube
npm run minikube-apply

# Stop all services
npm run deploy-local-down-all
```

## Deployment Configuration

Deployments are defined in `/infrastructure/shared/configs/deployments/*.json`:

```json
{
  "deployments": [
    {
      "name": "Deploy Local Services",
      "shortName": "local-up-all",
      "description": "Start all local services with Docker Compose",
      "environments": ["local"],
      "target": {
        "type": "docker-compose",
        "composing": "up",
        "deployCommand": "up -d",
        "composeFiles": [
          {
            "file": "../../local/docker/compose/docker-compose-db.yml"
          },
          {
            "file": "../../local/docker/compose/docker-compose-services.yml",
            "preBuildCommands": [
              {
                "description": "Build Docker images",
                "command": "docker-compose build"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Deployment Types

### 1. Docker Compose (`docker-compose`)

Executes Docker Compose commands with single or multiple compose files.

**Configuration:**
```json
{
  "type": "docker-compose",
  "composing": "up",
  "deployCommand": "up -d",
  "composeFile": "path/to/docker-compose.yml"
}
```

**Multiple compose files:**
```json
{
  "type": "docker-compose",
  "composing": "up",
  "deployCommand": "up -d",
  "composeFiles": [
    {"file": "docker-compose-db.yml"},
    {"file": "docker-compose-services.yml"}
  ]
}
```

### 2. Shell Script (`sh`)

Executes shell scripts or commands.

**Configuration:**
```json
{
  "type": "sh",
  "composing": "script",
  "deployCommand": "./scripts/deploy.sh"
}
```

### 3. Kubectl (`kubectl`)

Applies Kubernetes manifests.

**Configuration:**
```json
{
  "type": "kubectl",
  "composing": "apply",
  "deployCommand": "apply -f manifests/"
}
```

## Lifecycle Hooks

### Pre-Build Commands

Execute before the main deployment (e.g., build Docker images):

```json
{
  "preBuildCommands": [
    {
      "description": "Build Docker images",
      "command": "npm run build"
    }
  ]
}
```

### Post-Up Commands

Execute after successful deployment (e.g., database migrations):

```json
{
  "postUpCommands": [
    {
      "description": "Run database migrations",
      "command": "npm run migrate"
    }
  ]
}
```

## Environment Overrides

Override environment variables per deployment:

```json
{
  "environmentOverrides": {
    "production": {
      "NODE_ENV": "production",
      "LOG_LEVEL": "info"
    },
    "development": {
      "NODE_ENV": "development",
      "LOG_LEVEL": "debug"
    }
  }
}
```

## Common Workflows

### Local Development Setup

```bash
# 1. Start databases
npm run deploy-local-databases

# 2. Verify databases are running
docker-compose -f infrastructure/local/docker/compose/docker-compose-db.yml ps

# 3. Start application services
npm run deploy-local-up-all

# 4. View logs
docker-compose -f infrastructure/local/docker/compose/docker-compose-services.yml logs -f
```

### Minikube Development

```bash
# 1. Ensure Minikube is running
minikube status

# 2. Deploy to Minikube
npm run minikube-apply

# 3. Check pod status
kubectl get pods -n srvthreds

# 4. Port forward to access services
kubectl port-forward svc/srvthreds-engine 8080:8080 -n srvthreds
```

### Teardown

```bash
# Stop all local services
npm run deploy-local-down-all

# Delete Minikube deployments
kubectl delete namespace srvthreds
```

## Troubleshooting

### Deployment Fails with "Command not found"

Ensure required tools are installed:

```bash
# Docker and Docker Compose
docker --version
docker-compose --version

# Kubernetes (if using Minikube)
kubectl version --client
minikube version
```

### Port Already in Use

Check for conflicting services:

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Docker Build Fails

Clear Docker cache and rebuild:

```bash
# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune -a

# Rebuild without cache
docker-compose build --no-cache
```

### Minikube Not Accessible

Reset Minikube:

```bash
minikube stop
minikube delete
minikube start
```

## Best Practices

1. **Use JSON configs** - Define deployments in JSON rather than hardcoding commands
2. **Environment separation** - Use different configs for dev/test/prod
3. **Idempotent operations** - Ensure deployments can be run multiple times safely
4. **Health checks** - Add post-deployment health checks
5. **Cleanup scripts** - Provide teardown commands for all deployments
6. **Version control** - Keep deployment configs in git
7. **Documentation** - Add clear descriptions to deployment configurations

## Related Tools

- **[terraform-cli](../terraform-cli/README.md)** - Deploy cloud infrastructure
- **[config-generator](../config-generator/README.md)** - Generate deployment configurations
- **[config-validator](../config-validator/README.md)** - Validate configuration consistency

---

**Last Updated:** 2025-01-11
**Node Version:** >= 18.0.0
