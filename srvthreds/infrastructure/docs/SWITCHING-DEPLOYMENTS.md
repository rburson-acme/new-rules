# Switching Between Local and Minikube Deployments

## Overview

SrvThreds supports running services in two modes:
- **Local**: Docker Compose (databases + services on host)
- **Minikube**: Kubernetes (services in cluster, databases on host)

Both modes **share the same database instances** (MongoDB, Redis, RabbitMQ), so switching between them is straightforward.

## Key Concept: Shared Database State

Bootstrap only needs to run **once per database instance** because:
- Bootstrap populates configuration data (patterns, agent configs, sessions)
- This data persists in MongoDB/Redis
- Both local and Minikube services read from the same databases
- **No need to re-bootstrap when switching deployments**

## Architecture Diagrams

### Local Deployment
```
┌─────────────────────────────────────────┐
│          Docker Host                     │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  Engine  │  │ Session  │  │Persist.││
│  │ Container│  │  Agent   │  │ Agent  ││
│  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       │             │             │     │
│       └─────────────┼─────────────┘     │
│                     │                   │
│  ┌──────────────────▼────────────────┐ │
│  │    Shared Databases               │ │
│  ├───────────────────────────────────┤ │
│  │  MongoDB (mongo-repl-1:27017)     │ │
│  │  Redis (redis:6379)               │ │
│  │  RabbitMQ (rabbitmq:5672)         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Minikube Deployment
```
┌─────────────────────────────────────────┐
│          Minikube Cluster                │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │  Engine  │  │ Session  │  │Persist.││
│  │   Pod    │  │Agent Pod │  │Agent Pod│
│  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       │             │             │     │
│       └─────────────┼─────────────┘     │
│                     │                   │
│  ┌──────────────────▼────────────────┐ │
│  │  RabbitMQ (rabbitmq:5672)         │ │
│  │  (StatefulSet in cluster)         │ │
│  └───────────────────────────────────┘ │
└─────────────┬───────────────────────────┘
              │ host.minikube.internal
┌─────────────▼───────────────────────────┐
│          Docker Host                     │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │    Shared Databases (same!)       │ │
│  ├───────────────────────────────────┤ │
│  │  MongoDB (mongo-repl-1:27017)     │ │
│  │  Redis (redis:6379)               │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Switching Scenarios

### Scenario 1: Local → Minikube (Fresh Start)

**When**: Starting from scratch, no deployments running

```bash
# 1. Start host databases
npm run deploymentCli local s_a_dbs

# 2. Wait for MongoDB replica set
# (setup-repl.sh runs automatically)

# 3. Deploy to Minikube
npm run minikube-create

# Result:
# - Databases running on host
# - Services running in Minikube
# - Bootstrap ran once, data persists
```

### Scenario 2: Minikube → Local

**When**: You have Minikube running and want to switch to local Docker

```bash
# 1. Stop Minikube services (keep cluster running)
kubectl delete namespace srvthreds

# 2. Start host databases (if not running)
npm run deploymentCli local s_a_dbs

# 3. Start local services
npm run deploymentCli local s_a_s

# Result:
# - Minikube cluster still running (can restart later)
# - Services now running in Docker on host
# - Same database data, NO bootstrap needed
```

### Scenario 3: Local → Minikube (Databases Already Running)

**When**: You have local deployment running, want to switch to Minikube

```bash
# 1. Stop local services (keep databases)
npm run deploymentCli local d_a_s

# 2. Deploy to Minikube
npm run deploymentCli minikube k8s_apply

# Result:
# - Databases still running on host
# - Services now in Minikube
# - NO bootstrap needed (data already exists)
```

### Scenario 4: Quick Toggle Between Deployments

**When**: Frequently switching for testing

```bash
# Stop one, start the other
npm run deploymentCli local d_a_s && npm run deploymentCli minikube k8s_apply
# or
kubectl delete namespace srvthreds && npm run deploymentCli local s_a_s

# Databases stay running throughout
```

## When Bootstrap IS Required

You only need to run bootstrap again if:

1. **Database data is wiped**:
   ```bash
   npm run deploymentCli local d_a_dbs  # Stops and removes volumes
   npm run deploymentCli local s_a_dbs   # Start fresh
   npm run deploymentCli local bootstrap # Re-populate config
   ```

2. **Pattern/config changes**:
   ```bash
   # After modifying files in src/ts/config/
   npm run deploymentCli local bootstrap
   # or
   npm run deploymentCli minikube k8s_apply  # Bootstrap runs as K8s Job
   ```

3. **Switching to different database instance**:
   ```bash
   # Switching from local MongoDB to cloud MongoDB Atlas
   # Update connection strings, then bootstrap new database
   ```

## Connection Details

### Local Services → Databases
Services connect via Docker network:
- MongoDB: `mongo-repl-1:27017`
- Redis: `redis:6379`
- RabbitMQ: `rabbitmq:5672`

### Minikube Services → Databases
Services connect via special hostname:
- MongoDB: `host.minikube.internal:27017`
- Redis: `host.minikube.internal:6379`
- RabbitMQ: `rabbitmq:5672` (in-cluster StatefulSet)

These are configured in:
- **Local**: `.env` files copied to containers
- **Minikube**: ConfigMap at `infrastructure/kubernetes/overlays/minikube/configmap-minikube.yaml`

## Verification Commands

### Check What's Running Locally
```bash
docker ps --filter "name=srvthreds\|mongo\|redis\|rabbitmq"
```

### Check What's Running in Minikube
```bash
kubectl get pods -n srvthreds
kubectl get svc -n srvthreds
```

### Check Database Data
```bash
# MongoDB - check if patterns exist
docker exec mongo-repl-1 mongosh --eval "db.getSiblingDB('nr').patterns.countDocuments()"

# Redis - check if keys exist
docker exec redis redis-cli KEYS "*"
```

### Test Connectivity

**From Local Services**:
```bash
docker exec srvthreds-engine node -e "console.log('Engine running')"
```

**From Minikube Services**:
```bash
kubectl exec -n srvthreds deployment/srvthreds-engine -- node -e "console.log('Engine running')"
```

## Troubleshooting

### "Cannot connect to MongoDB"

**From Local**:
```bash
# Check if MongoDB is running
docker ps | grep mongo-repl-1

# Check replica set status
docker exec mongo-repl-1 mongosh --eval "rs.status()"

# Restart if needed
npm run deploymentCli local d_a_dbs
npm run deploymentCli local s_a_dbs
```

**From Minikube**:
```bash
# Test connectivity from within cluster
kubectl run -it --rm debug --image=mongo:latest --restart=Never -- \
  mongosh mongodb://host.minikube.internal:27017/nr

# Check ConfigMap
kubectl get configmap srvthreds-config -n srvthreds -o yaml
```

### "Bootstrap data not found"

```bash
# Check if bootstrap completed
kubectl get jobs -n srvthreds
kubectl logs job/srvthreds-bootstrap -n srvthreds

# Or for local
docker logs srvthreds-bootstrap

# Re-run if needed
npm run deploymentCli local bootstrap
```

### "Minikube can't reach host databases"

```bash
# Verify host.minikube.internal resolves
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  ping -c 3 host.minikube.internal

# Check if databases are listening on all interfaces
netstat -an | grep LISTEN | grep -E "27017|6379|5672"
```

## Best Practices

1. **Keep databases running**: Start once, leave running
   ```bash
   npm run deploymentCli local s_a_dbs
   # Leave this running, just switch services
   ```

2. **Use cleanup commands carefully**:
   ```bash
   # Good - stops services, keeps databases
   npm run deploymentCli local d_a_s
   kubectl delete namespace srvthreds

   # Careful - wipes database data!
   npm run deploymentCli local d_a_dbs
   npm run minikube-cleanup  # asks about databases
   ```

3. **Port conflicts**: Only one service deployment can expose port 3000 (session agent)
   ```bash
   # Stop local before starting Minikube
   npm run deploymentCli local d_a_s
   # Or use port-forward for Minikube
   kubectl port-forward -n srvthreds svc/session-agent 3001:3000
   ```

4. **Resource management**:
   ```bash
   # Check resource usage
   docker stats
   kubectl top pods -n srvthreds

   # Stop what you're not using
   ```

## Quick Reference

| Action | Command |
|--------|---------|
| Start local databases | `npm run deploymentCli local s_a_dbs` |
| Start local services | `npm run deploymentCli local s_a_s` |
| Stop local services | `npm run deploymentCli local d_a_s` |
| Stop local everything | `npm run deploymentCli local d_a_dbs_s` |
| Deploy to Minikube | `npm run minikube-create` |
| Update Minikube | `npm run deploymentCli minikube k8s_apply` |
| Stop Minikube services | `kubectl delete namespace srvthreds` |
| Full Minikube cleanup | `npm run minikube-cleanup` |
| Re-run bootstrap (local) | `npm run deploymentCli local bootstrap` |
| Check Minikube pods | `kubectl get pods -n srvthreds` |
| View Minikube logs | `kubectl logs -f deployment/srvthreds-engine -n srvthreds` |

## Summary

**The key takeaway**: You can freely switch between local and Minikube deployments **without re-bootstrapping** because they share the same database instances. Just stop one set of services and start the other. Bootstrap data persists in MongoDB/Redis regardless of where your application services run.
