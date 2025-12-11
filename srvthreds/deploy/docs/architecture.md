# Container Architecture

Technical architecture documentation for SrvThreds container deployment.

## Table of Contents

- [Overview](#overview)
- [Container Architecture](#container-architecture)
- [Build System](#build-system)
- [Networking](#networking)
- [Data Persistence](#data-persistence)
- [Security](#security)
- [Scaling Considerations](#scaling-considerations)

## Overview

SrvThreds uses a microservices architecture deployed via Docker containers. The system separates infrastructure services (databases, queues) from application services (engine, agents) to enable independent scaling and maintenance.

### Architecture Principles

1. **Separation of Concerns**: Databases, queues, and application logic in separate containers
2. **Multi-Stage Builds**: Optimized build process with cached builder image
3. **Service Discovery**: Container networking enables services to find each other by name
4. **Stateless Services**: Application containers are stateless; state lives in databases
5. **Health Monitoring**: Built-in healthchecks for automatic restart and monitoring

## Container Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Engine         │  Session Agent  │  Persistence Agent      │
│  (Port 8082)    │  (Ports 3000-1) │                         │
│  Event Processor│  User Sessions  │  Data Persistence       │
└─────────────────┴─────────────────┴─────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
├─────────────────┬─────────────────┬─────────────────────────┤
│  MongoDB        │  Redis          │  RabbitMQ               │
│  (Port 27017)   │  (Port 6379)    │  (Ports 5672, 15672)    │
│  Document Store │  Cache/Pub-Sub  │  Message Queue          │
└─────────────────┴─────────────────┴─────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Network Layer                           │
│              srvthreds-net (Bridge Network)                  │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Persistence Layer                         │
├─────────────────┬─────────────────┬─────────────────────────┤
│  MongoDB Volume │  Redis Volume   │  RabbitMQ Volume        │
│  (.docker/      │  (.docker/      │  (.docker/rabbitmq/)    │
│   mongodb/)     │   redis-data/)  │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Container Descriptions

#### Infrastructure Containers

**mongo-repl-1**
- **Image**: `mongo:latest`
- **Purpose**: Primary MongoDB instance with replica set support
- **Configuration**:
  - Replica set name: `rs0`
  - Single-node replica set for local development
  - Bind to all interfaces (`--bind_ip_all`)
- **Volumes**: Persistent data in `.docker/mongodb/data/db`
- **Healthcheck**: mongosh ping every 10s
- **Startup**: 30s grace period for initialization

**redis**
- **Image**: `redis:latest`
- **Purpose**: In-memory cache, session storage, pub/sub messaging
- **Configuration**:
  - RDB persistence (--save 20 1: snapshot every 20 seconds if at least 1 key changed)
  - Keyspace notifications enabled (KA)
  - Warning level logging
- **Volumes**: Persistent data in `.docker/redis-data`
- **Port**: 6379

**rabbitmq**
- **Image**: `rabbitmq:3-management`
- **Purpose**: Message queue for inter-service communication
- **Features**:
  - AMQP protocol (port 5672)
  - Management UI (port 15672)
  - Automatic queue/exchange creation via Rascal config
- **Volumes**:
  - Data: `.docker/rabbitmq/data`
  - Logs: `.docker/rabbitmq/logs`
- **Credentials**: guest/guest (default)

#### Application Containers

**srvthreds-builder** (Manual Profile)
- **Purpose**: Build-time container for compiling code
- **Build Process**:
  1. Copies thredlib and srvthreds source
  2. Builds thredlib dependency
  3. Compiles TypeScript to JavaScript
  4. Creates dist-server directory
  5. Copies run-profiles and .env
- **Usage**: Serves as base image for other services
- **Not Running**: Only used during build, not deployed

**srvthreds-bootstrap**
- **Base**: srvthreds-builder
- **Purpose**: One-time initialization of databases
- **Restart Policy**: `no` (runs once)
- **Actions**:
  - Loads patterns from run-profiles
  - Creates sessions and participant groups
  - Initializes MongoDB collections
  - Sets up initial data
- **Profile**: Configurable via command args (default: ef-detection)

**srvthreds-engine**
- **Base**: Production-optimized from builder
- **Purpose**: Core event processing engine
- **Entry Point**: `node dist-server/src/ts/index.js -d`
- **Functionality**:
  - Event ingestion from queues
  - Pattern matching for unbound events
  - Thred orchestration with per-thredId locking
  - State machine processing
  - Message publication
- **Port**: 8082 (HTTP/WebSocket endpoints if configured)
- **Dependencies**: Waits for bootstrap completion

**srvthreds-session-agent**
- **Base**: Production-optimized from builder
- **Purpose**: Session and participant management
- **Entry Point**: `node dist-server/src/ts/agent/agent.js -c session_agent -i org.wt.session1`
- **Functionality**:
  - User session lifecycle
  - WebSocket connection management
  - Participant interaction handling
  - Message routing to participants
- **Ports**:
  - 3000: WebSocket connections
  - 3001: HTTP API
- **Dependencies**: Waits for bootstrap completion

**srvthreds-persistence-agent**
- **Base**: Production-optimized from builder
- **Purpose**: Data persistence operations
- **Entry Point**: `node dist-server/src/ts/agent/agent.js -c persistence_agent -i org.wt.persistence1`
- **Functionality**:
  - Process persistence tasks from events
  - Execute database operations (CRUD)
  - Translate generic operators to MongoDB syntax
  - Return results via message queue
- **Dependencies**: Waits for bootstrap completion

## Build System

### Multi-Stage Build Strategy

The deployment uses a sophisticated multi-stage build to optimize for both build speed and production image size.

#### Stage 1: Builder Image (Dockerfile.builder)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy both repositories
COPY --from=thredlib . ./thredlib/
COPY . ./srvthreds/

# Build thredlib
WORKDIR /app/thredlib
RUN npm ci && npm run build-all

# Build srvthreds
WORKDIR /app/srvthreds
RUN npm ci && npm run build

# Copy runtime configs
COPY run-profiles/ ./dist-server/run-profiles/
COPY deploy/tools/deployment-cli/assets/*.* ./dist-server/
```

**Purpose**: Contains all build artifacts
**Size**: Large (~1-2GB) - includes dev dependencies
**Caching**: Highly cacheable, rebuilt only on source changes

#### Stage 2: Production Image (Dockerfile)

```dockerfile
FROM srvthreds-builder AS builder
FROM node:20-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copy only built artifacts from builder
COPY --from=builder /app/srvthreds/dist-server ./dist-server

# Security: non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S srvthreds -u 1001 -G nodejs
USER srvthreds
```

**Purpose**: Optimized runtime container
**Size**: Small (~200-300MB) - production dependencies only
**Security**: Runs as non-root user

#### Stage 3: Command Runner (Dockerfile.cmdRunner)

```dockerfile
ARG BUILDER_IMAGE=srvthreds/builder:latest
FROM ${BUILDER_IMAGE}
WORKDIR /app/srvthreds
CMD ["npm", "run", "bootstrap", "--", "-p", "dev"]
```

**Purpose**: Utility container for running commands
**Use Case**: Bootstrap, migrations, one-off tasks
**Advantage**: Has full dev environment from builder
**Note**: The default CMD uses `dev` profile, but docker-compose-services.yml overrides this with `ef-detection` profile

### Build Optimization

**Cache Layers**:
1. Base OS layer (node:20-alpine) - almost never changes
2. Package.json dependencies - changes occasionally
3. Source code - changes frequently
4. Built artifacts - derived from source

**Build Speed**:
- First build: 3-5 minutes (no cache)
- Subsequent builds: 30-60 seconds (with cache)
- Code-only changes: 10-20 seconds (leverages builder cache)

**Rebuild Triggers**:
- Source code changes → Rebuild builder + services
- Package.json changes → Rebuild dependencies + builder + services
- Config changes → Rebuild services only (if in run-profiles)
- Environment changes → Restart services only

## Networking

### Network Configuration

**Network Name**: `srvthreds-net`
**Type**: Bridge network
**Driver**: bridge

#### Network Creation

```yaml
# In docker-compose-db.yml
networks:
  srvthreds-net:
    driver: bridge
    name: srvthreds-net

# In docker-compose-services.yml
networks:
  srvthreds-net:
    external: true  # Joins existing network
```

### Service Discovery

Services communicate using container names as hostnames:

**From Application Containers**:
- MongoDB: `mongo-repl-1:27017`
- Redis: `redis:6379`
- RabbitMQ: `rabbitmq:5672` (AMQP), `rabbitmq:15672` (Management)

**From Host Machine**:
- MongoDB: `localhost:27017` (port forwarded)
- Redis: `localhost:6379` (port forwarded)
- RabbitMQ: `localhost:5672`, `localhost:15672` (port forwarded)

### Port Mapping

| Service              | Container Port | Host Port | Protocol |
|----------------------|----------------|-----------|----------|
| MongoDB              | 27017          | 27017     | TCP      |
| Redis                | 6379           | 6379      | TCP      |
| RabbitMQ AMQP        | 5672           | 5672      | AMQP     |
| RabbitMQ Management  | 15672          | 15672     | HTTP     |
| Engine               | 8082           | 8082      | HTTP/WS  |
| Session Agent        | 3000           | 3000      | WebSocket|
| Session Agent API    | 3001           | 3001      | HTTP     |

### Network Isolation

- **Internal Communication**: Services communicate via bridge network (fast, secure)
- **External Access**: Only specified ports exposed to host
- **Isolation**: Containers cannot access host network or other Docker networks
- **DNS**: Docker provides built-in DNS for container name resolution

## Data Persistence

### Volume Strategy

**Persistent Volumes**: Database data survives container restarts
**Ephemeral Storage**: Application containers are stateless

### Volume Locations

#### MongoDB Volume
```yaml
volumes:
  - ./.docker/mongodb/data/db:/data/db
```

**Contents**:
- WiredTiger storage files
- Journal for crash recovery
- Replica set metadata
- Database collections and indexes

**Backup**: Copy entire `.docker/mongodb/data/db` directory

#### Redis Volume
```yaml
volumes:
  - ./.docker/redis-data:/data
```

**Contents**:
- RDB snapshot files (if configured)
- AOF append-only file
- Temporary files

**Backup**: `docker exec redis redis-cli BGSAVE`

#### RabbitMQ Volumes
```yaml
volumes:
  - ./.docker/rabbitmq/data:/var/lib/rabbitmq
  - ./.docker/rabbitmq/logs:/var/log/rabbitmq
```

**Contents**:
- Mnesia database (queue/exchange metadata)
- Persistent messages
- User/permission configuration
- Logs

### Data Lifecycle

**During Development**:
1. Start containers → Load data from volumes
2. Modify data via application
3. Stop containers → Data persists in volumes
4. Restart containers → Previous data available

**Clean Slate**:
```bash
# Remove volumes to reset databases
docker compose down -v
```

**Volume Backup**:
```bash
# Create backup
tar -czf backup.tar.gz deploy/local/docker/compose/.docker/

# Restore backup
tar -xzf backup.tar.gz
```

## Security

### Container Security

**Non-Root User**:
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S srvthreds -u 1001 -G nodejs
USER srvthreds
```

**Benefits**:
- Limited permissions inside container
- Cannot modify system files
- Reduces attack surface

### Network Security

**Bridge Network Isolation**:
- Containers isolated from host network
- No direct container-to-container access outside network
- Port exposure controlled explicitly

**Internal Communication**:
- Services communicate on private bridge network
- No TLS required for internal traffic (trusted network)
- Production deployments should add TLS

### Secrets Management

**Current Approach** (Development):
- Environment variables in docker-compose
- Default credentials for databases
- `.env` files for configuration

**Production Recommendations**:
- Use Docker secrets
- External secret management (Vault, AWS Secrets Manager)
- Rotate credentials regularly
- Don't commit secrets to git

### Healthchecks

**Purpose**: Detect unhealthy containers

**MongoDB Healthcheck**:
```yaml
healthcheck:
  test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/admin --quiet
  interval: 10s
  timeout: 10s
  retries: 5
  start_period: 30s
```

**Application Healthcheck**:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "console.log('Health check')" || exit 1
```

## Scaling Considerations

### Horizontal Scaling

**Stateless Services** (Can Scale):
- srvthreds-engine
- srvthreds-session-agent
- srvthreds-persistence-agent

**Stateful Services** (Cannot Scale Simply):
- MongoDB (requires replica set configuration)
- Redis (requires cluster mode)
- RabbitMQ (requires clustering)

### Scaling Application Services

```yaml
# In docker-compose-services.yml
services:
  srvthreds-engine:
    deploy:
      replicas: 3  # Run 3 instances
```

**Considerations**:
- Load balancing needed for external traffic
- Each instance connects to same databases
- RabbitMQ distributes messages across instances
- Per-thredId locking ensures consistency

### Resource Limits

**Development** (Current):
- No resource limits
- Uses available host resources

**Production** (Recommended):
```yaml
services:
  srvthreds-engine:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Database Scaling

**MongoDB Replica Set**:
- Current: Single-node for development
- Production: 3-node replica set for HA
- Requires updating connection string and removing `directConnection=true`

**Redis Cluster**:
- Current: Single instance
- Production: Redis Cluster or Sentinel for HA
- Application code may need updates

**RabbitMQ Cluster**:
- Current: Single broker
- Production: 3-node cluster for HA
- Update connection URLs to all nodes

## Container Orchestration

### Current: Docker Compose

**Advantages**:
- Simple local development
- Easy to understand
- Fast startup
- Low overhead

**Limitations**:
- Single-host only
- Manual scaling
- No automatic failover
- Limited monitoring

### Future: Kubernetes

For production deployments, consider Kubernetes:

**Benefits**:
- Multi-host orchestration
- Automatic scaling
- Self-healing
- Service mesh capabilities
- Rich ecosystem

**Migration Path**:
1. Use same container images
2. Convert docker-compose to Kubernetes manifests
3. Add Ingress for external access
4. Configure persistent volume claims
5. Set up monitoring and logging

## Monitoring and Observability

### Current Capabilities

**Logs**:
```bash
# View all logs
docker compose logs -f

# Service-specific
docker logs -f srvthreds-engine
```

**Container Status**:
```bash
# List containers
docker ps

# Inspect health
docker inspect srvthreds-engine --format='{{.State.Health.Status}}'
```

### Production Recommendations

**Centralized Logging**:
- Use log aggregation (ELK, Loki, CloudWatch)
- Structured JSON logging
- Log retention policies

**Metrics**:
- Prometheus for metrics collection
- Grafana for visualization
- Custom application metrics

**Tracing**:
- Distributed tracing (Jaeger, Zipkin)
- Request correlation IDs
- Performance profiling

**Alerting**:
- Alert on container restarts
- Database connection failures
- Message queue backlogs
- Resource exhaustion

## Summary

The container architecture provides:

1. **Separation**: Infrastructure and application layers
2. **Efficiency**: Multi-stage builds with caching
3. **Isolation**: Network and process isolation
4. **Persistence**: Volumes for data durability
5. **Scalability**: Horizontal scaling ready
6. **Security**: Non-root users, network isolation
7. **Observability**: Healthchecks and logging

For production deployments, add:
- TLS/SSL encryption
- Secret management
- High availability configurations
- Resource limits and quotas
- Centralized monitoring
- Backup and disaster recovery
