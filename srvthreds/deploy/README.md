# Deploy

Container deployment infrastructure for SrvThreds - an event-driven workflow automation system.

## Overview

This directory contains all Docker-based deployment configurations for running SrvThreds locally or in containerized environments. It supports deploying the full microservices stack including databases, message queues, and application services.

## Quick Start

### Prerequisites

- Docker Desktop or Docker Engine (20.10+)
- Docker Compose V2
- Node.js 20+ (for running deployment CLI)
- 4GB+ available RAM
- 10GB+ available disk space

### Start Everything (Databases + Services)

```bash
# Start all databases and services
npm run deploy-local-up-all
```

### Stop Everything

```bash
# Stop all databases and services
npm run deploy-local-down-all
```

### Individual Control

```bash
# Start only databases
npm run deploy-local-databases

# Stop databases
npm run deploy-local-down-databases

# Start only services
npm run deploy-local-services

# Stop services
npm run deploy-local-down-services
```

### Interactive Mode

For exploring all available deployment options:

```bash
# Interactive menu to select environment and deployment
npm run deploymentCli
```

This provides a numbered menu to choose from all available deployments. Useful for:
- Discovering available deployment options
- Running individual services
- One-off deployments not covered by the npm scripts above

## Directory Structure

```
deploy/
├── README.md                           # This file
├── docs/                               # Detailed documentation
│   ├── getting-started.md             # Step-by-step setup guide
│   ├── architecture.md                # System architecture overview
│   ├── configuration.md               # Configuration reference
│   ├── deployment-cli.md              # CLI usage guide
│   └── troubleshooting.md             # Common issues and solutions
├── local/                              # Local deployment configurations
│   ├── configs/                        # Environment configuration files
│   │   ├── .env.docker                # Docker container environment
│   │   └── .env.local.example         # Local development environment
│   └── docker/                         # Docker-specific files
│       ├── compose/                    # Docker Compose files
│       │   ├── docker-compose-db.yml  # Database services
│       │   └── docker-compose-services.yml  # Application services
│       ├── dockerfiles/                # Dockerfile definitions
│       │   ├── Dockerfile             # Production service image
│       │   ├── Dockerfile.builder     # Build stage image
│       │   └── Dockerfile.cmdRunner   # Bootstrap/utility image
│       └── scripts/                    # Setup and utility scripts
│           ├── setup-repl.sh          # MongoDB replica set init
│           └── validate.sh            # Deployment validation
├── shared/                             # Shared deployment configurations
│   └── configs/
│       └── deployments/               # Deployment definitions
│           ├── databases.json         # Database deployment configs
│           └── services.json          # Service deployment configs
└── tools/                              # Deployment automation tools
    └── deployment-cli/                # CLI deployment tool
        ├── cli.ts                     # CLI entry point
        ├── deployment.ts              # Deployment logic
        └── assets/                    # Build-time assets staging
```

## Services

### Database Services (docker-compose-db.yml)

- **MongoDB** (mongo-repl-1): Document database with replica set
  - Port: 27017
  - Volume: `.docker/mongodb/data/db`
  - Healthcheck included

- **Redis**: In-memory cache and pub/sub
  - Port: 6379
  - Volume: `.docker/redis-data`
  - Keyspace notifications enabled

- **RabbitMQ**: Message queue with management UI
  - AMQP Port: 5672
  - Management UI: 15672
  - Volumes: `.docker/rabbitmq/data`, `.docker/rabbitmq/logs`

### Application Services (docker-compose-services.yml)

- **srvthreds-builder**: Base build image (manual profile)
  - Multi-stage builder for thredlib + srvthreds
  - Cached for faster subsequent builds

- **srvthreds-bootstrap**: Database initialization
  - One-time container (restart: no)
  - Loads patterns, sessions, and configuration

- **srvthreds-engine**: Core event processing engine
  - Port: 8082
  - Entry point: `dist-server/src/ts/index.js`

- **srvthreds-session-agent**: Session management microservice
  - Ports: 3000, 3001
  - Entry point: `dist-server/src/ts/agent/agent.js -c session_agent -i org.wt.session1`

- **srvthreds-persistence-agent**: Data persistence microservice
  - Entry point: `dist-server/src/ts/agent/agent.js -c persistence_agent -i org.wt.persistence1`

## Deployment Modes

### 1. Local Development (Recommended for Development)
- Databases in Docker
- Application runs on host with `npm run start-dev`
- Fast iteration, hot-reload enabled
- Uses `.env.local.example` configuration

### 2. Full Docker (Recommended for Testing Production Build)
- Everything in containers
- Tests production build artifacts
- Uses `.env.docker` configuration
- Slower iteration but matches production

### 3. Hybrid (Individual Services)
- Start only specific services you need
- Useful for debugging single components
- Mix of Docker and host-based services

## Common Tasks

### View Logs

```bash
# Specific service
docker logs -f srvthreds-engine
docker logs -f srvthreds-session-agent
docker logs -f mongo-repl-1

# All services (navigate to compose directory)
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml logs -f
```

### Rebuild Services

```bash
# After code changes, navigate to compose directory
cd deploy/local/docker/compose

# Rebuild builder image
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder

# Restart services
npm run deploy-local-down-services
npm run deploy-local-services
```

### Access Service Shells

```bash
# MongoDB shell
docker exec -it mongo-repl-1 mongosh

# Redis CLI
docker exec -it redis redis-cli

# RabbitMQ management (browser)
open http://localhost:15672  # guest/guest

# Container shell
docker exec -it srvthreds-engine sh
```

### Clean Up Everything

```bash
# Remove all containers, volumes, and images
npm run deploy-local-down-all

# Remove build cache (if needed)
docker builder prune -a
```

## Environment Variables

Key environment variables used by containers:

- `NODE_ENV`: Environment mode (development/production)
- `MONGO_HOST`: MongoDB connection (mongo-repl-1:27017 for Docker, localhost:27017 for local)
- `REDIS_HOST`: Redis connection (redis:6379 for Docker, localhost:6379 for local)
- `RABBITMQ_HOST`: RabbitMQ connection (rabbitmq for Docker, localhost for local)
- `MONGO_DIRECT_CONNECTION`: Set to true for single-node replica sets

See [configuration.md](docs/configuration.md) for complete reference.

## Build Process

The deployment uses a multi-stage build process:

1. **Builder Stage** (Dockerfile.builder)
   - Builds thredlib dependency
   - Compiles TypeScript to JavaScript
   - Creates dist-server directory
   - Copies run-profiles and configuration

2. **Production Stage** (Dockerfile)
   - Copies artifacts from builder
   - Installs production dependencies only
   - Creates non-root user
   - Sets up healthchecks

3. **Command Runner** (Dockerfile.cmdRunner)
   - Extends builder image
   - Used for bootstrap and utility commands

## Network

All services use the `srvthreds-net` bridge network:
- Database services create the network
- Application services join as external
- Enables service discovery by container name

## Healthchecks

Services include healthcheck configurations:
- MongoDB: mongosh ping command (10s interval)
- Application services: Node.js healthcheck (30s interval)
- Startup grace period: 30-60s

## Documentation

For detailed information, see:

- [Getting Started Guide](docs/getting-started.md) - Step-by-step setup walkthrough
- [Architecture Overview](docs/architecture.md) - System design and components
- [Configuration Reference](docs/configuration.md) - All configuration options
- [Deployment CLI Guide](docs/deployment-cli.md) - Using the CLI tool
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## Related Documentation

- [Main Project README](../README.md)
- [Agent Documentation](../AGENTS.md)
- [Pattern Documentation](../docs/PATTERNS_AGENT.md)

## Support

For issues or questions:
1. Check [troubleshooting.md](docs/troubleshooting.md)
2. Review Docker logs
3. Verify prerequisites are installed
4. Ensure sufficient resources (RAM/disk)
