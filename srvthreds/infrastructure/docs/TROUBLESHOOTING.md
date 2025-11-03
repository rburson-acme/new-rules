# Troubleshooting Guide

Comprehensive guide for debugging local and Minikube environments.

## Table of Contents

- [Quick Diagnostic Commands](#quick-diagnostic-commands)
- [Common Issues](#common-issues)
- [Local Docker Environment](#local-docker-environment)
- [Minikube Environment](#minikube-environment)
- [Database Issues](#database-issues)
- [Bootstrap Issues](#bootstrap-issues)
- [Test Failures](#test-failures)
- [Recovery Procedures](#recovery-procedures)

---

## Quick Diagnostic Commands

### Check Everything Status

```bash
# Docker daemon
docker info

# All containers
docker ps -a

# Database containers specifically
docker ps -a | grep -E "mongo|redis|rabbitmq"

# Minikube cluster
minikube status

# Minikube pods
kubectl get pods -n srvthreds

# Minikube services
kubectl get svc -n srvthreds

# Check which kubectl context you're using
kubectl config current-context
```

### Check Logs

```bash
# Docker container logs
docker logs mongo-repl-1 --tail=50
docker logs redis --tail=50
docker logs rabbitmq --tail=50

# Minikube pod logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine --tail=50
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-session-agent --tail=50
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-persistence-agent --tail=50

# Follow logs in real-time
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine -f
```

### Check Connectivity

```bash
# Test MongoDB connection
nc -zv localhost 27017

# Test Redis connection
nc -zv localhost 6379

# Test RabbitMQ connection
nc -zv localhost 5672

# Test RabbitMQ management console
nc -zv localhost 15672

# From within Minikube, test host connectivity
minikube ssh "nc -zv host.docker.internal 27017"
```

---

## Common Issues

### Issue: "Docker daemon is not running"

**Symptoms:**
- Cannot run docker commands
- Error: `Cannot connect to the Docker daemon`

**Solution:**
```bash
# 1. Open Docker Desktop application
# 2. Wait for Docker to fully start (whale icon steady in menu bar)
# 3. Verify it's running
docker info
```

### Issue: "Containers exit after Docker restart"

**Symptoms:**
- Redis, RabbitMQ, or Minikube show `Exited (255)` status after Docker restart
- Only MongoDB starts automatically

**Diagnosis:**
```bash
# Check restart policies
docker inspect mongo-repl-1 redis rabbitmq minikube --format='{{.Name}}: restart={{.HostConfig.RestartPolicy.Name}}'
```

**Solution:**
```bash
# Set restart policies
docker update --restart=unless-stopped redis rabbitmq minikube

# Start containers
docker start redis rabbitmq minikube

# Verify they're running
docker ps | grep -E "redis|rabbitmq|minikube"
```

### Issue: "Minikube won't start"

**Symptoms:**
- `minikube start` fails
- Error about driver issues or resource constraints

**Diagnosis:**
```bash
# Check Minikube status
minikube status

# Check Docker resources
docker system df
docker stats --no-stream

# Check Minikube logs
minikube logs --length=50
```

**Solution:**
```bash
# Delete and recreate cluster
minikube delete
npm run minikube-create

# Or if Docker is the issue
# 1. Restart Docker Desktop
# 2. Wait for Docker to be ready
# 3. Try again
minikube start
```

### Issue: "kubectl connection refused"

**Symptoms:**
- Error: `The connection to the server 127.0.0.1:xxxxx was refused`
- Can't connect to Kubernetes API

**Diagnosis:**
```bash
# Check kubectl context
kubectl config current-context

# Check if Minikube is running
minikube status

# Check Docker container
docker ps | grep minikube
```

**Solution:**
```bash
# Update kubectl context
minikube update-context

# Switch to Minikube context
kubectl config use-context minikube

# If still fails, restart Minikube
docker restart minikube
sleep 10
minikube update-context
```

### Issue: "Pods not starting / CrashLoopBackOff"

**Symptoms:**
- Pods show `CrashLoopBackOff` or `Error` status
- Pods continuously restart

**Diagnosis:**
```bash
# Check pod status
kubectl get pods -n srvthreds

# Describe specific pod
kubectl describe pod -n srvthreds <pod-name>

# Check logs
kubectl logs -n srvthreds <pod-name> --previous

# Check events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'
```

**Solution:**
```bash
# Check if databases are accessible from pods
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 27017

# Check environment variables
kubectl exec -n srvthreds <pod-name> -- env | grep -E "MONGO|REDIS|RABBITMQ"

# Restart deployments
kubectl rollout restart deployment/srvthreds-engine -n srvthreds
kubectl rollout restart deployment/srvthreds-session-agent -n srvthreds
kubectl rollout restart deployment/srvthreds-persistence-agent -n srvthreds
```

---

## Local Docker Environment

### Full Health Check

```bash
# 1. Check all containers
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Check networks
docker network ls | grep srvthreds

# 3. Check volumes
docker volume ls | grep -E "mongo|redis|rabbitmq"

# 4. Test database connectivity
nc -zv localhost 27017  # MongoDB
nc -zv localhost 6379   # Redis
nc -zv localhost 5672   # RabbitMQ
nc -zv localhost 15672  # RabbitMQ Management
```

### Start Local Environment

```bash
# Start databases
npm run deploymentCli -- local s_a_dbs

# Verify databases are healthy
docker ps | grep -E "mongo|redis|rabbitmq"

# Check MongoDB replica set
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().ok"
```

### Stop Local Environment

```bash
# Stop all services
npm run deploymentCli -- local d_a

# Or stop databases only
docker stop mongo-repl-1 redis rabbitmq
```

### Clean Local Environment

```bash
# Remove containers (keeps data)
docker rm -f mongo-repl-1 redis rabbitmq

# Remove containers and volumes (DESTRUCTIVE)
docker rm -f mongo-repl-1 redis rabbitmq
docker volume prune -f
```

---

## Minikube Environment

### Full Health Check

```bash
# 1. Check Docker is running
docker info

# 2. Check Minikube container
docker ps | grep minikube

# 3. Check Minikube status
minikube status

# 4. Check kubectl context
kubectl config current-context

# 5. Check all pods
kubectl get pods -n srvthreds

# 6. Check all services
kubectl get svc -n srvthreds

# 7. Check deployments
kubectl get deployments -n srvthreds
```

### Start Minikube Environment

```bash
# Full setup (first time or after cleanup)
npm run minikube-create

# Or manual steps:
# 1. Start Minikube
minikube start

# 2. Set restart policy
docker update --restart=unless-stopped minikube

# 3. Update kubectl context
minikube update-context

# 4. Deploy applications
kubectl apply -k infrastructure/kubernetes/overlays/minikube/

# 5. Wait for pods
kubectl wait --for=condition=ready --timeout=300s pod -l app.kubernetes.io/part-of=srvthreds -n srvthreds
```

### Validate Minikube Environment

```bash
# Run validation script
npm run minikube-validate

# Or manual validation:
# 1. Check all pods are ready
kubectl get pods -n srvthreds

# 2. Check databases are accessible
nc -zv localhost 27017
nc -zv localhost 6379
nc -zv localhost 5672

# 3. Run bootstrap
npm run bootstrap -- -p ef-detection

# 4. Run tests
npm test
```

### Stop Minikube Environment

```bash
# Stop Minikube (keeps cluster)
minikube stop

# Or cleanup (removes everything)
npm run minikube-cleanup
```

### Clean Minikube Environment

```bash
# Delete Minikube cluster
minikube delete

# Remove Docker images
eval $(minikube docker-env)
docker images | grep srvthreds | awk '{print $3}' | xargs docker rmi -f
eval $(minikube docker-env --unset)

# Full cleanup
npm run minikube-cleanup
# Choose 'Y' to remove databases
```

---

## Database Issues

### MongoDB Issues

**Check MongoDB Status:**
```bash
# Container status
docker ps | grep mongo

# Logs
docker logs mongo-repl-1 --tail=50

# Connect to MongoDB
docker exec -it mongo-repl-1 mongosh
```

**Check Replica Set:**
```bash
# Check replica set status
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status()"

# Check if replica set has a primary
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().members.filter(m => m.stateStr === 'PRIMARY')"

# Re-initialize replica set if needed
bash infrastructure/local/scripts/setup-repl.sh
```

**MongoDB Won't Start:**
```bash
# Check if port is already in use
lsof -i :27017

# Check logs for errors
docker logs mongo-repl-1 --tail=100

# Remove and recreate
docker rm -f mongo-repl-1
npm run deploymentCli -- local s_a_dbs
bash infrastructure/local/scripts/setup-repl.sh
```

### Redis Issues

**Check Redis Status:**
```bash
# Container status
docker ps | grep redis

# Logs
docker logs redis --tail=50

# Test connection
docker exec -it redis redis-cli ping
```

**Redis Won't Start:**
```bash
# Check if port is in use
lsof -i :6379

# Check logs
docker logs redis --tail=100

# Remove and recreate
docker rm -f redis
npm run deploymentCli -- local s_a_dbs
```

### RabbitMQ Issues

**Check RabbitMQ Status:**
```bash
# Container status
docker ps | grep rabbitmq

# Logs
docker logs rabbitmq --tail=50

# Management UI
open http://localhost:15672
# Default credentials: guest/guest
```

**RabbitMQ Won't Start:**
```bash
# Check if ports are in use
lsof -i :5672
lsof -i :15672

# Check logs
docker logs rabbitmq --tail=100

# Remove and recreate
docker rm -f rabbitmq
npm run deploymentCli -- local s_a_dbs
```

---

## Script/Command Hangs

### npm run minikube-validate Hangs

**Symptoms:**
- `npm run minikube-validate` gets stuck after showing pod logs
- Script never proceeds to run validation
- Shows "Loaded Pattern" messages but doesn't continue

**Diagnosis:**
```bash
# Check for hanging processes
ps aux | grep -E "kubectl logs -f|bootstrap|minikube-validate"

# Check deployment config
cat infrastructure/deployment/configs/deployments/kubernetes.json | grep -A5 preBuildCommands
```

**Cause:**
The deployment config had `kubectl logs -f` (follow mode) which streams logs indefinitely and never exits.

**Solution:**
Already fixed in the config, but if you encounter this:
```bash
# Kill hanging processes
pkill -f "kubectl logs"
pkill -f "minikube-validate"

# The config should use --tail instead of -f
# kubectl logs deployment/srvthreds-engine -n srvthreds --tail=50
# NOT: kubectl logs -f deployment/srvthreds-engine -n srvthreds
```

## Bootstrap Issues

### Bootstrap Hangs or Times Out

**Symptoms:**
- Bootstrap process hangs at "Loaded Pattern"
- Bootstrap doesn't complete after 2+ minutes

**Diagnosis:**
```bash
# Check if databases are accessible
nc -zv localhost 27017
nc -zv localhost 6379
nc -zv localhost 5672

# Check database processes
ps aux | grep -E "mongod|redis|rabbitmq"

# Check for hanging bootstrap processes
ps aux | grep bootstrap
```

**Solution:**
```bash
# Kill hanging processes
pkill -f "bootstrap"

# Verify databases are running
docker ps | grep -E "mongo|redis|rabbitmq"

# Verify MongoDB replica set
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().ok"

# Clear database and retry
npm run bootstrap -- -p ef-detection --cleanup
npm run bootstrap -- -p ef-detection
```

### Bootstrap Profile Not Found

**Symptoms:**
- Error: "Cannot find profile 'test'"
- Bootstrap fails immediately

**Diagnosis:**
```bash
# Check available profiles
ls -la run-profiles/

# Check profile contents
ls -la run-profiles/ef-detection/
```

**Solution:**
```bash
# Use existing profile
npm run bootstrap -- -p ef-detection

# Or create test profile if needed
mkdir -p run-profiles/test/{patterns,run-config}
```

---

## Test Failures

### Tests Can't Connect to Databases

**Diagnosis:**
```bash
# Check database ports
lsof -i :27017
lsof -i :6379
lsof -i :5672

# Check environment variables
echo $MONGO_HOST
echo $REDIS_HOST
echo $RABBITMQ_HOST
```

**Solution:**
```bash
# Set environment variables
export MONGO_HOST="localhost:27017"
export MONGO_DIRECT_CONNECTION="true"
export REDIS_HOST="localhost:6379"
export RABBITMQ_HOST="localhost"

# Run tests
npm test
```

### Tests Timeout

**Diagnosis:**
```bash
# Check if pods are running (Minikube)
kubectl get pods -n srvthreds

# Check pod logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine --tail=50
```

**Solution:**
```bash
# Increase test timeout in vitest.config.ts
# Or run tests with longer timeout
npm test -- --testTimeout=30000
```

---

## Recovery Procedures

### Complete Local Reset

```bash
# 1. Stop and remove all containers
docker stop $(docker ps -aq) 2>/dev/null
docker rm $(docker ps -aq) 2>/dev/null

# 2. Remove volumes (DESTRUCTIVE - deletes all data)
docker volume prune -f

# 3. Remove networks
docker network prune -f

# 4. Restart Docker Desktop
# Manual step - restart from UI

# 5. Recreate environment
npm run deploymentCli -- local s_a_dbs
bash infrastructure/local/scripts/setup-repl.sh
npm run bootstrap -- -p ef-detection
```

### Complete Minikube Reset

```bash
# 1. Delete Minikube cluster
minikube delete

# 2. Remove Docker Minikube images
docker images | grep minikube | awk '{print $3}' | xargs docker rmi -f 2>/dev/null

# 3. Restart Docker Desktop (if needed)
# Manual step

# 4. Recreate Minikube
npm run minikube-create

# 5. Validate
npm run minikube-validate
```

### Emergency Database Recovery

**If MongoDB replica set is broken:**
```bash
# 1. Stop MongoDB
docker stop mongo-repl-1

# 2. Remove container (keeps volume if configured)
docker rm mongo-repl-1

# 3. Recreate
npm run deploymentCli -- local s_a_dbs

# 4. Re-initialize replica set
bash infrastructure/local/scripts/setup-repl.sh

# 5. Verify
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().ok"
```

---

## Environment Variables Reference

### Local Development

```bash
export MONGO_HOST="localhost:27017"
export MONGO_DIRECT_CONNECTION="true"
export REDIS_HOST="localhost:6379"
export RABBITMQ_HOST="localhost"
export RABBITMQ_PORT="5672"
export NODE_ENV="development"
```

### Minikube Testing

```bash
export MONGO_HOST="localhost:27017"
export MONGO_DIRECT_CONNECTION="true"
export REDIS_HOST="localhost:6379"
export RABBITMQ_HOST="localhost"
export RABBITMQ_PORT="5672"
```

---

## Getting Help

### Collect Diagnostic Information

When reporting issues, run these commands and include output:

```bash
# System info
echo "=== System Info ==="
uname -a
docker version
minikube version
kubectl version --client

# Docker status
echo "=== Docker Containers ==="
docker ps -a

# Minikube status
echo "=== Minikube Status ==="
minikube status
kubectl get pods -n srvthreds
kubectl get events -n srvthreds --sort-by='.lastTimestamp' | tail -20

# Logs
echo "=== Recent Logs ==="
docker logs mongo-repl-1 --tail=20
docker logs redis --tail=20
docker logs rabbitmq --tail=20
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine --tail=20
```

### Quick Reference Card

```bash
# Status checks
docker ps                                    # All containers
minikube status                              # Minikube cluster
kubectl get pods -n srvthreds                # Minikube pods

# Start services
npm run deploymentCli -- local s_a_dbs       # Start local databases
npm run minikube-create                      # Setup Minikube

# Stop services
docker stop mongo-repl-1 redis rabbitmq      # Stop databases
minikube stop                                # Stop Minikube

# Logs
docker logs <container> --tail=50            # Container logs
kubectl logs -n srvthreds <pod> --tail=50    # Pod logs

# Validate
npm run minikube-validate                    # Validate Minikube setup

# Reset
minikube delete && npm run minikube-create   # Full Minikube reset
```
