# Configuration Reference

Complete reference for all configuration options in the deploy system.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Docker Compose Configuration](#docker-compose-configuration)
- [Deployment Configurations](#deployment-configurations)
- [Service Configuration](#service-configuration)
- [Volume Configuration](#volume-configuration)
- [Network Configuration](#network-configuration)

## Environment Variables

### Application Environment Files

Two environment file templates are provided for different deployment scenarios.

#### .env.docker

Used when all services run in Docker containers. Contains development secrets for local Docker deployments.

**Location**: `deploy/local/configs/.env.docker`

```bash
NODE_ENV=development
LOG_LEVEL=debug

# JWT Configuration (development secrets pre-configured)
JWT_SECRET=<dev-secret>              # Pre-populated for development
JWT_EXPIRE_TIME=1h                   # Token expiration duration
REFRESH_TOKEN_SECRET=<dev-secret>    # Pre-populated for development
REFRESH_TOKEN_EXPIRE_TIME=7d         # Refresh token expiration

# Remote Agent Authentication (optional, for remote agent connections)
AUTH_TOKEN=                          # Token to connect to session service
AUTHORIZED_TOKENS=                   # Comma-separated allowed tokens
ROBOT_AGENT_AUTH_TOKEN=<dev-token>   # Pre-configured robot agent token
ROBOT_AGENT_AUTHORIZED_TOKENS=

# Database Configuration
MONGO_HOST=localhost:27017           # Uses localhost (port-forwarded from Docker)
MONGO_DIRECT_CONNECTION=true         # Required for single-node replica sets

# Cache and Storage
REDIS_HOST=localhost:6379            # Uses localhost (port-forwarded from Docker)

# Message Queue
RABBITMQ_HOST=localhost              # Uses localhost (port-forwarded from Docker)
```

**Note**: The .env.docker file uses `localhost` addresses because Docker Compose sets container-specific environment variables with defaults that override these when running inside containers (e.g., `MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}`).

**Usage**: Automatically copied to builder image during Docker builds.

#### .env.local.example

Used when application runs on host machine with databases in Docker.

**Location**: `deploy/local/configs/.env.local.example`

```bash
# JWT Configuration
JWT_SECRET=                          # Required in production
JWT_EXPIRE_TIME=1h
REFRESH_TOKEN_SECRET=                # Required in production
REFRESH_TOKEN_EXPIRE_TIME=7d

# Database Configuration
MONGO_HOST=localhost:27017           # Use localhost from host machine
MONGO_DIRECT_CONNECTION=true

# Cache and Storage
REDIS_HOST=localhost:6379            # Use localhost from host machine

# Message Queue
RABBITMQ_HOST=localhost              # Use localhost from host machine
```

**Usage**: Copy to project root as `.env` for local development:
```bash
cp deploy/local/configs/.env.local.example .env
```

### Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | Production | None | Secret key for JWT token signing. Generate with `openssl rand -base64 32` |
| `JWT_EXPIRE_TIME` | No | 1h | JWT token expiration time (e.g., 1h, 30m, 7d) |
| `REFRESH_TOKEN_SECRET` | Production | None | Secret key for refresh tokens. Should differ from JWT_SECRET |
| `REFRESH_TOKEN_EXPIRE_TIME` | No | 7d | Refresh token expiration duration |
| `NODE_ENV` | No | development | Runtime environment (development/production) |
| `MONGO_HOST` | Yes | localhost:27017 | MongoDB connection host:port |
| `MONGO_DIRECT_CONNECTION` | Single-node | true | Required for single-node replica sets |
| `REDIS_HOST` | Yes | localhost:6379 | Redis connection host:port |
| `RABBITMQ_HOST` | Yes | localhost | RabbitMQ hostname (port 5672 implicit) |

### Docker Compose Environment Variables

Environment variables set in docker-compose files:

```yaml
environment:
  - NODE_ENV=development
  - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
  - REDIS_HOST=${REDIS_HOST:-redis:6379}
  - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
```

**Syntax**: `${VAR:-default}` uses environment variable `VAR` if set, otherwise uses `default` value.

## Docker Compose Configuration

### docker-compose-db.yml

Database infrastructure services configuration.

**Location**: `deploy/local/docker/compose/docker-compose-db.yml`

**Note**: These compose files are manually maintained and can be edited directly.

#### MongoDB Configuration

```yaml
mongo-repl-1:
  image: mongo:latest
  container_name: mongo-repl-1
  restart: unless-stopped
  networks:
    - srvthreds-net
  command:
    - mongod
    - '--replSet'
    - rs0                          # Replica set name
    - '--bind_ip_all'              # Accept connections from any IP
  environment:
    - MONGO_INITDB_DATABASE=admin
  ports:
    - '27017:27017'
  volumes:
    - ./.docker/mongodb/data/db:/data/db
  healthcheck:
    test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/admin --quiet
    interval: 10s
    timeout: 10s
    retries: 5
    start_period: 30s
```

**Customization Options**:

- **Replica Set Name**: Change `rs0` in command and setup script
- **Port**: Change `27017:27017` to `<host-port>:27017`
- **Volume**: Change `./.docker/mongodb/data/db` to different path
- **Memory**: Add `--wiredTigerCacheSizeGB=2` to command for custom cache size

#### Redis Configuration

```yaml
redis:
  image: redis:latest
  container_name: redis
  restart: unless-stopped
  networks:
    - srvthreds-net
  command:
    - redis-server
    - '--port'
    - '6379'
    - '--save'
    - '20'                         # Save every 20 seconds if 1 key changed
    - '1'
    - '--loglevel'
    - warning
    - '--notify-keyspace-events'
    - KA                           # Enable keyspace notifications
  ports:
    - '6379:6379'
  volumes:
    - ./.docker/redis-data:/data
```

**Customization Options**:

- **Persistence**: Change `--save 20 1` to adjust RDB snapshot frequency
- **Max Memory**: Add `--maxmemory 512mb` and `--maxmemory-policy allkeys-lru`
- **AOF**: Add `--appendonly yes` for append-only file persistence
- **Port**: Change `6379:6379` to different port

#### RabbitMQ Configuration

```yaml
rabbitmq:
  image: rabbitmq:3-management
  container_name: rabbitmq
  restart: unless-stopped
  networks:
    - srvthreds-net
  ports:
    - '5672:5672'                  # AMQP protocol
    - '15672:15672'                # Management UI
  volumes:
    - ./.docker/rabbitmq/data:/var/lib/rabbitmq
    - ./.docker/rabbitmq/logs:/var/log/rabbitmq
```

**Customization Options**:

- **Default User**: Add environment variables:
  ```yaml
  environment:
    - RABBITMQ_DEFAULT_USER=admin
    - RABBITMQ_DEFAULT_PASS=secure_password
  ```
- **Plugins**: Add:
  ```yaml
  environment:
    - RABBITMQ_PLUGINS=rabbitmq_management,rabbitmq_shovel
  ```
- **Memory Limit**: Add:
  ```yaml
  environment:
    - RABBITMQ_VM_MEMORY_HIGH_WATERMARK=512MB
  ```

### docker-compose-services.yml

Application services configuration.

**Location**: `deploy/local/docker/compose/docker-compose-services.yml`

**Note**: These compose files are manually maintained and can be edited directly.

#### Builder Service (Manual Profile)

```yaml
srvthreds-builder:
  image: srvthreds/builder:latest
  build:
    context: ../../../../
    dockerfile: deploy/local/docker/dockerfiles/Dockerfile.builder
    additional_contexts:
      thredlib: ../../../../../thredlib
  profiles:
    - manual                       # Not started automatically
```

**Purpose**: Build-time container, manually built before other services.

#### Bootstrap Service

```yaml
srvthreds-bootstrap:
  image: srvthreds/bootstrap:latest
  container_name: srvthreds-bootstrap
  restart: 'no'                    # Run once only
  networks:
    - srvthreds-net
  entrypoint:
    - npm
  command:
    - run
    - bootstrap
    - '--'
    - '-p'
    - ef-detection                 # Profile name
  environment:
    - NODE_ENV=development
    - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
    - REDIS_HOST=${REDIS_HOST:-redis:6379}
    - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
  build:
    context: ../../../../
    dockerfile: deploy/local/docker/dockerfiles/Dockerfile.cmdRunner
    additional_contexts:
      thredlib: ../../../../../thredlib
    args:
      BUILDER_IMAGE: srvthreds/builder:latest
```

**Customization**:
- Change profile: Modify `ef-detection` to `dev` or `test`
- Add arguments: Add to command array

#### Engine Service

```yaml
srvthreds-engine:
  image: srvthreds/engine:latest
  container_name: srvthreds-engine
  restart: unless-stopped
  networks:
    - srvthreds-net
  entrypoint:
    - node
  command:
    - dist-server/src/ts/index.js
    - '-d'                         # Debug flag
  environment:
    - NODE_ENV=development
    - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
    - REDIS_HOST=${REDIS_HOST:-redis:6379}
    - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
  ports:
    - '8082:8082'
  build:
    context: ../../../../
    dockerfile: deploy/local/docker/dockerfiles/Dockerfile
    additional_contexts:
      thredlib: ../../../../../thredlib
    args:
      BUILDER_IMAGE: srvthreds/builder:latest
  depends_on:
    srvthreds-bootstrap:
      condition: service_completed_successfully
```

**Customization**:
- **Port**: Change `8082:8082` to different port
- **Debug Mode**: Remove `-d` flag for production
- **Replicas**: Add `deploy.replicas: 3` for horizontal scaling
- **Resources**: Add resource limits (see architecture.md)

#### Session Agent Service

```yaml
srvthreds-session-agent:
  image: srvthreds/session-agent:latest
  container_name: srvthreds-session-agent
  restart: unless-stopped
  networks:
    - srvthreds-net
  entrypoint:
    - node
  command:
    - dist-server/src/ts/agent/agent.js
    - '-c'
    - session_agent                # Config name
    - '-i'
    - org.wt.session1              # Node ID
    - '-d'
  environment:
    - NODE_ENV=development
    - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
    - REDIS_HOST=${REDIS_HOST:-redis:6379}
    - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
  ports:
    - '3000:3000'                  # WebSocket
    - '3001:3001'                  # HTTP API
  build:
    context: ../../../../
    dockerfile: deploy/local/docker/dockerfiles/Dockerfile
    additional_contexts:
      thredlib: ../../../../../thredlib
    args:
      BUILDER_IMAGE: srvthreds/builder:latest
  depends_on:
    srvthreds-bootstrap:
      condition: service_completed_successfully
```

**Customization**:
- **Config Name**: Change `session_agent` to different agent config
- **Node ID**: Change `org.wt.session1` for multiple instances
- **Ports**: Change WebSocket/API ports as needed

#### Persistence Agent Service

```yaml
srvthreds-persistence-agent:
  image: srvthreds/persistence-agent:latest
  container_name: srvthreds-persistence-agent
  restart: unless-stopped
  networks:
    - srvthreds-net
  entrypoint:
    - node
  command:
    - dist-server/src/ts/agent/agent.js
    - '-c'
    - persistence_agent            # Config name
    - '-i'
    - org.wt.persistence1          # Node ID
    - '-d'
  environment:
    - NODE_ENV=development
    - MONGO_HOST=${MONGO_HOST:-mongo-repl-1:27017}
    - REDIS_HOST=${REDIS_HOST:-redis:6379}
    - RABBITMQ_HOST=${RABBITMQ_HOST:-rabbitmq}
  build:
    context: ../../../../
    dockerfile: deploy/local/docker/dockerfiles/Dockerfile
    additional_contexts:
      thredlib: ../../../../../thredlib
    args:
      BUILDER_IMAGE: srvthreds/builder:latest
  depends_on:
    srvthreds-bootstrap:
      condition: service_completed_successfully
```

## Deployment Configurations

Deployment configurations define how to start, stop, and manage services using the deployment CLI.

### Database Deployments

**Location**: `deploy/shared/configs/deployments/databases.json`

```json
{
  "deployments": [
    {
      "name": "Start Databases",
      "shortName": "s_a_dbs",
      "description": "Starts the database containers (Mongo, Redis, RabbitMQ).",
      "environments": ["local"],
      "target": {
        "type": "docker-compose",
        "composing": "databases",
        "deployCommand": "up",
        "composeFile": "docker-compose-db.yml",
        "defaultArgs": "-d --wait",
        "environmentOverrides": {
          "local": {
            "postUpCommands": [
              {
                "description": "Setting up MongoDB replica set...",
                "command": "deploy/local/docker/scripts/setup-repl.sh"
              }
            ]
          }
        }
      }
    }
  ]
}
```

**Fields**:
- `name`: Display name
- `shortName`: CLI shorthand
- `description`: Help text
- `environments`: Allowed deployment environments
- `target.composeFile`: Docker Compose file to use
- `target.deployCommand`: Docker Compose command (up/down)
- `target.defaultArgs`: Arguments passed to Docker Compose
- `environmentOverrides`: Environment-specific overrides

### Service Deployments

**Location**: `deploy/shared/configs/deployments/services.json`

Contains deployment definitions for:
- **Start Services** (s_a_s): Start all application services
- **Stop Services** (d_a_s): Stop all application services
- **Start All** (s_a_dbs_s): Start databases and services
- **Stop All** (d_a_dbs_s): Stop everything
- **Individual Services**: Start/stop specific services (engine, agents)

**Example - Start All**:

```json
{
  "name": "Start All",
  "shortName": "s_a_dbs_s",
  "description": "Starts all databases and application services.",
  "environments": ["local"],
  "target": {
    "composing": "all",
    "deployCommand": "up",
    "composeFiles": [
      {
        "composeFile": "docker-compose-db.yml",
        "defaultArgs": "-d --wait",
        "postUpCommands": [
          {
            "description": "Setting up MongoDB replica set...",
            "command": "chmod +x ./deploy/local/docker/scripts/setup-repl.sh && ./deploy/local/docker/scripts/setup-repl.sh"
          }
        ]
      },
      {
        "composeFile": "docker-compose-services.yml",
        "defaultArgs": "-d --wait",
        "preBuildCommands": [
          {
            "description": "Building base builder image...",
            "command": "docker compose -f deploy/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder"
          }
        ]
      }
    ]
  }
}
```

**Advanced Fields**:
- `composeFiles`: Array of compose files for sequential deployment
- `preBuildCommands`: Commands run before docker compose
- `postUpCommands`: Commands run after successful deployment
- `skipBuild`: Skip building images (default: false)

## Service Configuration

### Agent Configuration Files

Agent configurations define microservice behavior and are loaded at runtime.

**Location**: Project root `run-profiles/<profile>/agents/`

**Example**: `session_agent.config.json`

```json
{
  "configName": "session_agent",
  "nodeId": "org.wt.session",
  "adapters": ["SessionAdapter"],
  "messageQueue": {
    "enabled": true,
    "publications": ["session.events"],
    "subscriptions": ["session.commands"]
  }
}
```

**Fields**:
- `configName`: Configuration identifier
- `nodeId`: Unique node identifier for routing
- `adapters`: List of adapter classes to load
- `messageQueue`: RabbitMQ configuration

### Rascal Configuration

Message queue topology configuration.

**Location**: `run-profiles/<profile>/rascal_config.json`

Defines:
- Exchanges and bindings
- Queue configurations
- Publications (outbound)
- Subscriptions (inbound)
- Connection pools

See RabbitMQ/Rascal documentation for detailed configuration options.

### Resolver Configuration

Address resolution for routing messages to participants.

**Location**: `run-profiles/<profile>/resolver_config.json`

Maps participant IDs and groups to connection endpoints.

## Volume Configuration

### Bind Mounts vs Named Volumes

Current configuration uses **bind mounts** (host paths):

```yaml
volumes:
  - ./.docker/mongodb/data/db:/data/db
```

**Advantages**:
- Easy to locate and backup
- Can inspect data from host
- Portable across environments

**Alternative - Named Volumes**:

```yaml
volumes:
  - mongodb-data:/data/db

volumes:
  mongodb-data:
    driver: local
```

**Advantages**:
- Better performance on macOS/Windows
- Managed by Docker
- Easier to migrate

### Volume Locations

Default locations for bind mounts:

| Service | Host Path | Container Path |
|---------|-----------|----------------|
| MongoDB | `./.docker/mongodb/data/db` | `/data/db` |
| Redis | `./.docker/redis-data` | `/data` |
| RabbitMQ Data | `./.docker/rabbitmq/data` | `/var/lib/rabbitmq` |
| RabbitMQ Logs | `./.docker/rabbitmq/logs` | `/var/log/rabbitmq` |

**Note**: Paths are relative to `deploy/local/docker/compose/` directory.

### Volume Backup

```bash
# Backup MongoDB
cd deploy/local/docker/compose
tar -czf mongodb-backup-$(date +%Y%m%d).tar.gz .docker/mongodb/

# Restore MongoDB
tar -xzf mongodb-backup-20231201.tar.gz
```

## Network Configuration

### Bridge Network

```yaml
networks:
  srvthreds-net:
    driver: bridge
    name: srvthreds-net
```

**Configuration Options**:

```yaml
networks:
  srvthreds-net:
    driver: bridge
    name: srvthreds-net
    ipam:
      config:
        - subnet: 172.28.0.0/16        # Custom subnet
          gateway: 172.28.0.1           # Custom gateway
    driver_opts:
      com.docker.network.bridge.name: srvthreds0
```

### Service Network Assignment

```yaml
services:
  service-name:
    networks:
      - srvthreds-net
```

**Multiple Networks**:

```yaml
services:
  service-name:
    networks:
      - srvthreds-net
      - external-net
```

## Advanced Configuration

### Resource Limits

```yaml
services:
  srvthreds-engine:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Logging Configuration

```yaml
services:
  srvthreds-engine:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=engine"
```

### Health Check Customization

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8082/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### Build Arguments

```yaml
build:
  args:
    NODE_VERSION: "20.10.0"
    BUILD_ENV: "production"
```

## Configuration Best Practices

1. **Environment Variables**: Use environment-specific .env files
2. **Secrets**: Never commit secrets to git
3. **Defaults**: Provide sensible defaults with `${VAR:-default}`
4. **Documentation**: Comment complex configurations
5. **Validation**: Test configuration changes in isolated environment
6. **Version Control**: Track all config files except .env
7. **Overrides**: Use environment overrides for environment-specific settings
8. **Profiles**: Use Docker profiles for optional services

## Configuration Validation

### Validate Docker Compose Syntax

```bash
# Check syntax
docker compose -f deploy/local/docker/compose/docker-compose-db.yml config

# Check without resolving environment variables
docker compose -f deploy/local/docker/compose/docker-compose-db.yml config --no-interpolate
```

### Validate Environment Variables

```bash
# Check if all required variables are set
docker compose -f deploy/local/docker/compose/docker-compose-services.yml config | grep -i "MONGO_HOST"
```

### Validate JSON Configuration

```bash
# Validate JSON syntax
cat deploy/shared/configs/deployments/services.json | jq empty

# Pretty print
cat deploy/shared/configs/deployments/services.json | jq '.'
```

## Migration Guide

### From Development to Production

1. **Create production .env**:
   - Generate secure secrets
   - Update hostnames for production
   - Set `NODE_ENV=production`

2. **Update docker-compose**:
   - Add resource limits
   - Configure logging
   - Enable security features
   - Remove debug flags

3. **Configure TLS**:
   - Add SSL certificates
   - Update connection strings
   - Configure secure protocols

4. **Update network**:
   - Consider overlay network for multi-host
   - Configure firewall rules
   - Set up load balancers

5. **Database configuration**:
   - Multi-node replica sets
   - Authentication enabled
   - Backup strategy configured
