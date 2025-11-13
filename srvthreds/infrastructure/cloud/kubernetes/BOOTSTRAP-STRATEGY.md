# Bootstrap Strategy for Kubernetes Deployments

## Overview

The bootstrap process seeds the database with initial configuration data. This is a **one-time operation** that must run before the main services start.

## Current Implementation

### Docker Compose (Local)
- Uses `srvthreds-bootstrap` service
- Runs `npm run bootstrap -- -p ef-detection`
- Has `restart: 'no'` policy
- Runs as a dependency for other services

### Kubernetes (Needs Update)

#### Current Issue
The Minikube manifests use a **Deployment** for bootstrap, which is incorrect because:
- Deployments are for long-running services
- Bootstrap completes and exits, causing Kubernetes to restart it unnecessarily
- Wastes resources and could cause race conditions

#### Correct Approach: Kubernetes Jobs

Bootstrap operations should use **Kubernetes Jobs**:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: srvthreds-bootstrap
spec:
  ttlSecondsAfterFinished: 3600  # Auto-cleanup after 1 hour
  backoffLimit: 3  # Retry on failure
  template:
    spec:
      restartPolicy: OnFailure  # Don't restart on success
      containers:
        - name: bootstrap
          image: cazsrvthredsdeacr.azurecr.io/srvthreds/bootstrap:latest
          command: ["npm", "run", "bootstrap", "--", "-p", "ef-detection"]
```

## Image Build Process

### AKSDeployer Build Order

1. **srvthreds-builder** (base image with compiled code)
2. **srvthreds-bootstrap** (job image)
3. **srvthreds-engine** (main service)
4. **srvthreds-session-agent** (agent service)
5. **srvthreds-persistence-agent** (agent service)

All except the builder are pushed to ACR.

## Future Enhancements

### Multiple Bootstrap Operations

As you add more bootstrap operations, consider these patterns:

#### 1. Single Job with Multiple Steps
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: srvthreds-bootstrap-all
spec:
  template:
    spec:
      containers:
        - name: bootstrap
          image: srvthreds/bootstrap:latest
          command: ["/bin/sh", "-c"]
          args:
            - |
              npm run bootstrap -- -p ef-detection &&
              npm run bootstrap -- -p another-config &&
              npm run bootstrap -- -p yet-another-config
```

#### 2. Multiple Jobs with Dependencies
```yaml
---
apiVersion: batch/v1
kind: Job
metadata:
  name: srvthreds-bootstrap-base
spec:
  template:
    spec:
      containers:
        - name: bootstrap
          command: ["npm", "run", "bootstrap", "--", "-p", "base-config"]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: srvthreds-bootstrap-ef-detection
  # This job depends on base completing first (handle in deployment script)
spec:
  template:
    spec:
      containers:
        - name: bootstrap
          command: ["npm", "run", "bootstrap", "--", "-p", "ef-detection"]
```

#### 3. Init Containers (For Service-Specific Bootstrap)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srvthreds-engine
spec:
  template:
    spec:
      initContainers:
        - name: bootstrap
          image: srvthreds/bootstrap:latest
          command: ["npm", "run", "bootstrap", "--", "-p", "engine-specific"]
      containers:
        - name: engine
          image: srvthreds/engine:latest
```

### Recommended Pattern: CronJob for Recurring Config Updates

If bootstrap operations need to run periodically (e.g., to refresh config):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: srvthreds-config-refresh
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: bootstrap
              image: srvthreds/bootstrap:latest
              command: ["npm", "run", "bootstrap", "--", "-p", "ef-detection"]
```

## Migration Plan

### Phase 1: Current (Immediate)
- ✅ Build and push bootstrap image to ACR
- ⚠️ Keep existing Deployment manifests (for compatibility)
- Document the issue

### Phase 2: Convert to Jobs (Next Sprint)
- Convert bootstrap Deployment to Job in Minikube manifests
- Create Job manifests for AKS environments (dev/test/prod)
- Update deployment scripts to wait for Job completion
- Test thoroughly in dev environment

### Phase 3: Advanced Bootstrap Management (Future)
- Implement bootstrap orchestration (multiple jobs with dependencies)
- Add Helm charts for easier management
- Create bootstrap config versioning
- Add rollback capabilities

## Testing Bootstrap

### Manual Testing
```bash
# Run bootstrap job manually
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/srvthreds-bootstrap-job.yaml

# Check job status
kubectl get jobs -n srvthreds

# View job logs
kubectl logs job/srvthreds-bootstrap -n srvthreds

# Check if job completed successfully
kubectl get job srvthreds-bootstrap -n srvthreds -o jsonpath='{.status.succeeded}'
```

### Debugging Failed Bootstrap
```bash
# Get job details
kubectl describe job srvthreds-bootstrap -n srvthreds

# Get pod logs (job creates pods)
kubectl logs -n srvthreds -l job-name=srvthreds-bootstrap --tail=100

# If job failed and you want to retry
kubectl delete job srvthreds-bootstrap -n srvthreds
kubectl apply -f infrastructure/cloud/kubernetes/manifests/base/srvthreds-bootstrap-job.yaml
```

## Best Practices

1. **Use Jobs, not Deployments** for bootstrap operations
2. **Set appropriate resource limits** to prevent resource exhaustion
3. **Configure retry policies** (`backoffLimit`) for transient failures
4. **Add TTL for completed jobs** (`ttlSecondsAfterFinished`) to auto-cleanup
5. **Use meaningful job names** that include timestamps for multiple runs
6. **Log bootstrap operations** for debugging and audit trails
7. **Make bootstrap idempotent** - safe to run multiple times
8. **Add health checks** to detect hung bootstrap processes
9. **Version your bootstrap images** with git commit SHAs, not just 'latest'
10. **Test bootstrap in isolation** before full deployment

## Related Files

- [srvthreds-bootstrap-job.yaml](./manifests/base/srvthreds-bootstrap-job.yaml) - Kubernetes Job manifest
- [docker-compose-services.yml](../../local/docker/compose/docker-compose-services.yml) - Bootstrap service definition
- [AKSDeployer.ts](../../tools/kubernetes-deployer/src/deployers/AKSDeployer.ts) - Build and push logic
- [Dockerfile.cmdRunner](../../local/docker/dockerfiles/Dockerfile.cmdRunner) - Bootstrap image Dockerfile
