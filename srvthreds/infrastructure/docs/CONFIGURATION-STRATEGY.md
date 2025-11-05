# Configuration Strategy

## Overview

SrvThreds uses **different configuration approaches** for different deployment environments to follow best practices for each platform.

## Configuration by Environment

### Local Docker Compose

**Method**: `.env` file embedded in Docker image

**Why?**
- ✅ Self-contained and simple
- ✅ Works without external dependencies
- ✅ Quick local development

**Files**:
- Source: `infrastructure/local/configs/.env.local.example`
- Copied to: `dist-server/.env` (inside image)
- Used by: Docker Compose services

**How it works**:
1. Build step copies `.env.local.example` → `local/configs/.env`
2. Dockerfile copies `local/configs/.env` → `dist-server/.env`
3. Application reads from `dist-server/.env`
4. Cleanup step removes `local/configs/.env` after build

**Example**:
```bash
npm run deploymentCli local s_a_s
```

---

### Kubernetes/Minikube

**Method**: ConfigMap (no `.env` file)

**Why?**
- ✅ Kubernetes-native approach
- ✅ Can change config without rebuilding images
- ✅ Supports Secrets for sensitive data
- ✅ Environment-specific overlays via Kustomize

**Files**:
- Base: `infrastructure/local/minikube/manifests/base/configmap.yaml`
- Minikube overlay: `infrastructure/local/minikube/manifests/minikube/configmap-minikube.yaml`
- Production overlay: `infrastructure/local/minikube/manifests/prod/configmap-prod.yaml`

**How it works**:
1. Build creates empty `.env` placeholder (satisfies Dockerfile COPY)
2. ConfigMap injected as environment variables at pod startup
3. Application reads from `process.env.*` (not `.env` file)

**Example ConfigMap**:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
  namespace: srvthreds
data:
  NODE_ENV: development
  MONGO_HOST: host.minikube.internal:27017
  REDIS_HOST: host.minikube.internal:6379
  RABBITMQ_HOST: rabbitmq:5672
```

**Example Deployment**:
```bash
npm run minikube-create
```

---

## Configuration Hierarchy

Application reads configuration in this order (last wins):

1. **Defaults in code** (e.g., `DEFAULT_HOST = 'localhost:27017'`)
2. **`.env` file** (if present in `dist-server/`)
3. **Environment variables** (from ConfigMap in Kubernetes)

For Kubernetes: Only #1 and #3 apply (no `.env` file)

---

## Best Practices

### ✅ DO

- Use `.env` for local Docker Compose development
- Use ConfigMap for Kubernetes deployments
- Use Secrets for sensitive data in production
- Keep environment-specific configs in separate overlay files
- Document which environment variables are required

### ❌ DON'T

- Don't mix `.env` files and ConfigMaps in Kubernetes
- Don't commit `.env` files with real secrets to git
- Don't hardcode environment-specific values in the Dockerfile
- Don't use the same configuration for all environments

---

## Adding New Configuration

### For Local Docker Compose

1. Add to `infrastructure/local/configs/.env.local.example`
2. Rebuild image: `npm run deploymentCli local build_server`

### For Kubernetes

1. Add to base ConfigMap: `infrastructure/local/minikube/manifests/base/configmap.yaml`
2. Override in environment overlay if needed (e.g., `manifests/minikube/configmap-minikube.yaml`)
3. Apply: `npm run minikube-apply`

---

## Environment Variables Reference

### Database Configuration

| Variable | Local (Docker) | Minikube | Production |
|----------|---------------|----------|------------|
| `MONGO_HOST` | `mongo-repl-1:27017` | `host.minikube.internal:27017` | `mongodb-service:27017` |
| `MONGO_DIRECT_CONNECTION` | (not set) | `true` | (not set) |
| `REDIS_HOST` | `redis:6379` | `host.minikube.internal:6379` | `redis-service:6379` |
| `RABBITMQ_HOST` | `rabbitmq:5672` | `rabbitmq:5672` | `rabbitmq:5672` |

**Note on `MONGO_DIRECT_CONNECTION`**:
- Set to `true` in Minikube to bypass MongoDB replica set discovery
- Required when connecting to host Docker MongoDB from Minikube pods
- Prevents hostname resolution errors for replica set members
- Not needed for local Docker (containers on same network) or production (proper DNS)

### Application Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development`, `production` |
| `LOG_LEVEL` | Logging verbosity | `DEBUG`, `INFO`, `ERROR` |
| `JWT_SECRET` | JWT signing key | (use Secrets in prod) |

---

## Troubleshooting

### "Can't connect to database" in Kubernetes

**Check**: Is ConfigMap applied correctly?
```bash
kubectl get configmap srvthreds-config -n srvthreds -o yaml
```

**Check**: Are environment variables injected into pod?
```bash
kubectl exec -n srvthreds deployment/srvthreds-engine -- env | grep MONGO
```

### "Undefined environment variable" in local Docker

**Check**: Is `.env` file in the image?
```bash
docker run --rm srvthreds-builder:latest cat /app/srvthreds/dist-server/.env
```

**Fix**: Rebuild with proper environment
```bash
npm run deploymentCli local build_server
```

---

## Migration Guide

### From `.env` to ConfigMap (for new environments)

1. Create base ConfigMap with all required variables
2. Create environment overlay with environment-specific values
3. Update deployment config to create empty `.env` placeholder
4. Test deployment and verify environment variables are injected

### From ConfigMap to `.env` (not recommended)

This goes against Kubernetes best practices. Use ConfigMap for all Kubernetes deployments.
