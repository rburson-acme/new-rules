# Debugging Minikube - Quick Reference

Quick tips and commands for examining pods, viewing logs, and inspecting running containers in Minikube.

## Table of Contents

- [Quick Pod Inspection](#quick-pod-inspection)
- [Viewing Logs](#viewing-logs)
- [Executing Commands Inside Pods](#executing-commands-inside-pods)
- [Database Debugging](#database-debugging)
- [Network Debugging](#network-debugging)
- [Resource Inspection](#resource-inspection)

---

## Quick Pod Inspection

### List All Pods

```bash
# All pods in srvthreds namespace
kubectl get pods -n srvthreds

# All pods with more details
kubectl get pods -n srvthreds -o wide

# Watch pods in real-time
kubectl get pods -n srvthreds --watch
```

### Get Pod Details

```bash
# Detailed pod information
kubectl describe pod -n srvthreds <pod-name>

# Get pod YAML
kubectl get pod -n srvthreds <pod-name> -o yaml

# Get pod's container names
kubectl get pod -n srvthreds <pod-name> -o jsonpath='{.spec.containers[*].name}'
```

### Find Pods by Label

```bash
# Engine pods
kubectl get pods -n srvthreds -l app.kubernetes.io/name=srvthreds-engine

# Session agent pods
kubectl get pods -n srvthreds -l app.kubernetes.io/name=srvthreds-session-agent

# Persistence agent pods
kubectl get pods -n srvthreds -l app.kubernetes.io/name=srvthreds-persistence-agent
```

---

## Viewing Logs

### Basic Log Commands

```bash
# Last 50 lines from a pod
kubectl logs -n srvthreds <pod-name> --tail=50

# Last 100 lines
kubectl logs -n srvthreds <pod-name> --tail=100

# All logs from pod
kubectl logs -n srvthreds <pod-name>

# Logs from previous crashed container
kubectl logs -n srvthreds <pod-name> --previous
```

### Follow Logs in Real-Time

```bash
# Stream logs (like tail -f)
kubectl logs -n srvthreds <pod-name> -f

# Stream last 20 lines then follow
kubectl logs -n srvthreds <pod-name> --tail=20 -f
```

### Logs by Service Label

```bash
# Engine logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine --tail=50

# Session agent logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-session-agent --tail=50

# Persistence agent logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-persistence-agent --tail=50

# Follow engine logs
kubectl logs -n srvthreds -l app.kubernetes.io/name=srvthreds-engine -f
```

### Filter Logs with grep

```bash
# Filter for errors
kubectl logs -n srvthreds <pod-name> --tail=100 | grep -i error

# Filter for MongoDB connections
kubectl logs -n srvthreds <pod-name> --tail=100 | grep -i mongo

# Filter for specific pattern
kubectl logs -n srvthreds <pod-name> --tail=100 | grep "pattern.*loaded"

# Multiple filters
kubectl logs -n srvthreds <pod-name> --tail=200 | grep -E "error|warning|failed"
```

### Logs with Timestamps

```bash
# Show timestamps
kubectl logs -n srvthreds <pod-name> --tail=50 --timestamps

# Logs since specific time
kubectl logs -n srvthreds <pod-name> --since=1h

# Logs since 30 minutes ago
kubectl logs -n srvthreds <pod-name> --since=30m
```

---

## Executing Commands Inside Pods

### Interactive Shell Access

```bash
# Get shell in pod
kubectl exec -n srvthreds <pod-name> -it -- /bin/sh

# Or bash if available
kubectl exec -n srvthreds <pod-name> -it -- /bin/bash
```

### One-off Commands

```bash
# Check environment variables
kubectl exec -n srvthreds <pod-name> -- env

# Filter for specific env vars
kubectl exec -n srvthreds <pod-name> -- env | grep -E "MONGO|REDIS|RABBITMQ"

# List files
kubectl exec -n srvthreds <pod-name> -- ls -la /app

# Check Node.js process
kubectl exec -n srvthreds <pod-name> -- ps aux

# Check network connections
kubectl exec -n srvthreds <pod-name> -- netstat -an

# Test DNS resolution
kubectl exec -n srvthreds <pod-name> -- nslookup google.com
```

### Check Connectivity from Pod

```bash
# Test MongoDB connection
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 27017

# Test Redis connection
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 6379

# Test RabbitMQ connection
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 5672

# Make HTTP request
kubectl exec -n srvthreds <pod-name> -- wget -O- http://localhost:3000/health
```

### Inspect Application Files

```bash
# View config file
kubectl exec -n srvthreds <pod-name> -- cat /app/config/config.json

# Check package.json
kubectl exec -n srvthreds <pod-name> -- cat /app/package.json

# List source files
kubectl exec -n srvthreds <pod-name> -- ls -la /app/src
```

---

## Database Debugging

### MongoDB

```bash
# Check MongoDB connection from pod
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 27017

# View MongoDB logs (from Docker host)
docker logs mongo-repl-1 --tail=50

# Follow MongoDB logs
docker logs mongo-repl-1 -f

# Check replica set status
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status()"

# Check if primary exists
docker exec mongo-repl-1 mongosh --quiet --eval "rs.status().members.filter(m => m.stateStr === 'PRIMARY')"

# List databases
docker exec mongo-repl-1 mongosh --quiet --eval "show dbs"

# Interactive MongoDB shell
docker exec -it mongo-repl-1 mongosh
```

### Redis

```bash
# Check Redis connection from pod
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 6379

# View Redis logs
docker logs redis --tail=50

# Follow Redis logs
docker logs redis -f

# Test Redis connection
docker exec redis redis-cli ping

# Get Redis info
docker exec redis redis-cli info

# Monitor Redis commands in real-time
docker exec redis redis-cli monitor

# Check Redis memory usage
docker exec redis redis-cli info memory

# List all keys (use carefully in production)
docker exec redis redis-cli keys '*'

# Interactive Redis CLI
docker exec -it redis redis-cli
```

### RabbitMQ

```bash
# Check RabbitMQ connection from pod
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 5672

# View RabbitMQ logs
docker logs rabbitmq --tail=50

# Follow RabbitMQ logs
docker logs rabbitmq -f

# List queues
docker exec rabbitmq rabbitmqctl list_queues

# List exchanges
docker exec rabbitmq rabbitmqctl list_exchanges

# List connections
docker exec rabbitmq rabbitmqctl list_connections

# Check cluster status
docker exec rabbitmq rabbitmqctl cluster_status

# RabbitMQ Management UI
open http://localhost:15672
# Default credentials: guest/guest
```

---

## Network Debugging

### Pod-to-Pod Communication

```bash
# Get pod IPs
kubectl get pods -n srvthreds -o wide

# Test connectivity to another pod
kubectl exec -n srvthreds <source-pod> -- nc -zv <target-pod-ip> <port>

# Test service connectivity
kubectl exec -n srvthreds <pod-name> -- nc -zv srvthreds-engine 3000
```

### Service Inspection

```bash
# List all services
kubectl get svc -n srvthreds

# Describe service
kubectl describe svc -n srvthreds srvthreds-engine

# Get service endpoints
kubectl get endpoints -n srvthreds

# Test service from inside pod
kubectl exec -n srvthreds <pod-name> -- wget -O- http://srvthreds-engine:3000/health
```

### DNS Debugging

```bash
# Test DNS resolution
kubectl exec -n srvthreds <pod-name> -- nslookup srvthreds-engine

# Test full DNS name
kubectl exec -n srvthreds <pod-name> -- nslookup srvthreds-engine.srvthreds.svc.cluster.local

# Check /etc/resolv.conf
kubectl exec -n srvthreds <pod-name> -- cat /etc/resolv.conf
```

### Port Forwarding for Local Access

```bash
# Forward pod port to local machine
kubectl port-forward -n srvthreds <pod-name> 3000:3000

# Forward service port
kubectl port-forward -n srvthreds svc/srvthreds-engine 3000:3000

# Access in browser or curl
curl http://localhost:3000/health
```

---

## Resource Inspection

### CPU and Memory Usage

```bash
# Resource usage for all pods
kubectl top pods -n srvthreds

# Resource usage for specific pod
kubectl top pod -n srvthreds <pod-name>

# Node resource usage
kubectl top nodes
```

### Events and Diagnostics

```bash
# Recent events in namespace
kubectl get events -n srvthreds --sort-by='.lastTimestamp'

# Last 20 events
kubectl get events -n srvthreds --sort-by='.lastTimestamp' | tail -20

# Events for specific pod
kubectl get events -n srvthreds --field-selector involvedObject.name=<pod-name>

# Watch events in real-time
kubectl get events -n srvthreds --watch
```

### Container Restart Information

```bash
# Check restart counts
kubectl get pods -n srvthreds -o custom-columns=NAME:.metadata.name,RESTARTS:.status.containerStatuses[*].restartCount

# Check why pod restarted
kubectl describe pod -n srvthreds <pod-name> | grep -A 10 "Last State"
```

---

## Useful One-Liners

```bash
# Get all pod names
kubectl get pods -n srvthreds -o jsonpath='{.items[*].metadata.name}'

# Get all pod IPs
kubectl get pods -n srvthreds -o jsonpath='{.items[*].status.podIP}'

# Find pods not running
kubectl get pods -n srvthreds --field-selector=status.phase!=Running

# Get pod by partial name
kubectl get pods -n srvthreds | grep engine

# Count pods by status
kubectl get pods -n srvthreds --no-headers | awk '{print $3}' | sort | uniq -c

# Get logs from all pods with label
kubectl logs -n srvthreds -l app.kubernetes.io/part-of=srvthreds --tail=10 --prefix

# Delete and recreate pod (deployment will recreate)
kubectl delete pod -n srvthreds <pod-name>

# Restart deployment (zero-downtime)
kubectl rollout restart deployment/<deployment-name> -n srvthreds
```

---

## Quick Debugging Workflow

When debugging issues, follow this workflow:

```bash
# 1. Check pod status
kubectl get pods -n srvthreds

# 2. If pod is not Running, describe it
kubectl describe pod -n srvthreds <pod-name>

# 3. Check recent logs
kubectl logs -n srvthreds <pod-name> --tail=50

# 4. Check previous logs if pod restarted
kubectl logs -n srvthreds <pod-name> --previous --tail=50

# 5. Check environment variables
kubectl exec -n srvthreds <pod-name> -- env | grep -E "MONGO|REDIS|RABBITMQ"

# 6. Test database connectivity
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 27017
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 6379
kubectl exec -n srvthreds <pod-name> -- nc -zv host.docker.internal 5672

# 7. Check database logs
docker logs mongo-repl-1 --tail=50
docker logs redis --tail=50
docker logs rabbitmq --tail=50

# 8. Check events
kubectl get events -n srvthreds --sort-by='.lastTimestamp' | tail -20
```

---

## SSH into Minikube Node

Sometimes you need to access the Minikube VM itself:

```bash
# SSH into Minikube node
minikube ssh

# Once inside, you can:
# - View docker containers running in Minikube
docker ps

# - Check system logs
journalctl -u kubelet -f

# - Check disk space
df -h

# - Exit
exit
```

---

## Pro Tips

1. **Use aliases** for frequently used commands:
   ```bash
   alias k='kubectl'
   alias kgp='kubectl get pods -n srvthreds'
   alias kl='kubectl logs -n srvthreds'
   alias ke='kubectl exec -n srvthreds'
   ```

2. **Use stern** for better log viewing (multi-pod):
   ```bash
   # Install: brew install stern
   stern -n srvthreds srvthreds-engine
   ```

3. **Use k9s** for interactive cluster management:
   ```bash
   # Install: brew install k9s
   k9s -n srvthreds
   ```

4. **Save common commands** in a shell script for quick access

5. **Use `--previous`** flag when debugging crash loops to see what happened before restart

6. **Set default namespace** to avoid typing `-n srvthreds` every time:
   ```bash
   kubectl config set-context --current --namespace=srvthreds
   ```
