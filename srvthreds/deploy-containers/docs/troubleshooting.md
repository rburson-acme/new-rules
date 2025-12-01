# Troubleshooting Guide

Common issues and solutions for Docker container deployment.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Container Issues](#container-issues)
- [Database Problems](#database-problems)
- [Build Failures](#build-failures)
- [Network Issues](#network-issues)
- [Performance Problems](#performance-problems)
- [Data Issues](#data-issues)

## Quick Diagnostics

### Run Basic Health Checks

```bash
# Check Docker daemon
docker ps
docker info

# Check container status
docker ps -a | grep srvthreds
docker ps -a | grep mongo
docker ps -a | grep redis
docker ps -a | grep rabbitmq

# Check container health
docker inspect mongo-repl-1 --format='{{.State.Health.Status}}'
docker inspect srvthreds-engine --format='{{.State.Status}}'

# Check logs for errors
docker logs srvthreds-engine --tail 50
docker logs mongo-repl-1 --tail 50

# Check network
docker network ls | grep srvthreds
docker network inspect srvthreds-net
```

### System Resource Check

```bash
# Check Docker resource usage
docker stats --no-stream

# Check available disk space
df -h

# Check available memory
free -h  # Linux
vm_stat  # macOS
```

## Container Issues

### Container Won't Start

**Symptom**: Container immediately exits after starting

**Diagnosis**:
```bash
# Check exit code and error
docker ps -a | grep <container-name>
docker logs <container-name>
docker inspect <container-name> --format='{{.State.ExitCode}}'
```

**Common Causes**:

1. **Missing Dependencies**
   - **Error**: "Cannot find module" or "MODULE_NOT_FOUND"
   - **Solution**:
     ```bash
     # Rebuild with no cache
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder
     ```

2. **Port Already in Use**
   - **Error**: "address already in use" or "bind: address already in use"
   - **Solution**:
     ```bash
     # Find process using the port
     lsof -i :8082  # macOS/Linux
     netstat -ano | findstr :8082  # Windows

     # Kill the process or change port in docker-compose.yml
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml down
     # Edit docker-compose-services.yml to change ports
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml up -d
     ```

3. **Database Connection Failure**
   - **Error**: "connection refused", "ECONNREFUSED", "MongoNetworkError"
   - **Solution**:
     ```bash
     # Ensure databases are running and healthy
     docker ps | grep mongo
     docker logs mongo-repl-1 --tail 20

     # Check if MongoDB replica set is initialized
     docker exec -it mongo-repl-1 mongosh --eval "rs.status()"

     # Re-initialize replica set if needed
     ./deploy-containers/local/docker/scripts/setup-repl.sh
     ```

4. **Environment Variable Missing**
   - **Error**: "JWT_SECRET is not defined" or similar
   - **Solution**:
     ```bash
     # Check environment variables in container
     docker exec srvthreds-engine env | grep MONGO

     # Verify .env file was copied during build
     docker exec srvthreds-engine ls -la /app/dist-server/.env

     # Rebuild if needed
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder
     ```

### Container Restarts Continuously

**Symptom**: Container keeps restarting (CrashLoopBackOff)

**Diagnosis**:
```bash
# Watch restart count
docker ps -a | grep <container-name>

# Check recent logs
docker logs <container-name> --tail 100
```

**Solutions**:

1. **Application Error**
   - Check logs for uncaught exceptions
   - Fix application code
   - Rebuild and redeploy

2. **Health Check Failing**
   - **Temporary Fix**: Remove healthcheck
     ```yaml
     # In docker-compose-services.yml, comment out:
     # healthcheck:
     #   test: ...
     ```
   - **Permanent Fix**: Fix the underlying issue causing health check failure

3. **Insufficient Resources**
   - **Solution**:
     ```bash
     # Check resource usage
     docker stats

     # Increase Docker Desktop resources:
     # Docker Desktop → Preferences → Resources
     # Increase Memory to 4GB+
     # Increase CPUs to 2+
     ```

### Container Stuck in "Starting" State

**Symptom**: Container shows as "starting" for a long time

**Diagnosis**:
```bash
# Check if waiting for dependencies
docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml ps

# Check logs
docker logs srvthreds-bootstrap -f
```

**Solutions**:

1. **Waiting for Dependencies**
   - Check if bootstrap is waiting for databases
   - Ensure all database containers are healthy
   - Verify network connectivity between containers

2. **Long Initialization**
   - Bootstrap may take 1-2 minutes on first run
   - Wait for completion before starting other services

3. **Stuck Process**
   - **Solution**:
     ```bash
     # Force stop and restart
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml down
     docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml up -d --wait
     ```

## Database Problems

### MongoDB Issues

#### Replica Set Not Initialized

**Symptom**: "not master and slaveOk=false" or "no primary found"

**Solution**:
```bash
# Check replica set status
docker exec -it mongo-repl-1 mongosh --eval "rs.status()"

# If not initialized, run setup script
./deploy-containers/local/docker/scripts/setup-repl.sh

# Verify initialization
docker exec -it mongo-repl-1 mongosh --eval "rs.status().members"
# Should show one member in PRIMARY state
```

#### Connection Refused

**Symptom**: "MongoNetworkError: connect ECONNREFUSED"

**Diagnosis**:
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Check MongoDB logs
docker logs mongo-repl-1 --tail 50

# Test connection from host
docker exec -it mongo-repl-1 mongosh --eval "db.adminCommand('ping')"
```

**Solutions**:

1. **Container Not Running**:
   ```bash
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d mongo-repl-1
   ```

2. **Wrong Connection String**:
   - From containers: Use `mongo-repl-1:27017`
   - From host: Use `localhost:27017`

3. **Network Issue**:
   ```bash
   # Verify container is on correct network
   docker inspect mongo-repl-1 --format='{{range .NetworkSettings.Networks}}{{.NetworkID}}{{end}}'

   # Recreate network if needed
   docker network rm srvthreds-net
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d
   ```

#### Data Corruption

**Symptom**: MongoDB won't start, logs show WiredTiger errors

**Solution**:
```bash
# Stop MongoDB
docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml down

# Backup corrupted data
mv deploy-containers/local/docker/compose/.docker/mongodb deploy-containers/local/docker/compose/.docker/mongodb.backup

# Start fresh
docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d mongo-repl-1
./deploy-containers/local/docker/scripts/setup-repl.sh

# Re-bootstrap data
docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml up srvthreds-bootstrap
```

### Redis Issues

#### Connection Refused

**Diagnosis**:
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec -it redis redis-cli PING
# Should return: PONG
```

**Solution**:
```bash
# Restart Redis
docker restart redis

# Check logs
docker logs redis --tail 50
```

#### Memory Issues

**Symptom**: Redis logs show "OOM" errors

**Solution**:
```bash
# Check memory usage
docker exec redis redis-cli INFO memory

# Clear cache if needed
docker exec redis redis-cli FLUSHALL

# Increase Docker memory allocation
# Docker Desktop → Preferences → Resources → Memory
```

### RabbitMQ Issues

#### Management UI Not Accessible

**Symptom**: Cannot access http://localhost:15672

**Diagnosis**:
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check if port is exposed
docker port rabbitmq
```

**Solution**:
```bash
# Restart RabbitMQ
docker restart rabbitmq

# Wait 30 seconds for startup
sleep 30

# Try accessing again
open http://localhost:15672
```

#### Queue Backlog

**Symptom**: Messages piling up in queues

**Diagnosis**:
- Open http://localhost:15672
- Login with guest/guest
- Check Queues tab for message counts

**Solutions**:

1. **Consumers Not Running**:
   ```bash
   # Check if agents are running
   docker ps | grep agent

   # Restart agents
   docker restart srvthreds-session-agent srvthreds-persistence-agent
   ```

2. **Purge Queue** (Development Only):
   ```bash
   # Via management UI: Queues → Select Queue → Purge

   # Via CLI:
   docker exec rabbitmq rabbitmqctl purge_queue <queue-name>
   ```

## Build Failures

### Docker Build Fails

#### Out of Disk Space

**Symptom**: "no space left on device"

**Solution**:
```bash
# Check disk usage
df -h

# Clean Docker cache
docker system prune -a --volumes

# Remove old images
docker image prune -a

# Check Docker disk usage
docker system df
```

#### Build Context Too Large

**Symptom**: Build hangs when "Sending build context to Docker daemon"

**Solution**:
```bash
# Check .dockerignore exists
cat deploy-containers/local/docker/dockerfiles/Dockerfile.builder.dockerignore

# Ensure node_modules is ignored
# Add to .dockerignore if needed:
echo "node_modules" >> .dockerignore
echo "dist-server" >> .dockerignore
```

#### npm Install Fails

**Symptom**: "ENOTFOUND", "ETIMEDOUT", or "ECONNREFUSED" during npm install

**Solutions**:

1. **Network Issue**:
   ```bash
   # Check internet connection
   curl -I https://registry.npmjs.org

   # Retry build with no cache
   docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder
   ```

2. **Package Lock Issue**:
   ```bash
   # Delete and regenerate
   rm package-lock.json
   npm install

   # Rebuild
   docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder
   ```

#### TypeScript Compilation Errors

**Symptom**: Build fails during TypeScript compilation

**Solution**:
```bash
# Check errors locally first
npm run check

# Fix TypeScript errors in source code
# Then rebuild
docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder
```

## Network Issues

### Cannot Connect Between Containers

**Symptom**: Service can't reach another service by container name

**Diagnosis**:
```bash
# Check all containers are on same network
docker network inspect srvthreds-net

# Test connectivity
docker exec srvthreds-engine ping mongo-repl-1
docker exec srvthreds-engine nc -zv redis 6379
```

**Solutions**:

1. **Network Not Created**:
   ```bash
   # Create network manually
   docker network create srvthreds-net

   # Restart services
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml down
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d
   ```

2. **Wrong Network Configuration**:
   - Verify [docker-compose-db.yml](../local/docker/compose/docker-compose-db.yml) creates network
   - Verify [docker-compose-services.yml](../local/docker/compose/docker-compose-services.yml) uses `external: true`

3. **DNS Issue**:
   ```bash
   # Use IP address instead of name temporarily
   docker inspect mongo-repl-1 --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'

   # Update connection string to use IP
   # This is a workaround - fix DNS properly
   ```

### Host Cannot Connect to Containers

**Symptom**: Cannot access services from host via localhost

**Diagnosis**:
```bash
# Check port mappings
docker ps

# Check if port is listening
lsof -i :27017  # macOS/Linux
netstat -ano | findstr :27017  # Windows
```

**Solutions**:

1. **Port Not Exposed**:
   - Add ports to docker-compose.yml
   ```yaml
   ports:
     - "8082:8082"
   ```

2. **Firewall Blocking**:
   - Check firewall settings
   - Allow Docker Desktop through firewall

3. **Wrong IP Address**:
   - Use `localhost`, not container name
   - Use `127.0.0.1` if localhost doesn't work

## Performance Problems

### Slow Container Startup

**Symptom**: Containers take minutes to start

**Solutions**:

1. **Increase Resources**:
   - Docker Desktop → Preferences → Resources
   - Increase CPUs to 4+
   - Increase Memory to 8GB+

2. **Disable Unnecessary Services**:
   ```bash
   # Start only what you need
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d mongo-repl-1 redis
   ```

3. **Use Host Development**:
   ```bash
   # Keep databases in Docker, run app on host
   docker compose -f deploy-containers/local/docker/compose/docker-compose-db.yml up -d
   npm run start-dev
   ```

### Slow Build Times

**Symptom**: Docker build takes 10+ minutes

**Solutions**:

1. **Use BuildKit**:
   ```bash
   # Enable BuildKit for faster builds
   export DOCKER_BUILDKIT=1
   docker compose build
   ```

2. **Layer Caching**:
   ```bash
   # Build incrementally, not with --no-cache
   docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml build srvthreds-builder
   ```

3. **Optimize Dockerfile**:
   - COPY package.json before source code
   - Use .dockerignore to exclude unnecessary files

### High CPU/Memory Usage

**Symptom**: Docker consumes excessive resources

**Diagnosis**:
```bash
# Check resource usage by container
docker stats

# Check Docker Desktop settings
# Preferences → Resources
```

**Solutions**:

1. **Set Resource Limits**:
   ```yaml
   services:
     srvthreds-engine:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

2. **Reduce Logging**:
   ```yaml
   logging:
     driver: "json-file"
     options:
       max-size: "10m"
       max-file: "3"
   ```

3. **Stop Unused Containers**:
   ```bash
   docker stop $(docker ps -aq)
   docker system prune
   ```

## Data Issues

### Bootstrap Fails

**Symptom**: Bootstrap container exits with error

**Diagnosis**:
```bash
# Check bootstrap logs
docker logs srvthreds-bootstrap

# Common issues:
# - Database not ready
# - Pattern validation errors
# - Missing configuration files
```

**Solutions**:

1. **Database Not Ready**:
   ```bash
   # Wait for databases to be healthy
   docker ps
   # All databases should show "healthy" status

   # Manually run bootstrap after databases ready
   docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml up srvthreds-bootstrap
   ```

2. **Pattern Errors**:
   - Check logs for validation errors
   - Fix pattern JSON files
   - Validate against schema
   - Re-run bootstrap

3. **Wrong Profile**:
   ```bash
   # Specify correct profile
   docker compose -f deploy-containers/local/docker/compose/docker-compose-services.yml run srvthreds-bootstrap npm run bootstrap -- -p dev
   ```

### Data Not Persisting

**Symptom**: Data lost after container restart

**Diagnosis**:
```bash
# Check volumes are mounted
docker inspect mongo-repl-1 --format='{{range .Mounts}}{{.Source}}:{{.Destination}}{{end}}'

# Check volume data exists
ls -la deploy-containers/local/docker/compose/.docker/mongodb/data/db
```

**Solutions**:

1. **Volume Not Mounted**:
   - Verify volumes section in docker-compose.yml
   - Ensure relative paths are correct
   - Recreate containers with volumes

2. **Permissions Issue**:
   ```bash
   # Fix permissions on volume directory
   sudo chown -R $(id -u):$(id -g) deploy-containers/local/docker/compose/.docker
   ```

3. **Using Named Volumes vs Bind Mounts**:
   - Current setup uses bind mounts (paths)
   - Named volumes would be `mongodb-data:/data/db`

### Cannot Access Data from Host

**Symptom**: Can't query MongoDB/Redis from host tools

**Solutions**:

1. **Use Container CLI**:
   ```bash
   # MongoDB
   docker exec -it mongo-repl-1 mongosh

   # Redis
   docker exec -it redis redis-cli
   ```

2. **Install Tools on Host**:
   ```bash
   # MongoDB Compass: https://www.mongodb.com/products/compass
   # Connection: mongodb://localhost:27017/?directConnection=true

   # Redis Desktop Manager: https://resp.app/
   # Connection: localhost:6379
   ```

## Getting More Help

### Collect Diagnostic Information

```bash
# Create diagnostics bundle
mkdir -p diagnostics
docker ps -a > diagnostics/containers.txt
docker network ls > diagnostics/networks.txt
docker logs srvthreds-engine > diagnostics/engine.log 2>&1
docker logs mongo-repl-1 > diagnostics/mongo.log 2>&1
docker stats --no-stream > diagnostics/stats.txt
docker system df > diagnostics/disk.txt
tar -czf diagnostics.tar.gz diagnostics/
```

### Check Documentation

- [Getting Started Guide](getting-started.md)
- [Architecture Documentation](architecture.md)
- [Configuration Reference](configuration.md)
- [Deployment CLI Guide](deployment-cli.md)

### Reset Everything

If all else fails, complete reset:

```bash
# WARNING: This deletes all data
cd deploy-containers/local/docker/compose

# Stop and remove everything
docker compose -f docker-compose-services.yml down -v --rmi local
docker compose -f docker-compose-db.yml down -v

# Remove data directories
rm -rf .docker/

# Remove network
docker network rm srvthreds-net

# Clean Docker system
docker system prune -a --volumes

# Start fresh
docker compose -f docker-compose-db.yml up -d --wait
./deploy-containers/local/docker/scripts/setup-repl.sh
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder
docker compose -f docker-compose-services.yml up -d --wait
```

## Prevention

### Best Practices

1. **Monitor Resources**: Regularly check `docker stats`
2. **Review Logs**: Check logs daily for warnings
3. **Update Regularly**: Keep Docker Desktop updated
4. **Clean Periodically**: Run `docker system prune` weekly
5. **Backup Data**: Backup volumes before major changes
6. **Test Locally**: Verify changes work before committing
7. **Use Version Control**: Track configuration changes in git

### Common Mistakes to Avoid

1. Don't run `docker compose down -v` unless you want to delete data
2. Don't ignore healthcheck failures
3. Don't skip the replica set initialization for MongoDB
4. Don't commit .env files with secrets
5. Don't run production with default passwords
6. Don't skip reading error messages in logs
7. Don't modify running containers directly - make changes in compose files
