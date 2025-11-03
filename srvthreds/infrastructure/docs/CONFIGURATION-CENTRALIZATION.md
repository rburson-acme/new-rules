# Configuration Centralization Proposal

## Problem Statement

Current configuration issues:
1. **Connection strings scattered** across 15+ files
2. **Duplicate settings** in multiple locations (Kubernetes ConfigMaps, Docker Compose, test setup, run profiles)
3. **Manual updates required** in multiple places when changing environments
4. **No single source of truth** for environment configuration
5. **Difficult to debug** - which config is actually being used?

## Current State Analysis

### Files with Connection String Configuration:

| Location | Purpose | Format |
|----------|---------|--------|
| `src/test/setup.ts` | Test environment defaults | TypeScript |
| `infrastructure/kubernetes/base/configmap.yaml` | Kubernetes base config | YAML |
| `infrastructure/kubernetes/overlays/minikube/configmap-minikube.yaml` | Minikube overrides | YAML |
| `infrastructure/local/compose/docker-compose-services.yml` | Local Docker services | YAML |
| `infrastructure/kubernetes/scripts/validate-minikube.sh` | Validation script | Bash |
| `run-profiles/*/run-config/*.json` | Profile-specific configs | JSON |

### Problems by Environment:

**Local Development:**
- Docker Compose sets env vars
- Test setup.ts has defaults
- Run profiles have separate configs
- No clear precedence order

**Minikube:**
- Base ConfigMap
- Overlay ConfigMap
- Validation script exports
- Bootstrap script needs its own
- Tests need separate config

**Tests:**
- setup.ts defaults
- .env file (if exists)
- Runtime environment variables
- Profile-specific configs

## Proposed Solution: Centralized Configuration

### 1. Create Single Configuration Source

```
infrastructure/config/
├── environments/
│   ├── base.env              # Base defaults for all environments
│   ├── local.env             # Local Docker development
│   ├── minikube.env          # Minikube-specific settings
│   ├── test.env              # Test-specific overrides
│   ├── dev.env               # Dev cluster
│   ├── staging.env           # Staging cluster
│   └── production.env        # Production cluster
├── config-loader.sh          # Shell script to load configs
└── config-generator.ts       # Generate configs from env files
```

### 2. Base Configuration Template

**`infrastructure/config/environments/base.env`:**
```bash
# Database Configuration
MONGO_HOST=localhost:27017
MONGO_DIRECT_CONNECTION=true
MONGO_DATABASE=srvthreds
MONGO_REPLICA_SET=rs0

# Redis Configuration
REDIS_HOST=localhost:6379
REDIS_PASSWORD=
REDIS_DB=0

# RabbitMQ Configuration
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
```

**`infrastructure/config/environments/local.env`:**
```bash
# Extends base.env
# Local development with host databases
MONGO_HOST=localhost:27017
REDIS_HOST=localhost:6379
RABBITMQ_HOST=localhost
NODE_ENV=development
```

**`infrastructure/config/environments/minikube.env`:**
```bash
# Extends base.env
# Minikube with host databases accessed via host.docker.internal
MONGO_HOST=host.docker.internal:27017
REDIS_HOST=host.docker.internal:6379
RABBITMQ_HOST=host.docker.internal
NODE_ENV=development
```

**`infrastructure/config/environments/test.env`:**
```bash
# Extends base.env
# Test environment (uses local or minikube depending on context)
MONGO_HOST=localhost:27017
REDIS_HOST=localhost:6379
RABBITMQ_HOST=localhost
NODE_ENV=test
LOG_LEVEL=warn
```

### 3. Configuration Loader Script

**`infrastructure/config/config-loader.sh`:**
```bash
#!/bin/bash
# Load environment-specific configuration
# Usage: source infrastructure/config/config-loader.sh [environment]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_NAME="${1:-local}"
BASE_ENV="$SCRIPT_DIR/environments/base.env"
ENV_FILE="$SCRIPT_DIR/environments/${ENV_NAME}.env"

# Load base configuration
if [ -f "$BASE_ENV" ]; then
  set -a
  source "$BASE_ENV"
  set +a
  echo "✓ Loaded base configuration"
else
  echo "❌ Base configuration not found: $BASE_ENV"
  exit 1
fi

# Load environment-specific overrides
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
  echo "✓ Loaded $ENV_NAME configuration"
else
  echo "⚠️  Environment file not found: $ENV_FILE"
  echo "   Using base configuration only"
fi

# Export all variables
export MONGO_HOST MONGO_DIRECT_CONNECTION MONGO_DATABASE MONGO_REPLICA_SET
export REDIS_HOST REDIS_PASSWORD REDIS_DB
export RABBITMQ_HOST RABBITMQ_PORT RABBITMQ_MGMT_PORT RABBITMQ_USER RABBITMQ_PASSWORD
export NODE_ENV LOG_LEVEL

echo ""
echo "Current Configuration:"
echo "  MONGO_HOST: $MONGO_HOST"
echo "  REDIS_HOST: $REDIS_HOST"
echo "  RABBITMQ_HOST: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "  NODE_ENV: $NODE_ENV"
```

### 4. Configuration Generator (for Kubernetes)

**`infrastructure/config/config-generator.ts`:**
```typescript
#!/usr/bin/env tsx
/**
 * Generate Kubernetes ConfigMaps and other configs from environment files
 * Usage: tsx infrastructure/config/config-generator.ts [environment]
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'dotenv';

const ENV_DIR = path.join(__dirname, 'environments');
const K8S_BASE_DIR = path.join(__dirname, '../kubernetes/base');

function loadEnvFile(envName: string): Record<string, string> {
  const basePath = path.join(ENV_DIR, 'base.env');
  const envPath = path.join(ENV_DIR, `${envName}.env`);

  // Load base first
  const baseConfig = parse(fs.readFileSync(basePath));

  // Load environment-specific overrides
  let envConfig = {};
  if (fs.existsSync(envPath)) {
    envConfig = parse(fs.readFileSync(envPath));
  }

  // Merge with env overrides taking precedence
  return { ...baseConfig, ...envConfig };
}

function generateK8sConfigMap(envName: string, config: Record<string, string>): string {
  return `# Generated from infrastructure/config/environments/${envName}.env
# DO NOT EDIT MANUALLY - Run: npm run config:generate
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds
data:
${Object.entries(config)
  .map(([key, value]) => `  ${key}: "${value}"`)
  .join('\n')}
`;
}

function generateDockerComposeEnv(config: Record<string, string>): string {
  return Object.entries(config)
    .map(([key, value]) => `      - ${key}=${value}`)
    .join('\n');
}

function main() {
  const envName = process.argv[2] || 'local';

  console.log(`Generating configuration for: ${envName}`);

  const config = loadEnvFile(envName);

  // Generate Kubernetes ConfigMap
  const configMapYaml = generateK8sConfigMap(envName, config);
  const outputPath = path.join(K8S_BASE_DIR, 'configmap.yaml');
  fs.writeFileSync(outputPath, configMapYaml);
  console.log(`✓ Generated: ${outputPath}`);

  // Generate .env file for tests
  const envContent = Object.entries(config)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const testEnvPath = path.join(__dirname, '../../.env.test');
  fs.writeFileSync(testEnvPath, envContent);
  console.log(`✓ Generated: ${testEnvPath}`);

  console.log('\nConfiguration Summary:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
}

main();
```

### 5. Updated Scripts

**Update `validate-minikube.sh`:**
```bash
#!/bin/bash

# Load configuration
source infrastructure/config/config-loader.sh minikube

# Rest of validation script...
# No need to export variables - already done by config-loader.sh
```

**Update `package.json` scripts:**
```json
{
  "scripts": {
    "config:generate": "tsx infrastructure/config/config-generator.ts",
    "config:generate:minikube": "tsx infrastructure/config/config-generator.ts minikube",
    "config:generate:local": "tsx infrastructure/config/config-generator.ts local",
    "config:show": "source infrastructure/config/config-loader.sh && env | grep -E 'MONGO|REDIS|RABBITMQ|NODE_ENV'",
    "test": "dotenv -e .env.test -- vitest run",
    "bootstrap": "source infrastructure/config/config-loader.sh && npm run bootstrap:internal"
  }
}
```

### 6. Simplify Test Setup

**Update `src/test/setup.ts`:**
```typescript
/**
 * Vitest Test Setup
 * Configuration is loaded from .env.test (generated by config-generator.ts)
 */
import 'dotenv/config';
import { Logger, LoggerLevel } from '../ts/thredlib/index.js';

Logger.setLevel(LoggerLevel.INFO);

// Validation only - no defaults
if (!process.env.MONGO_HOST) {
  throw new Error('MONGO_HOST not set. Run: npm run config:generate');
}

if (!process.env.REDIS_HOST) {
  throw new Error('REDIS_HOST not set. Run: npm run config:generate');
}

if (!process.env.RABBITMQ_HOST) {
  throw new Error('RABBITMQ_HOST not set. Run: npm run config:generate');
}

Logger.debug('Test environment configured from .env.test');
```

## Implementation Plan

### Phase 1: Create Base Structure (Week 1)
1. Create `infrastructure/config/` directory structure
2. Create base.env with all default values
3. Create environment-specific .env files (local, minikube, test)
4. Create config-loader.sh script
5. Test loading configs manually

### Phase 2: Generate Configs (Week 1)
1. Create config-generator.ts
2. Generate Kubernetes ConfigMaps from env files
3. Generate .env.test from env files
4. Add npm scripts for config generation
5. Test generated configs

### Phase 3: Update Scripts (Week 2)
1. Update validate-minikube.sh to use config-loader.sh
2. Update setup-minikube.sh to use config-loader.sh
3. Update all infrastructure scripts
4. Update test setup.ts
5. Test all scripts with new config

### Phase 4: Cleanup (Week 2)
1. Remove duplicate config files
2. Update documentation
3. Add validation to ensure configs are generated
4. Create migration guide

## Benefits

### 1. Single Source of Truth
- One place to update connection strings
- Clear environment inheritance (base → environment-specific)
- No confusion about which config is active

### 2. Reduced Duplication
- Base config shared across all environments
- Environment-specific overrides only
- Generated configs always in sync

### 3. Easier Debugging
- `npm run config:show` shows active config
- Clear precedence order
- Generated files marked as "DO NOT EDIT"

### 4. Better Developer Experience
- Change one file, regenerate all configs
- Clear documentation in .env files
- Type-safe config loading (TypeScript generator)

### 5. Easier Environment Switching
```bash
# Switch to minikube
npm run config:generate:minikube
npm test

# Switch to local
npm run config:generate:local
npm test
```

## Migration Path

### Step 1: Create Config Structure (No Breaking Changes)
```bash
mkdir -p infrastructure/config/environments
# Create base.env and environment files
# Create config-loader.sh
# Create config-generator.ts
```

### Step 2: Generate Configs (Parallel to Existing)
```bash
npm run config:generate:local
npm run config:generate:minikube
# Compare generated configs with existing ones
# Fix any discrepancies in .env files
```

### Step 3: Update Scripts (One at a Time)
```bash
# Update validate-minikube.sh first
# Test thoroughly
# Update other scripts one by one
```

### Step 4: Remove Old Configs
```bash
# Once all scripts updated and tested
# Remove duplicate configs
# Update documentation
```

## Configuration Precedence

Clear order of precedence (highest to lowest):
1. **Runtime environment variables** (manual exports)
2. **Environment-specific .env file** (minikube.env, local.env)
3. **Base .env file** (base.env)

## Example Usage

### Developer Workflow:

```bash
# Setup for local development
npm run config:generate:local
npm run bootstrap
npm test

# Setup for minikube
npm run config:generate:minikube
npm run minikube-create
npm run minikube-validate

# See current config
npm run config:show

# Change database host (edit infrastructure/config/environments/minikube.env)
# MONGO_HOST=192.168.1.100:27017

# Regenerate all configs
npm run config:generate:minikube
```

### CI/CD Pipeline:

```bash
# Generate test config
npm run config:generate:test

# Run tests
npm test

# Generate production config
npm run config:generate:production

# Deploy
npm run deploy:production
```

## Files to Create

```
infrastructure/config/
├── environments/
│   ├── base.env
│   ├── local.env
│   ├── minikube.env
│   ├── test.env
│   ├── dev.env
│   ├── staging.env
│   └── production.env
├── config-loader.sh
├── config-generator.ts
└── README.md
```

## Files to Update

- `infrastructure/kubernetes/scripts/validate-minikube.sh`
- `infrastructure/kubernetes/scripts/setup-minikube.sh`
- `src/test/setup.ts`
- `package.json`
- All run-profile configs (reference central config)

## Files to Remove (After Migration)

- Duplicate ConfigMaps
- Hardcoded connection strings in scripts
- Scattered .env defaults in code

## Validation

Add config validation script:

```bash
#!/bin/bash
# infrastructure/config/validate-config.sh

# Check all required variables are set
REQUIRED_VARS="MONGO_HOST REDIS_HOST RABBITMQ_HOST NODE_ENV"

for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    echo "❌ Required variable not set: $var"
    exit 1
  fi
done

echo "✓ All required configuration variables are set"
```

## Summary

This centralized approach:
- ✅ **Reduces configuration locations** from 15+ files to 1 base + N environment files
- ✅ **Eliminates duplication** through inheritance and generation
- ✅ **Simplifies debugging** with clear precedence and validation
- ✅ **Improves developer experience** with simple commands
- ✅ **Enables environment switching** with a single command
- ✅ **Maintains flexibility** for environment-specific overrides
- ✅ **Provides type safety** through TypeScript generator
- ✅ **Reduces errors** by generating configs instead of manual edits

Next steps: Would you like me to implement Phase 1 (create base structure)?
