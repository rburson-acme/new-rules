# Configuration Utilities

Shared configuration tools for generating and validating deployment configurations from the centralized config registry.

## Overview

This directory contains two essential infrastructure utilities:

- **[generator.ts](#configuration-generator)** - Generates deployment configurations from config-registry.yaml
- **[validator.ts](#configuration-validator)** - Validates generated configurations for consistency

These tools ensure **single source of truth** for all infrastructure configuration and prevent drift between deployment targets (Docker Compose, Kubernetes, environment files, agent configs).

## Quick Start

```bash
# Generate all configurations
npm run generate:config

# Validate generated configurations
npm run validate:config

# Typical workflow
npm run generate:config && npm run validate:config
```

---

# Configuration Generator

Automated tool for generating deployment configurations from a centralized configuration registry.

## What Gets Generated

The generator reads [config-registry.yaml](../../../config-registry.yaml) and generates:

1. **Docker Compose Files** → `infrastructure/local/docker/compose/`
   - `docker-compose-db.yml` - Database services (MongoDB, Redis, RabbitMQ)
   - `docker-compose-services.yml` - Application services (engine, agents)

2. **Kubernetes Manifests** → `infrastructure/local/minikube/manifests/base/`
   - `{service}-deployment.yaml` - Deployment resources
   - `{service}-service.yaml` - Service resources
   - `{service}-configmap.yaml` - ConfigMaps

3. **Environment Files** → `infrastructure/local/configs/env/`
   - `.env.local` - Local development
   - `.env.docker` - Docker Compose
   - `.env.minikube` - Minikube

4. **Agent Configurations** → `infrastructure/local/configs/agents/`
   - `session-agent.json`
   - `persistence-agent.json`

## Usage

### Generate All Configurations

```bash
npm run generate:config
```

### Generate Specific Targets

```bash
npm run generate:config:docker      # Docker Compose only
npm run generate:config:k8s         # Kubernetes only
npm run generate:config:env         # Environment files only
npm run generate:config:agents      # Agent configs only
```

## Configuration Registry Structure

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

## Workflow: Making Configuration Changes

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
git add infrastructure/config-registry.yaml infrastructure/local/
git commit -m "Update service configuration"
```

## Auto-Generated File Headers

All generated files include a warning header:

```yaml
# ⚠️  AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
# Generated from: infrastructure/config-registry.yaml
# To update: Edit config-registry.yaml and run: npm run generate:config
# Generated at: 2025-01-11T10:30:00Z
```

---

# Configuration Validator

Automated validation tool to ensure deployment configurations match the config registry and are consistent across all deployment targets.

## What Gets Validated

The validator checks:

- **Port consistency** - Ports match across Docker Compose, Kubernetes, and agent configs
- **Path validation** - Dockerfile paths and volume mounts are correct
- **Resource consistency** - CPU/memory allocations match
- **Connection strings** - Database URIs and service endpoints are correct
- **Missing values** - Detects missing or incomplete configurations

## Usage

```bash
# Run validation
npm run validate:config

# Exit codes:
# 0 - All validations passed
# 1 - Validation errors or warnings found
```

## Validation Output

### ✅ Successful Validation

```
🔍 Validating configurations against config-registry.yaml...

📦 Validating Docker Compose files...
☸️  Validating Kubernetes manifests...
🤖 Validating agent configuration files...
📝 Validating .env files...

📊 Validation Results:

✅ All validations passed!

  Files validated: 24
  Checks performed: 156
  Duration: 1.2s
```

### ❌ Failed Validation

```
🔍 Validating configurations against config-registry.yaml...

📦 Validating Docker Compose files...
☸️  Validating Kubernetes manifests...
🤖 Validating agent configuration files...
📝 Validating .env files...

📊 Validation Results:

❌ Errors (2):

  infrastructure/local/docker/compose/docker-compose-services.yml
    Port mismatch for srvthreds-engine
    Expected: 8082
    Actual:   8080

  infrastructure/local/minikube/manifests/base/srvthreds-engine-deployment.yaml
    Missing environment variable
    Expected: MONGODB_URI
    Actual:   <not set>

⚠️  Warnings (1):

  infrastructure/local/configs/agents/session-agent.json
    Using default value for messageQueue.vhost
    Expected: configurable
    Actual:   /

💡 Run `npm run generate:config` to regenerate configurations from config-registry.yaml
```

## Validation Rules

### Port Validation

Validates that ports match across all deployment targets:

```yaml
# config-registry.yaml
services:
  engine:
    port: 8082
```

**Docker Compose:**
```yaml
services:
  srvthreds-engine:
    ports:
      - "8082:8082"  # ✅ Valid
      - "8080:8082"  # ❌ External port mismatch
```

**Kubernetes:**
```yaml
spec:
  containers:
  - ports:
    - containerPort: 8082  # ✅ Valid
    - containerPort: 8080  # ❌ Port mismatch
```

### Path Validation

Validates that referenced files exist:

```yaml
# config-registry.yaml
services:
  engine:
    dockerfile: infrastructure/local/docker/engine.Dockerfile
```

**Checks:**
- File exists at specified path ✅
- File is readable ✅
- Relative paths resolve correctly ✅

### Environment Variable Validation

Validates environment variables match registry:

```yaml
# config-registry.yaml
databases:
  mongodb:
    credentials:
      username: admin
```

**Environment File (.env.local):**
```bash
MONGODB_USERNAME=admin  # ✅ Valid
MONGODB_USERNAME=root   # ❌ Value mismatch
```

## Integration

### Pre-Deployment Validation

```bash
# 1. Edit config registry
vim infrastructure/config-registry.yaml

# 2. Regenerate configs
npm run generate:config

# 3. Validate before deploying
npm run validate:config

# 4. If validation passes, deploy
npm run deploy-local-up-all
```

### CI/CD Integration

```yaml
# .github/workflows/validate.yml
- name: Validate Infrastructure Configs
  run: |
    npm run generate:config
    npm run validate:config
```

### Pre-Commit Hook

```bash
#!/bin/bash
npm run validate:config
if [ $? -ne 0 ]; then
  echo "❌ Configuration validation failed"
  exit 1
fi
```

## Best Practices

1. **Never edit generated files** - Always edit `config-registry.yaml`
2. **Regenerate after changes** - Run generator after registry updates
3. **Validate after generation** - Use validator to catch issues early
4. **Version control** - Commit both registry and generated files
5. **Run before deployment** - Catch configuration errors before they cause failures
6. **Automate in CI/CD** - Prevent invalid configs from being deployed
7. **Document changes** - Add comments in config-registry.yaml

## Common Errors

### Port Mismatch
```
Error: Port mismatch for srvthreds-engine
Expected: 8082
Actual: 8080
```
**Fix:** Update config-registry.yaml and regenerate

### Missing Service
```
Error: Missing service definition for srvthreds-engine
```
**Fix:** Add service to config-registry.yaml

### Invalid Path
```
Error: Dockerfile not found
Expected: infrastructure/local/docker/engine.Dockerfile
```
**Fix:** Verify file exists or update path in registry

### Environment Variable Missing
```
Error: Missing environment variable MONGODB_URI
```
**Fix:** Add to environment configuration in registry

## Troubleshooting

### Validator Reports False Positives

Check config-registry.yaml for typos:

```bash
# Validate YAML syntax
npm install -g js-yaml
js-yaml infrastructure/config-registry.yaml
```

### Validation Passes But Deployment Fails

Validator checks configuration consistency, not runtime behavior. Additional checks:

```bash
# Docker Compose syntax
docker-compose config

# Kubernetes dry-run
kubectl apply --dry-run=client -f manifests/
```

### Generated Files Are Missing

Check that config-registry.yaml exists and is valid YAML:

```bash
# Validate YAML syntax
npm install -g js-yaml
js-yaml infrastructure/config-registry.yaml
```

## Related Tools

- **[deployment-cli](../../deployment-cli/README.md)** - Deploy generated configurations
- **[terraform-cli](../../terraform-cli/README.md)** - Cloud infrastructure deployment

---

**Last Updated:** 2025-01-11
**Node Version:** >= 18.0.0
