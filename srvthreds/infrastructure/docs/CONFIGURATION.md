# Infrastructure Configuration Guide

This guide explains how to configure SrvThreds for different deployment environments: local development, Docker Compose, Kubernetes/Minikube, and production.

## Overview

SrvThreds uses environment variables for all external service connections, making it portable across different deployment environments. The configuration system supports:

- **MongoDB**: Database persistence
- **Redis**: Caching and distributed locking
- **RabbitMQ**: Message queue for inter-service communication

**Related Documentation:**
- [Test Configuration Guide](../../src/test/README.md) - Test-specific configuration
- [Developer Deployment Patterns](./DEVELOPER-DEPLOYMENT-PATTERNS.md) - Common development scenarios
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment

## Environment Variable Substitution

All JSON configuration files support environment variable substitution using the syntax:

```
${VARIABLE_NAME||default_value}
```

**Examples:**
- `${MONGO_HOST||localhost:27017}` - Uses `MONGO_HOST` env var, falls back to `localhost:27017`
- `${REDIS_HOST}` - Uses `REDIS_HOST` env var, empty string if not set

This substitution is handled automatically by `ConfigLoader.ts` when loading config files.

## Deployment Scenarios

### 1. Local Development (Native)

**Scenario:** Running the application directly on your development machine (not in Docker).

**Setup:**
```bash
# Copy the local environment template
cp .env.local.example .env

# Edit .env and set your values
# Default values work if services are running locally
```

**Default Connection Strings:**
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- RabbitMQ: `localhost`

**Starting Services:**
```bash
# Option 1: Run services locally
brew install mongodb-community redis rabbitmq

# Option 2: Run only databases in Docker, app on host
npm run deploy-local-databases

# Start your application
npm run start-dev
```

### 2. Docker Compose

**Scenario:** Running all services (databases + application) in Docker containers.

**Setup:**
```bash
# Copy the Docker environment template
cp .env.docker.example .env

# Edit .env and set service names from docker-compose files
```

**Connection Strings for Docker:**
- MongoDB: `mongo-repl-1:27017`
- Redis: `redis:6379`
- RabbitMQ: `rabbitmq`

**Network Configuration:**
All services run on the `srvthreds-net` bridge network, enabling service-to-service communication using container names.

**Starting Services:**
```bash
# Start all (databases + services)
npm run deploy-local-up-all

# Or start databases and services separately:
npm run deploy-local-databases
npm run deploy-local-services
```

**Environment Variables in docker-compose-services.yml:**
```yaml
environment:
  - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
  - REDIS_HOST=${REDIS_HOST:-redis:6379}
  - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
```

### 3. Kubernetes / Minikube

**Scenario:** Running in a Kubernetes cluster (local or cloud).

**Setup:**
```bash
# Copy the Kubernetes environment template
cp .env.k8s.example .env
```

**Connection Strings for Kubernetes:**
- MongoDB: `mongodb-service:27017`
- Redis: `redis-service:6379`
- RabbitMQ: `rabbitmq-service`

**ConfigMap Example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: srvthreds-config
data:
  MONGO_HOST: "mongodb-service:27017"
  REDIS_HOST: "redis-service:6379"
  RABBITMQ_HOST: "rabbitmq-service"
  NODE_ENV: "production"
```

**Deployment Example:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: srvthreds-engine
spec:
  template:
    spec:
      containers:
      - name: engine
        image: srvthreds-engine:latest
        envFrom:
        - configMapRef:
            name: srvthreds-config
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: srvthreds-secrets
              key: jwt-secret
```

**Service Discovery:**
In Kubernetes, services communicate using the fully qualified domain name (FQDN):
```
<service-name>.<namespace>.svc.cluster.local:<port>
```

For same-namespace communication, short names work:
```
<service-name>:<port>
```

### 4. Production

**Scenario:** Production deployment (cloud-hosted databases, managed services).

**Connection Strings:**
Use fully qualified hostnames or connection strings:
- MongoDB: `mongodb.production.example.com:27017` or MongoDB Atlas connection string
- Redis: `redis.production.example.com:6379` or managed Redis URL
- RabbitMQ: `rabbitmq.production.example.com`

**Security Best Practices:**
1. **Never commit secrets to version control**
2. Use secret management systems (Kubernetes Secrets, AWS Secrets Manager, etc.)
3. Enable TLS/SSL for all connections
4. Use authentication for all services
5. Restrict network access with firewalls/security groups

**Example with MongoDB Atlas:**
```bash
MONGO_HOST="cluster0.mongodb.net:27017/mydb?retryWrites=true&w=majority"
```

## Configuration Files

### Run Profiles

Configuration files are organized by deployment profile:

```
run-profiles/
├── dev/
│   └── run-config/
│       ├── engine.json
│       ├── rascal_config.json      # RabbitMQ config
│       ├── resolver_config.json
│       └── session_agent.json
└── ef-detection/
    └── run-config/
        └── ... (same structure)
```

### Key Configuration Files

#### rascal_config.json
Configures RabbitMQ connection and message routing:

```json
{
  "vhosts": {
    "/": {
      "connection": {
        "url": "amqp://guest:guest@${RABBITMQ_HOST||localhost}"
      },
      "exchanges": { ... },
      "queues": { ... }
    }
  }
}
```

#### Code-Level Configuration

**RedisStorage.ts:**
```typescript
constructor(hostString?: string) {
  const _host = hostString || process.env.REDIS_HOST || RedisStorage.DEFAULT_HOST;
  this.client = createClient({
    url: `redis://${_host}`,
    socket: { reconnectStrategy: (retries) => Math.min(retries * 50, 2000) }
  });
}
```

**MongoPersistenceProvider.ts:**
```typescript
constructor(hostString?: string, config?: { connectOptions?: MongoClientOptions }) {
  const _host = hostString || process.env.MONGO_HOST || MongoPersistenceProvider.DEFAULT_HOST;
  this.client = new MongoClient(`mongodb://${_host}/?replicaSet=rs0`, config?.connectOptions);
}
```

## Troubleshooting

### Connection Issues

**Problem:** Services can't connect to databases

**Solutions:**
1. Check environment variables are set correctly
2. Verify network connectivity (ping service names in Docker)
3. Check service logs: `docker logs <container-name>`
4. Verify services are on the same Docker network
5. Check firewall rules (especially in Kubernetes)

**Docker Network Debug:**
```bash
# Check if containers are on the same network
docker network inspect srvthreds-net

# Test connectivity from inside a container
docker exec -it srvthreds-engine ping redis
docker exec -it srvthreds-engine ping mongo-repl-1
docker exec -it srvthreds-engine ping rabbitmq
```

### Environment Variable Issues

**Problem:** Config not picking up environment variables

**Solutions:**
1. Ensure `.env` file is in the project root
2. Check syntax in JSON config files (must be valid JSON after substitution)
3. Verify Docker Compose reads the `.env` file
4. In Kubernetes, check ConfigMap is mounted correctly

**Debug environment variables:**
```bash
# In Docker
docker exec srvthreds-engine env | grep -E "MONGO|REDIS|RABBITMQ"

# In Kubernetes
kubectl exec -it <pod-name> -- env | grep -E "MONGO|REDIS|RABBITMQ"
```

### MongoDB Replica Set

**Problem:** MongoDB connection fails with replica set error

**Solution:** MongoDB needs to be initialized as a replica set:
```bash
# Run the setup script
./infrastructure/local/scripts/setup-repl.sh

# Or manually
docker exec mongo-repl-1 mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo-repl-1:27017' }] })"
```

## Migration Guide

### From Host Networking to Bridge Networking

If you're migrating from `network_mode: "host"` to bridge networking:

1. Update `.env` file with service names instead of `localhost`
2. Ensure all services are on the `srvthreds-net` network
3. Update any hardcoded `localhost` references in config files
4. Test connectivity between services

### Adding New Services

When adding a new external service:

1. Add environment variable to `.env` example files
2. Update connection code to read from environment variable
3. Add default value as fallback
4. Update this documentation
5. Update docker-compose files with the new variable

## Reference

### Environment Variables

| Variable | Description | Local Default | Docker Default | K8s Default |
|----------|-------------|---------------|----------------|-------------|
| `MONGO_HOST` | MongoDB connection string | `localhost:27017` | `mongo-repl-1:27017` | `mongodb-service:27017` |
| `MONGO_DIRECT_CONNECTION` | MongoDB direct connection mode | `true` | `true` | `false` |
| `REDIS_HOST` | Redis connection string | `localhost:6379` | `redis:6379` | `redis-service:6379` |
| `RABBITMQ_HOST` | RabbitMQ hostname | `localhost` | `rabbitmq` | `rabbitmq-service` |
| `NODE_ENV` | Node environment | `development` | `development` | `production` |
| `JWT_SECRET` | JWT signing secret | (required) | (required) | (from Secret) |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | (required) | (required) | (from Secret) |

**MongoDB Connection Modes:**

- `MONGO_DIRECT_CONNECTION=true`: Direct connection to a single MongoDB instance. Required for:
  - Local development with single-node replica sets
  - Testing environments
  - Docker Compose with single MongoDB container

- `MONGO_DIRECT_CONNECTION=false`: Replica set discovery mode. Required for:
  - Production multi-node replica sets
  - Kubernetes StatefulSet deployments
  - MongoDB clusters with multiple replicas

See the [Test Configuration Guide](../../src/test/README.md#mongodb-connection-configuration) for detailed explanation.

### Docker Compose Commands

**Using the Deployment CLI (Recommended):**
```bash
# Start all services (databases + application)
npm run deploy-local-up-all

# Start only databases
npm run deploy-local-databases

# Start only services
npm run deploy-local-services

# Stop all
npm run deploy-local-down-all

# View available deployments
npm run deploymentCli
```

**Environment-Specific Deployments:**

The deployment system supports environment-specific command overrides. When deploying to different environments (local, dev, staging, production), you can configure different pre-build and post-deployment commands. See the [Deployment CLI README](README.md#environment-specific-command-overrides) for details.

**Manual Docker Compose Commands:**
```bash
cd infrastructure/local/compose

# Start all services
docker compose -f docker-compose-db.yml -f docker-compose-services.yml up -d

# Start only databases
docker compose -f docker-compose-db.yml up -d

# Stop and remove all containers
docker compose -f docker-compose-db.yml -f docker-compose-services.yml down

# Stop and remove volumes (WARNING: deletes data)
docker compose -f docker-compose-db.yml -f docker-compose-services.yml down -v

# View logs
docker compose -f docker-compose-services.yml logs -f srvthreds-engine

# Restart a specific service
docker compose -f docker-compose-services.yml restart srvthreds-engine
```

### Kubernetes Commands

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Secrets
kubectl apply -f k8s/secrets.yaml

# Deploy services
kubectl apply -f k8s/

# Check pod status
kubectl get pods

# View logs
kubectl logs -f <pod-name>

# Get service endpoints
kubectl get endpoints

# Port forwarding for debugging
kubectl port-forward svc/srvthreds-engine 3000:3000
```

## Additional Resources

- [Docker Networking](https://docs.docker.com/network/)
- [Kubernetes Service Discovery](https://kubernetes.io/docs/concepts/services-networking/service/)
- [MongoDB Connection Strings](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Redis Configuration](https://redis.io/docs/management/config/)
- [RabbitMQ Configuration](https://www.rabbitmq.com/configure.html)
