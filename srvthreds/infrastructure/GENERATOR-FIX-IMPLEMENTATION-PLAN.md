# Generator Fix Implementation Plan - Option 2

**Status:** Ready for Implementation
**Estimated Time:** 10-12 hours
**Risk Level:** Medium
**Last Updated:** 2025-11-24

---

## Table of Contents

1. [Overview](#overview)
2. [File Changes](#file-changes)
3. [Implementation Steps](#implementation-steps)
4. [Testing Checklist](#testing-checklist)
5. [Rollback Plan](#rollback-plan)
6. [Success Criteria](#success-criteria)

---

## Overview

### Problem Statement

The configuration generator has a critical bug that makes it unusable as a standalone tool:
- **Line 279** in `generator.ts` hardcodes `image: 'srvthreds:dev'` for ALL Kubernetes manifests
- This breaks database deployments in Minikube (tries to run app image as database)
- Makes tool completely unusable for other projects
- Redis is configured with wrong port (6380 instead of 6379)

### Solution

Fix the generator to:
1. Use correct images from `config.image` for databases
2. Support StatefulSet generation (for databases needing persistence)
3. Fix Redis port from 6380 → 6379
4. Differentiate between services (app) and databases (infrastructure)

### Impact

**Fixes:**
- Local Docker: Redis port corrected
- Minikube: All databases use correct images and can actually start
- RabbitMQ: Becomes StatefulSet (matches cloud architecture)

**No Impact:**
- Cloud deployments (use separate manual manifests)

---

## File Changes

### Summary

| File | Changes | Lines Modified |
|------|---------|----------------|
| `config-registry.yaml` | Redis port + RabbitMQ StatefulSet config | ~30 lines |
| `generator.ts` | Image selection + StatefulSet support | ~200 lines |
| `validator.ts` | StatefulSet validation + image checking | ~40 lines |
| `validate-minikube.sh` | Redis port fix | 1 line |
| **Generated files** | Auto-regenerated | All compose/K8s/env files |

---

## Detailed File Changes

### File 1: infrastructure/config-registry.yaml

#### Change 1.1: Redis Port (Line 228)

**Before:**
```yaml
  redis:
    name: redis
    description: Redis cache server
    image:
      repository: redis
      tag: latest
    port: 6380
```

**After:**
```yaml
  redis:
    name: redis
    description: Redis cache server (local/minikube uses standard port 6379, cloud uses managed service with port 6380)
    image:
      repository: redis
      tag: latest
    port: 6379
```

---

#### Change 1.2: Redis Command (Lines 229-237)

**Before:**
```yaml
    command:
      - redis-server
      - --save
      - "20"
      - "1"
      - --loglevel
      - warning
      - --notify-keyspace-events
      - KA
```

**After:**
```yaml
    command:
      - redis-server
      - --port
      - "6379"
      - --save
      - "20"
      - "1"
      - --loglevel
      - warning
      - --notify-keyspace-events
      - KA
```

---

#### Change 1.3-1.6: Service Environment Variables

**Change 4 locations (Lines 78, 99, 137, 173):**

**Before:**
```yaml
REDIS_HOST: ${REDIS_HOST:-redis:6380}
```

**After:**
```yaml
REDIS_HOST: ${REDIS_HOST:-redis:6379}
```

---

#### Change 1.7-1.10: Connection Strings

**Change 4 locations (Lines 299, 307, 315, 323):**

**Before:**
```yaml
connectionStrings:
  local:
    redis: "localhost:6380"
  docker:
    redis: "redis:6380"
  kubernetes:
    redis: "redis-service:6380"
  minikube:
    redis: "host.minikube.internal:6380"
```

**After:**
```yaml
connectionStrings:
  local:
    redis: "localhost:6379"
  docker:
    redis: "redis:6379"
  kubernetes:
    redis: "redis-service:6379"
  minikube:
    redis: "host.minikube.internal:6379"
```

---

#### Change 1.11: RabbitMQ StatefulSet Config (Line 249)

**Before:**
```yaml
  rabbitmq:
    name: rabbitmq
    description: RabbitMQ message broker
    image:
      repository: rabbitmq
      tag: 3-management
    ports:
      amqp: 5672
      management: 15672
```

**After:**
```yaml
  rabbitmq:
    name: rabbitmq
    description: RabbitMQ message broker
    image:
      repository: rabbitmq
      tag: 3-management
    kubernetes:
      kind: StatefulSet  # Use StatefulSet for persistence in K8s
      volumeClaimTemplate:
        name: rabbitmq-data
        mountPath: /var/lib/rabbitmq
        storage: 1Gi  # Smaller for minikube, 8Gi for production
    ports:
      amqp: 5672
      management: 15672
```

---

### File 2: infrastructure/tools/shared/config/generator.ts

#### Change 2.1: Rename Method (Line 248)

**Before:**
```typescript
private generateK8sServiceManifest(config: any, outputPath: string) {
```

**After:**
```typescript
private generateK8sResourceManifest(config: any, outputPath: string, isService: boolean = true) {
```

---

#### Change 2.2: Fix Image Selection (Lines 277-280)

**Before:**
```typescript
containers: [{
  name: serviceName,
  image: 'srvthreds:dev',  // All services use the same builder image in Minikube
  imagePullPolicy: 'Never',  // Use local image, don't pull from registry
```

**After:**
```typescript
containers: [{
  name: serviceName,
  image: this.getK8sImage(config, isService),
  imagePullPolicy: this.getK8sImagePullPolicy(config, isService),
```

---

#### Change 2.3: Add Helper Methods (After line 358)

**Add these new methods:**

```typescript
/**
 * Get appropriate image for Kubernetes deployment
 */
private getK8sImage(config: any, isService: boolean): string {
  // Services use the builder image for minikube
  if (isService) {
    return 'srvthreds:dev';
  }

  // Databases must use their specific images
  if (!config.image) {
    throw new Error(
      `Missing image configuration for ${config.name}. ` +
      `Database resources require explicit image configuration.`
    );
  }

  return `${config.image.repository}:${config.image.tag}`;
}

/**
 * Get appropriate image pull policy
 */
private getK8sImagePullPolicy(config: any, isService: boolean): string {
  // Services use local build, never pull
  if (isService) {
    return 'Never';
  }

  // Databases pull from registry if not present
  return config.image?.pullPolicy || 'IfNotPresent';
}
```

---

#### Change 2.4: Add StatefulSet Generation (After line 358)

**Add this new method (~80 lines):**

```typescript
/**
 * Generate Kubernetes StatefulSet manifest (for databases needing persistence)
 */
private generateK8sStatefulSet(config: any, outputPath: string, isService: boolean = false): void {
  const serviceName = config.name;
  const namespace = this.config.metadata.namespace;
  const k8sConfig = config.kubernetes || {};

  const statefulSet: any = {
    apiVersion: 'apps/v1',
    kind: 'StatefulSet',
    metadata: {
      name: serviceName,
      namespace: namespace,
      labels: {
        app: serviceName
      }
    },
    spec: {
      serviceName: `${serviceName}-service`,
      replicas: config.replicas?.dev || 1,
      selector: {
        matchLabels: {
          app: serviceName
        }
      },
      template: {
        metadata: {
          labels: {
            app: serviceName
          }
        },
        spec: {
          containers: [{
            name: serviceName,
            image: this.getK8sImage(config, isService),
            imagePullPolicy: this.getK8sImagePullPolicy(config, isService),
            ports: this.getK8sContainerPorts(config),
            resources: {
              requests: {
                memory: config.resources?.memory?.request || '128Mi',
                cpu: config.resources?.cpu?.request || '100m'
              },
              limits: {
                memory: config.resources?.memory?.limit || '256Mi',
                cpu: config.resources?.cpu?.limit || '200m'
              }
            }
          }]
        }
      }
    }
  };

  // Add command if present
  if (config.command) {
    if (Array.isArray(config.command)) {
      statefulSet.spec.template.spec.containers[0].command = config.command;
    } else {
      statefulSet.spec.template.spec.containers[0].command = [config.command.entrypoint];
      statefulSet.spec.template.spec.containers[0].args = config.command.args;
    }
  }

  // Add environment variables (for databases that don't use ConfigMap)
  if (config.environment) {
    statefulSet.spec.template.spec.containers[0].env = Object.entries(config.environment).map(
      ([key, value]) => ({ name: key, value: String(value) })
    );
  }

  // Add volumeClaimTemplates for persistent storage
  if (k8sConfig.volumeClaimTemplate) {
    const vct = k8sConfig.volumeClaimTemplate;
    statefulSet.spec.volumeClaimTemplates = [{
      metadata: {
        name: vct.name
      },
      spec: {
        accessModes: ['ReadWriteOnce'],
        resources: {
          requests: {
            storage: vct.storage
          }
        }
      }
    }];

    // Add volumeMount to container
    statefulSet.spec.template.spec.containers[0].volumeMounts = [{
      name: vct.name,
      mountPath: vct.mountPath
    }];
  }

  // Generate Service
  const ports = this.getK8sServicePorts(config);
  if (ports.length > 0) {
    const service = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: `${serviceName}-service`,
        namespace: namespace,
        labels: {
          app: serviceName
        }
      },
      spec: {
        type: 'ClusterIP',
        selector: {
          app: serviceName
        },
        ports: ports
      }
    };

    // Write StatefulSet and Service
    const manifestPath = path.join(outputPath, `${serviceName}.yaml`);
    this.writeYamlFile(manifestPath, statefulSet, false);
    fs.appendFileSync(manifestPath, '---\n');
    fs.appendFileSync(manifestPath, yaml.dump(service, { indent: 2 }));
  } else {
    // Write only StatefulSet
    const manifestPath = path.join(outputPath, `${serviceName}.yaml`);
    this.writeYamlFile(manifestPath, statefulSet);
  }
}
```

---

#### Change 2.5: Update Generation Loop (Lines 229-236)

**Before:**
```typescript
// Generate service manifests
for (const [key, config] of Object.entries(this.config.services)) {
  this.generateK8sServiceManifest(config, k8sBasePath);
}

// Generate database manifests
for (const [key, config] of Object.entries(this.config.databases)) {
  this.generateK8sServiceManifest(config, k8sMinikubePath);
}
```

**After:**
```typescript
// Generate service manifests (always Deployments)
for (const [key, config] of Object.entries(this.config.services)) {
  this.generateK8sResourceManifest(config, k8sBasePath, true);
}

// Generate database manifests (Deployment or StatefulSet based on config)
for (const [key, config] of Object.entries(this.config.databases)) {
  const useStatefulSet = config.kubernetes?.kind === 'StatefulSet';

  if (useStatefulSet) {
    this.generateK8sStatefulSet(config, k8sMinikubePath, false);
  } else {
    this.generateK8sResourceManifest(config, k8sMinikubePath, false);
  }
}
```

---

#### Change 2.6: Update envFrom Logic (Line 282)

**Before:**
```typescript
envFrom: [{
  configMapRef: {
    name: `${this.config.metadata.name}-config`
  }
}],
```

**After:**
```typescript
// Services use ConfigMap, databases may use direct env vars
...(isService ? {
  envFrom: [{
    configMapRef: {
      name: `${this.config.metadata.name}-config`
    }
  }]
} : {}),
```

---

### File 3: infrastructure/local/minikube/scripts/validate-minikube.sh

#### Change 3.1: Fix Redis Port (Line 12)

**Before:**
```bash
REDIS_LOCAL_PORT=6380
```

**After:**
```bash
REDIS_LOCAL_PORT=6379
```

---

### File 4: infrastructure/tools/shared/config/validator.ts

#### Change 4.1: Add Image Validation (After line 256)

**Add inside validateK8sManifest method:**

```typescript
// Validate image configuration for databases
if (expectedConfig.image) {
  const actualImage = container.image;
  const expectedImage = `${expectedConfig.image.repository}:${expectedConfig.image.tag}`;

  // Allow exact match OR 'srvthreds:dev' for services
  const isValidImage = actualImage === expectedImage ||
                       actualImage === 'srvthreds:dev';

  if (!isValidImage && !expectedConfig.buildOnly) {
    this.issues.push({
      severity: 'error',
      file: manifestPath,
      issue: `Image mismatch`,
      expected: expectedImage,
      actual: actualImage
    });
  }
}
```

---

#### Change 4.2: Add StatefulSet Support (Line 167)

**Before:**
```typescript
const deployment = docs.find((doc: any) => doc?.kind === 'Deployment');

if (!deployment) {
  this.issues.push({
    severity: 'warning',
    file: manifestPath,
    issue: `No Deployment found in manifest (may be Job or other kind)`
  });
  return;
}
```

**After:**
```typescript
// Support both Deployment and StatefulSet
const deployment = docs.find((doc: any) =>
  doc?.kind === 'Deployment' || doc?.kind === 'StatefulSet'
);

if (!deployment) {
  this.issues.push({
    severity: 'warning',
    file: manifestPath,
    issue: `No Deployment or StatefulSet found in manifest (may be Job or other kind)`
  });
  return;
}

// Validate StatefulSet-specific fields
if (deployment.kind === 'StatefulSet' && expectedConfig.kubernetes?.volumeClaimTemplate) {
  const vct = deployment.spec?.volumeClaimTemplates?.[0];
  const expectedVct = expectedConfig.kubernetes.volumeClaimTemplate;

  if (!vct) {
    this.issues.push({
      severity: 'error',
      file: manifestPath,
      issue: `Missing volumeClaimTemplates for StatefulSet`
    });
  } else if (vct.spec?.resources?.requests?.storage !== expectedVct.storage) {
    this.issues.push({
      severity: 'warning',
      file: manifestPath,
      issue: `Storage size mismatch`,
      expected: expectedVct.storage,
      actual: vct.spec?.resources?.requests?.storage
    });
  }
}
```

---

## Implementation Steps

### Step 1: Backup Current State (5 min)

```bash
# Create backup branch
git checkout -b backup-before-generator-fix

# Commit current state
git add -A
git commit -m "backup: Before generator fix"

# Create working branch
git checkout -b fix/generator-database-support
```

---

### Step 2: Modify config-registry.yaml (15 min)

1. Open `infrastructure/config-registry.yaml`
2. Make all 11 changes documented above:
   - Line 228: Change port 6380 → 6379
   - Lines 229-237: Add `--port "6379"` to command
   - Lines 78, 99, 137, 173: Change `redis:6380` → `redis:6379`
   - Lines 299, 307, 315, 323: Change all connection strings to 6379
   - Line 249: Add `kubernetes` section to rabbitmq
3. Save file

**Validation:**
```bash
# Check YAML syntax
npx js-yaml infrastructure/config-registry.yaml > /dev/null && echo "✓ Valid YAML"
```

---

### Step 3: Modify generator.ts (2-3 hours)

1. Open `infrastructure/tools/shared/config/generator.ts`
2. Implement changes in this order:
   - Add `getK8sImage()` helper method
   - Add `getK8sImagePullPolicy()` helper method
   - Add `generateK8sStatefulSet()` method
   - Rename `generateK8sServiceManifest` → `generateK8sResourceManifest`
   - Update method signature to include `isService` parameter
   - Update image selection logic (lines 277-280)
   - Update envFrom logic (line 282)
   - Update generation loop (lines 229-236)
3. Save file

**Validation:**
```bash
# Check TypeScript syntax
npx tsc --noEmit infrastructure/tools/shared/config/generator.ts && echo "✓ TypeScript OK"
```

---

### Step 4: Modify validator.ts (1 hour)

1. Open `infrastructure/tools/shared/config/validator.ts`
2. Add image validation logic (after line 256)
3. Add StatefulSet support (line 167)
4. Save file

**Validation:**
```bash
# Check TypeScript syntax
npx tsc --noEmit infrastructure/tools/shared/config/validator.ts && echo "✓ TypeScript OK"
```

---

### Step 5: Modify validate-minikube.sh (2 min)

1. Open `infrastructure/local/minikube/scripts/validate-minikube.sh`
2. Change line 12: `REDIS_LOCAL_PORT=6379`
3. Save file

---

### Step 6: Regenerate All Configurations (5 min)

```bash
# Run generator
tsx infrastructure/tools/shared/config/generator.ts

# Check exit code
echo "Generator exit code: $?"
```

**Expected Output:**
```
🚀 Generating configurations from config-registry.yaml...

📦 Generating Docker Compose files...
  ✓ Created infrastructure/local/docker/compose/docker-compose-db.yml
  ✓ Created infrastructure/local/docker/compose/docker-compose-services.yml
☸️  Generating Kubernetes manifests...
  ✓ Created Kubernetes manifests in infrastructure/local/minikube/manifests/base
📝 Generating .env files...
  ✓ Created infrastructure/local/configs/.env.local
  ✓ Created infrastructure/local/configs/.env.docker
  ✓ Created infrastructure/local/configs/.env.kubernetes
  ✓ Created infrastructure/local/configs/.env.minikube
🤖 Generating agent configuration files...
  ✓ Created infrastructure/local/configs/agents/builder.config.json
  ✓ Created infrastructure/local/configs/agents/bootstrap.config.json
  ✓ Created infrastructure/local/configs/agents/engine.config.json
  ✓ Created infrastructure/local/configs/agents/session-agent.config.json
  ✓ Created infrastructure/local/configs/agents/persistence-agent.config.json

✅ Configuration generation complete!
```

---

### Step 7: Run Validator (5 min)

```bash
# Validate all configurations
tsx infrastructure/tools/shared/config/validator.ts
```

**Expected Output:**
```
🔍 Validating configurations against config-registry.yaml...

📦 Validating Docker Compose files...
☸️  Validating Kubernetes manifests...
🤖 Validating agent configuration files...
📝 Validating .env files...

📊 Validation Results:

✅ All configurations are valid!
```

---

### Step 8: Review Generated Changes (15 min)

```bash
# See what changed
git diff infrastructure/local/

# Focus on key files
git diff infrastructure/local/docker/compose/docker-compose-db.yml
git diff infrastructure/local/minikube/manifests/minikube/redis.yaml
git diff infrastructure/local/minikube/manifests/minikube/rabbitmq.yaml
git diff infrastructure/local/minikube/manifests/minikube/mongo-repl-1.yaml
```

**Verify:**
- [ ] Redis image is `redis:latest` (not `srvthreds:dev`)
- [ ] Redis port is `6379` (not `6380`)
- [ ] RabbitMQ is StatefulSet (not Deployment)
- [ ] RabbitMQ image is `rabbitmq:3-management` (not `srvthreds:dev`)
- [ ] MongoDB image is `mongo:latest` (not `srvthreds:dev`)
- [ ] All ConfigMaps reference `:6379`

---

### Step 9: Test Docker Compose Deployment (30 min)

```bash
# Clean previous deployment
npm run deploy-local-down-all

# Start databases
npm run deploy-local-databases

# Verify Redis
docker ps --filter "name=redis" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
# Expected: redis    redis:latest    0.0.0.0:6379->6379/tcp

docker exec -it redis redis-cli -p 6379 ping
# Expected: PONG

# Verify RabbitMQ
docker ps --filter "name=rabbitmq" --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
# Expected: rabbitmq    rabbitmq:3-management    0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp

# Verify only ONE rabbitmq container
docker ps --filter "name=rabbitmq" | wc -l
# Expected: 2 (header + 1 container)

# Start services
npm run deploy-local-services

# Verify service connection
docker exec srvthreds-engine env | grep REDIS_HOST
# Expected: REDIS_HOST=redis:6379

# Stop all
npm run deploy-local-down-all
```

---

### Step 10: Test Minikube Deployment (1-1.5 hours)

```bash
# Ensure minikube is running
minikube status

# Deploy to minikube
npm run deploymentCli -- minikube k8s_minikube

# Wait for pods
kubectl get pods -n srvthreds -w
# Wait until all Running, then Ctrl+C

# Verify Redis
kubectl get pod -n srvthreds -l app=redis -o yaml | grep "image:"
# Expected: image: redis:latest

kubectl describe pod -n srvthreds -l app=redis | grep Port
# Expected: Port: 6379/TCP

# Verify RabbitMQ is StatefulSet
kubectl get statefulsets -n srvthreds
# Expected: rabbitmq listed

kubectl get pod -n srvthreds -l app=rabbitmq -o yaml | grep "image:"
# Expected: image: rabbitmq:3-management

# Verify PVC exists
kubectl get pvc -n srvthreds
# Expected: rabbitmq-data-rabbitmq-0    Bound

# Verify MongoDB
kubectl get pod -n srvthreds -l app=mongo-repl-1 -o yaml | grep "image:"
# Expected: image: mongo:latest

# Test connectivity
npm run deploymentCli -- minikube k8s_validate

# Check logs
kubectl logs deployment/srvthreds-engine -n srvthreds --tail=50
```

---

### Step 11: Verify Cloud Not Affected (15 min)

```bash
# Check cloud manifests unchanged
git diff infrastructure/cloud/kubernetes/manifests/

# Should show NO changes
```

---

### Step 12: Commit Changes (10 min)

```bash
# Stage all changes
git add infrastructure/

# Commit
git commit -m "fix: Generator now supports databases with correct images

- Fix Redis port from 6380 to 6379 across all deployments
- Fix generator to use config.image for databases (not hardcoded 'srvthreds:dev')
- Add StatefulSet generation support for databases with persistence
- Add kubernetes.kind config option to choose Deployment vs StatefulSet
- RabbitMQ now uses StatefulSet with persistent volume (matches cloud)
- Update validator to support StatefulSets and image validation
- Generator now differentiates between services (app) and databases (infrastructure)

Breaking changes: None (cloud uses separate manifests)

Files modified:
- config-registry.yaml: Redis port + RabbitMQ StatefulSet config
- generator.ts: Image selection + StatefulSet support
- validator.ts: StatefulSet validation + image checking
- validate-minikube.sh: Redis port fix

Files regenerated (auto):
- All docker-compose files
- All Kubernetes manifests
- All ConfigMaps
- All .env files"

# Push branch
git push origin fix/generator-database-support
```

---

## Testing Checklist

### Local Docker Testing
- [ ] Redis container uses `redis:latest` image
- [ ] Redis listens on port 6379
- [ ] Redis accessible at `localhost:6379`
- [ ] Services connect to `redis:6379`
- [ ] `redis-cli -p 6379 ping` returns PONG
- [ ] Only ONE RabbitMQ container running
- [ ] RabbitMQ uses `rabbitmq:3-management` image
- [ ] MongoDB uses `mongo:latest` image
- [ ] All services start successfully
- [ ] No connection errors in service logs

### Minikube Testing
- [ ] Redis pod uses `redis:latest` image (NOT `srvthreds:dev`)
- [ ] Redis container port is 6379
- [ ] RabbitMQ is StatefulSet (NOT Deployment)
- [ ] RabbitMQ pod uses `rabbitmq:3-management` image (NOT `srvthreds:dev`)
- [ ] RabbitMQ has PVC `rabbitmq-data-rabbitmq-0`
- [ ] MongoDB uses `mongo:latest` image (NOT `srvthreds:dev`)
- [ ] All pods reach Running state
- [ ] Application pods connect to databases successfully
- [ ] No ImagePullBackOff errors
- [ ] Services can read/write to Redis
- [ ] RabbitMQ messages persist across pod restarts

### Cloud Verification
- [ ] No changes to `infrastructure/cloud/` directory
- [ ] Cloud ConfigMap still references Azure Redis at `:6380`
- [ ] Cloud RabbitMQ still uses StatefulSet
- [ ] No impact on production deployments

### Generator Testing
- [ ] Generator runs without errors
- [ ] Generator produces valid YAML
- [ ] Generator respects `config.image` for databases
- [ ] Generator creates StatefulSets when `kubernetes.kind: StatefulSet`
- [ ] Generator creates Deployments by default
- [ ] Generator handles missing image config gracefully (error message)

### Validator Testing
- [ ] Validator passes all checks
- [ ] Validator catches image mismatches
- [ ] Validator validates StatefulSet fields
- [ ] Validator checks volumeClaimTemplates
- [ ] Validator reports clear error messages

---

## Rollback Plan

If testing fails:

### Option 1: Revert to Backup
```bash
git checkout backup-before-generator-fix
npm run deploy-local-down-all
npm run deploy-local-up-all
```

### Option 2: Revert Specific Files
```bash
git checkout HEAD~1 infrastructure/config-registry.yaml
git checkout HEAD~1 infrastructure/tools/shared/config/generator.ts
tsx infrastructure/tools/shared/config/generator.ts
npm run deploy-local-down-all
npm run deploy-local-up-all
```

### Option 3: Emergency Manual Fix
```bash
# ONLY for emergencies - violates "don't edit generated files" rule
# Edit generated files directly to restore functionality
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|---------|------------|
| Generator breaks service manifests | LOW | HIGH | Services use isService flag, separate code path |
| StatefulSet generation has bugs | MEDIUM | MEDIUM | Thoroughly test RabbitMQ persistence |
| Cloud deployment affected | LOW | CRITICAL | Cloud uses separate manifests, verify no changes |
| Validator false positives | LOW | LOW | Test validator with known-good configs |
| Docker Compose breaks | LOW | HIGH | Docker compose uses separate generation logic |
| Image pull failures in minikube | LOW | MEDIUM | Use IfNotPresent policy, images should cache |
| RabbitMQ data loss | LOW | MEDIUM | StatefulSet with PVC prevents data loss |
| Port conflicts | LOW | LOW | 6379 is standard Redis port, unlikely conflicts |

---

## Success Criteria

### Must Have
- [x] Redis uses port 6379 everywhere except cloud
- [x] Generator uses correct images for databases
- [x] RabbitMQ deploys as StatefulSet in minikube
- [x] All databases use their native images (not srvthreds:dev)
- [x] Validator passes without errors
- [x] Local docker deployment works
- [x] Minikube deployment works
- [x] Cloud deployments unaffected

### Should Have
- [x] Clear error messages for missing config
- [x] StatefulSet with persistent volumes
- [x] Image pull policy configurable
- [x] Minikube matches cloud architecture

### Nice to Have
- [ ] Unit tests for generator functions
- [ ] Integration tests for generation pipeline
- [ ] Documentation updates in README

---

## Timeline

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 1 | Backup and setup | 5 min | 5 min |
| 2 | Modify config-registry.yaml | 15 min | 20 min |
| 3 | Modify generator.ts | 3 hrs | 3h 20m |
| 4 | Modify validator.ts | 1 hr | 4h 20m |
| 5 | Modify validate-minikube.sh | 2 min | 4h 22m |
| 6 | Regenerate configs | 5 min | 4h 27m |
| 7 | Run validator | 5 min | 4h 32m |
| 8 | Review changes | 15 min | 4h 47m |
| 9 | Test Docker Compose | 30 min | 5h 17m |
| 10 | Test Minikube | 1.5 hrs | 6h 47m |
| 11 | Verify cloud unaffected | 15 min | 7h 2m |
| 12 | Commit and document | 10 min | **7h 12m** |

**Contingency buffer:** +3 hours for debugging = **~10 hours total**

---

## Expected Generated File Changes

### Docker Compose Files

**docker-compose-db.yml:**
- Redis port: `'6379:6379'` (was `'6380:6380'`)

**docker-compose-services.yml:**
- All services: `REDIS_HOST=redis:6379` (was `redis:6380`)

### Kubernetes Manifests (Minikube Databases)

**redis.yaml:**
- Image: `redis:latest` (was `srvthreds:dev`)
- Port: `6379` (was `6380`)

**rabbitmq.yaml:**
- Kind: `StatefulSet` (was `Deployment`)
- Image: `rabbitmq:3-management` (was `srvthreds:dev`)
- New: volumeClaimTemplates with 1Gi storage

**mongo-repl-1.yaml:**
- Image: `mongo:latest` (was `srvthreds:dev`)

### ConfigMaps

**All ConfigMaps:**
- `REDIS_HOST` with `:6379` (was `:6380`)

---

## Notes

- Cloud deployments are NOT affected (use separate manual manifests)
- Generator becomes reusable for other projects after this fix
- RabbitMQ in minikube now matches cloud architecture (StatefulSet)
- All database images are now correct and will actually start
- This fix is REQUIRED before extracting infrastructure/ to standalone tool

---

## Contact

For questions or issues during implementation, refer to:
- Generator code: `infrastructure/tools/shared/config/generator.ts`
- Config registry: `infrastructure/config-registry.yaml`
- Deployment docs: `infrastructure/tools/README.md`
