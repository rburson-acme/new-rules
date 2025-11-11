# Configuration Validator

Automated validation tool to ensure deployment configurations match the config registry and are consistent across all deployment targets.

## Overview

The config validator reads [config-registry.yaml](../../config-registry.yaml) and validates that all generated deployment files match the source configuration:

- **Port consistency** - Verifies ports match across Docker Compose, Kubernetes, and agent configs
- **Path validation** - Checks Dockerfile paths and volume mounts are correct
- **Resource consistency** - Validates CPU/memory allocations match
- **Connection strings** - Verifies database URIs and service endpoints are correct
- **Missing values** - Detects missing or incomplete configurations

## Usage

### Validate All Configurations

```bash
# Run validation
npm run validate:config

# Exit codes:
# 0 - All validations passed
# 1 - Validation errors or warnings found
```

### Sample Output

#### Successful Validation

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

#### Failed Validation

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

## What Gets Validated

### Docker Compose Files

**Validates:**
- Service names match config registry
- Ports are correctly exposed
- Images match specified versions
- Volume mounts exist and are valid
- Environment variables are set
- Network configuration is correct
- Dependency chains are valid

**Example Check:**
```typescript
// Validates that:
// config-registry.yaml: services.engine.port = 8082
// Matches:
// docker-compose-services.yml: services.srvthreds-engine.ports = ["8082:8082"]
```

### Kubernetes Manifests

**Validates:**
- Deployment names match config registry
- Container ports match service definitions
- Service selectors match deployment labels
- ConfigMaps contain required environment variables
- Resource limits are defined (for production)
- Health check probes are configured
- Namespace is correct

**Example Check:**
```typescript
// Validates that:
// config-registry.yaml: services.engine.port = 8082
// Matches:
// srvthreds-engine-deployment.yaml: spec.containers[0].ports[0].containerPort = 8082
```

### Agent Configurations

**Validates:**
- Agent names match config registry
- Ports are available and match registry
- Message queue configuration is valid
- Database connection strings are correct
- Required fields are present
- JSON syntax is valid

**Example Check:**
```typescript
// Validates that:
// config-registry.yaml: databases.mongodb.uri
// Matches:
// session-agent.json: database.uri
```

### Environment Files

**Validates:**
- All required environment variables are defined
- Values match config registry defaults
- Connection strings are well-formed
- Ports don't conflict across services
- No sensitive data in committed files

**Example Check:**
```typescript
// Validates that:
// config-registry.yaml: services.engine.port = 8082
// Matches:
// .env.local: ENGINE_PORT=8082
```

## Validation Rules

### Port Validation

```yaml
# Config Registry
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

```yaml
# Config Registry
services:
  engine:
    dockerfile: infrastructure/local/docker/engine.Dockerfile
```

**Checks:**
- File exists at specified path ✅
- File is readable ✅
- Relative paths resolve correctly ✅

### Environment Variable Validation

```yaml
# Config Registry
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

## Workflow

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

Add to your CI pipeline:

```yaml
# .github/workflows/validate.yml
- name: Validate Infrastructure Configs
  run: |
    npm run generate:config
    npm run validate:config
```

### Pre-Commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run validate:config
if [ $? -ne 0 ]; then
  echo "❌ Configuration validation failed"
  exit 1
fi
```

## Error Reference

### Common Errors

**Port Mismatch**
```
Error: Port mismatch for srvthreds-engine
Expected: 8082
Actual: 8080
```
**Fix:** Update config-registry.yaml and regenerate

**Missing Service**
```
Error: Missing service definition for srvthreds-engine
```
**Fix:** Add service to config-registry.yaml

**Invalid Path**
```
Error: Dockerfile not found
Expected: infrastructure/local/docker/engine.Dockerfile
```
**Fix:** Verify file exists or update path in registry

**Environment Variable Missing**
```
Error: Missing environment variable MONGODB_URI
```
**Fix:** Add to environment configuration in registry

## Best Practices

1. **Run before every deployment** - Catch issues early
2. **Fix errors immediately** - Don't ignore validation failures
3. **Automate in CI/CD** - Prevent invalid configs from being deployed
4. **Version control validation** - Commit only validated configurations
5. **Document exceptions** - If overriding validation, document why
6. **Regular audits** - Periodically review validation rules
7. **Update registry first** - Always edit config-registry.yaml, not generated files

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

### Performance Issues with Large Configs

Validator caches parsed configs. Clear cache if needed:

```bash
rm -rf node_modules/.cache/config-validator
```

## Related Tools

- **[config-generator](../config-generator/README.md)** - Generate configurations from registry
- **[deployment-cli](../deployment-cli/README.md)** - Deploy validated configurations
- **[terraform-cli](../terraform-cli/README.md)** - Cloud infrastructure deployment

---

**Last Updated:** 2025-01-11
**Node Version:** >= 18.0.0
