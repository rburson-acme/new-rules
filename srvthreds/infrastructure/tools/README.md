# Infrastructure Tools

This directory contains tooling for managing SrvThreds infrastructure configurations.

## Tools

### 1. Configuration Utilities ([shared/config/](shared/config/))

Shared infrastructure utilities for generating and validating deployment configurations from the centralized [config-registry.yaml](../config-registry.yaml).

**Contains:**
- **Config Generator** ([generator.ts](shared/config/generator.ts)) - Generates deployment configurations
- **Config Validator** ([validator.ts](shared/config/validator.ts)) - Validates configuration consistency

**Usage:**
```bash
# Generate all configurations
npm run generate:config

# Generate specific targets
npm run generate:config:docker      # Docker Compose files
npm run generate:config:k8s          # Kubernetes manifests
npm run generate:config:env          # Environment files
npm run generate:config:agents       # Agent configuration files

# Validate configurations
npm run validate:config
```

**Generates:**
- Docker Compose files (databases and services)
- Kubernetes manifests (deployments, services, ConfigMaps)
- Environment files (.env.local, .env.docker, etc.)
- Agent configuration JSON files

**Validates:**
- Port consistency across Docker Compose, Kubernetes, and agent configs
- Path consistency across Dockerfiles and manifests
- Resource allocation consistency
- Connection string correctness
- Missing or mismatched configurations

See [shared/config/README.md](shared/config/README.md) for detailed documentation.

### 2. Deployment CLI ([deployment-cli/](deployment-cli/))

Interactive CLI for deploying and managing infrastructure across different environments.

**Usage:**
```bash
# Interactive menu
npm run deploymentCli

# Direct commands
npm run deploy-local-up-all          # Start all local services
npm run deploy-local-databases       # Start databases only
npm run minikube-apply               # Deploy to Minikube
```

See [deployment-cli/README.md](deployment-cli/README.md) for detailed documentation.

## Workflow

### Making Configuration Changes

1. **Never manually edit generated files**
   - All files in `local/docker/compose/`
   - All files in `local/minikube/manifests/`
   - All files in `local/configs/agents/`
   - All `.env.*` files

2. **Always edit the registry first:**
   ```bash
   vim infrastructure/config-registry.yaml
   ```

3. **Generate configurations:**
   ```bash
   npm run generate:config
   ```

4. **Validate:**
   ```bash
   npm run validate:config
   ```

5. **Test locally:**
   ```bash
   npm run deploy-local-up-all
   ```

6. **Commit:**
   ```bash
   git add infrastructure/
   git commit -m "config: Update session-agent resources"
   ```

## Architecture

```
┌─────────────────────────────────┐
│   config-registry.yaml          │  Single Source of Truth
│   (ports, paths, resources)     │  ← EDIT THIS
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   shared/config/generator.ts    │  Generator Script
│   (reads registry, writes files)│  ← npm run generate:config
└────────────┬────────────────────┘
             │
             ├──────────────┬──────────────┬─────────────┐
             ▼              ▼              ▼             ▼
    ┌──────────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐
    │ Docker       │ │ Kubernetes │ │ .env     │ │ Agent       │
    │ Compose      │ │ Manifests  │ │ Files    │ │ Configs     │
    └──────────────┘ └────────────┘ └──────────┘ └─────────────┘
             │              │              │             │
             └──────────────┴──────────────┴─────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  shared/config/validator.ts  │  Validator
                    │  (checks consistency)        │  ← npm run validate:config
                    └──────────────────────────────┘
```

## CI/CD Integration

### Recommended GitHub Actions

Add to `.github/workflows/validate-infrastructure.yml`:

```yaml
name: Validate Infrastructure

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install

      # Ensure generated files match registry
      - name: Regenerate configurations
        run: npm run generate:config

      # Check for manual edits
      - name: Verify no manual edits
        run: |
          if ! git diff --exit-code infrastructure/local/; then
            echo "ERROR: Generated files don't match config-registry.yaml"
            echo "Run 'npm run generate:config' locally and commit the changes"
            exit 1
          fi

      # Validate consistency
      - name: Validate configurations
        run: npm run validate:config
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate configuration consistency before committing
npm run validate:config || {
  echo ""
  echo "Configuration validation failed!"
  echo "Run 'npm run generate:config' to regenerate from config-registry.yaml"
  exit 1
}
```

## Troubleshooting

### Configuration out of sync

**Problem**: Validation fails with mismatches

**Solution**:
```bash
npm run generate:config
npm run validate:config
```

### Port already in use

**Problem**: Service fails to start

**Solution**:
1. Update port in `config-registry.yaml`
2. Regenerate: `npm run generate:config`
3. Restart services

### Generator fails

**Problem**: Generation script errors

**Solution**:
1. Check YAML syntax: `npm run generate:config`
2. Verify required fields exist in registry
3. Check file permissions in output directories

### Validator shows false positives

**Problem**: Validator reports errors for correct configurations

**Solution**:
1. Ensure you've regenerated: `npm run generate:config`
2. Check for manual edits in generated files
3. Verify registry matches your intentions

## Development

### Adding a New Generator Target

1. Edit [shared/config/generator.ts](shared/config/generator.ts)
2. Add new generation method (e.g., `generateTerraform()`)
3. Call it in `generateAll()`
4. Add npm script in `package.json`

### Adding New Validations

1. Edit [shared/config/validator.ts](shared/config/validator.ts)
2. Add new validation method (e.g., `validateTerraform()`)
3. Call it in `validateAll()`
4. Add test cases

### Testing Changes

```bash
# Test generator
npm run generate:config

# Test validator
npm run validate:config

# Test deployment
npm run deploy-local-up-all
kubectl get pods -n srvthreds
```

## See Also

- [CONFIGURATION.md](../CONFIGURATION.md) - Detailed configuration guide
- [IMPLEMENTATION-SUMMARY.md](../IMPLEMENTATION-SUMMARY.md) - Implementation details
- [README.md](../README.md) - Infrastructure overview
- [config-registry.yaml](../config-registry.yaml) - Configuration source of truth
