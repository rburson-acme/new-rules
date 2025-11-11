# Configuration Generator

Automated tool for generating deployment configurations from a centralized configuration registry.

## Overview

The config generator reads the centralized [config-registry.yaml](../../config-registry.yaml) and generates all deployment files needed for:

- **Docker Compose** - Database and service definitions
- **Kubernetes** - Manifests for Minikube deployments
- **Environment Files** - .env files for different environments
- **Agent Configs** - Agent-specific JSON configuration files

This ensures **single source of truth** for all infrastructure configuration and prevents drift between deployment targets.

## Usage

### Generate All Configurations

```bash
# Generate all configuration types
npm run generate:config
```

### Generate Specific Targets

```bash
# Docker Compose files only
npm run generate:config:docker

# Kubernetes manifests only
npm run generate:config:k8s

# Environment files only
npm run generate:config:env

# Agent configurations only
npm run generate:config:agents
```

## What Gets Generated

### Docker Compose Files

**Location:** `infrastructure/local/docker/compose/`

- `docker-compose-db.yml` - Database services (MongoDB, Redis, RabbitMQ)
- `docker-compose-services.yml` - Application services (engine, agents)

**Example:**
```yaml
services:
  mongodb:
    image: mongo:6.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    networks:
      - srvthreds-network
```

### Kubernetes Manifests

**Location:** `infrastructure/local/minikube/manifests/base/`

- `{service-name}-deployment.yaml` - Kubernetes Deployment resources
- `{service-name}-service.yaml` - Kubernetes Service resources
- `{service-name}-configmap.yaml` - ConfigMaps for environment variables

**Example:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srvthreds-engine
  namespace: srvthreds
spec:
  replicas: 1
  selector:
    matchLabels:
      app: srvthreds-engine
  template:
    metadata:
      labels:
        app: srvthreds-engine
    spec:
      containers:
      - name: engine
        image: srvthreds/engine:latest
        ports:
        - containerPort: 8082
```

### Environment Files

**Location:** `infrastructure/local/configs/env/`

- `.env.local` - Local development environment
- `.env.docker` - Docker Compose environment
- `.env.minikube` - Minikube environment

**Example:**
```bash
# Database Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/srvthreds?authSource=admin
REDIS_HOST=localhost
REDIS_PORT=6379

# Service Ports
ENGINE_PORT=8082
SESSION_AGENT_PORT=8084
```

### Agent Configurations

**Location:** `infrastructure/local/configs/agents/`

- `session-agent.json` - Session agent configuration
- `persistence-agent.json` - Persistence agent configuration

**Example:**
```json
{
  "name": "session-agent",
  "port": 8084,
  "messageQueue": {
    "host": "localhost",
    "port": 5672,
    "vhost": "/"
  },
  "database": {
    "uri": "mongodb://admin:password@localhost:27017/srvthreds"
  }
}
```

## Configuration Registry

The config registry (`config-registry.yaml`) is the single source of truth:

```yaml
metadata:
  name: srvthreds
  namespace: srvthreds
  version: 1.0.0

services:
  engine:
    name: srvthreds-engine
    port: 8082
    image: srvthreds/engine
    buildContext: ../../../
    dockerfile: infrastructure/local/docker/engine.Dockerfile

databases:
  mongodb:
    name: mongodb
    port: 27017
    image: mongo:6.0
    credentials:
      username: admin
      password: password

networks:
  default:
    name: srvthreds-network
    driver: bridge
```

## How It Works

1. **Parse config-registry.yaml** - Load centralized configuration
2. **Read templates** - Load template files for each target type
3. **Generate configs** - Populate templates with config values
4. **Write files** - Output generated configs with auto-generated headers
5. **Validate** - Optionally run config validator to verify output

## Auto-Generated File Headers

All generated files include a header warning:

```yaml
# ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
# Generated from: infrastructure/config-registry.yaml
# To update: Edit config-registry.yaml and run: npm run generate:config
# Generated at: 2025-01-11T10:30:00Z
```

## Workflow

### Making Configuration Changes

```bash
# 1. Edit the config registry
vim infrastructure/config-registry.yaml

# 2. Regenerate all configs
npm run generate:config

# 3. Validate the generated configs
npm run validate:config

# 4. Test the changes locally
npm run deploy-local-up-all

# 5. Commit both registry and generated files
git add infrastructure/config-registry.yaml
git add infrastructure/local/
git commit -m "Update service configuration"
```

### Adding a New Service

```yaml
# Add to config-registry.yaml
services:
  new-service:
    name: srvthreds-new-service
    port: 9000
    image: srvthreds/new-service
    buildContext: ../../../
    dockerfile: infrastructure/local/docker/new-service.Dockerfile
    environment:
      LOG_LEVEL: info
```

```bash
# Regenerate configs
npm run generate:config

# Deploy
npm run deploy-local-up-all
```

## Templates

Generator uses template files located in the source code:

- **Docker Compose templates** - Embedded in `generateDockerCompose()`
- **Kubernetes templates** - Embedded in `generateKubernetes()`
- **Environment templates** - Embedded in `generateEnvFiles()`

Templates use placeholders like `{{service.name}}` and `{{service.port}}`.

## Best Practices

1. **Never edit generated files** - Always edit `config-registry.yaml`
2. **Regenerate after changes** - Run generator after registry updates
3. **Validate after generation** - Use config validator to catch issues
4. **Version control** - Commit both registry and generated files
5. **Document changes** - Add comments in config-registry.yaml
6. **Test locally first** - Verify changes work before cloud deployment
7. **Keep registry organized** - Group related services together

## Troubleshooting

### Generated Files Are Missing

Check that config-registry.yaml exists and is valid YAML:

```bash
# Validate YAML syntax
npm install -g js-yaml
js-yaml infrastructure/config-registry.yaml
```

### Port Conflicts After Generation

Check port assignments in config-registry.yaml:

```bash
# List all ports in use
grep -r "port:" infrastructure/config-registry.yaml
```

### Docker Compose Fails After Regeneration

Verify Docker Compose syntax:

```bash
# Validate compose file
docker-compose -f infrastructure/local/docker/compose/docker-compose-db.yml config
```

### Kubernetes Deployment Fails

Validate generated manifests:

```bash
# Dry run kubectl apply
kubectl apply --dry-run=client -f infrastructure/local/minikube/manifests/base/
```

## Related Tools

- **[config-validator](../config-validator/README.md)** - Validate generated configurations
- **[deployment-cli](../deployment-cli/README.md)** - Deploy generated configurations
- **[terraform-cli](../terraform-cli/README.md)** - Cloud infrastructure deployment

---

**Last Updated:** 2025-01-11
**Node Version:** >= 18.0.0
