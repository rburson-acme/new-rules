# Getting Started with Deploy Containers

Complete step-by-step guide to deploying SrvThreds with Docker containers.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [First-Time Setup](#first-time-setup)
- [Development Workflow](#development-workflow)
- [Verification](#verification)
- [Next Steps](#next-steps)

## Prerequisites

### Required Software

1. **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux)
   - Version 20.10 or later
   - Docker Compose V2 included
   - Download: https://www.docker.com/products/docker-desktop

2. **Node.js and npm**
   - Version 20 or later
   - Download: https://nodejs.org/

3. **Git**
   - For cloning the repository
   - Download: https://git-scm.com/

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 10GB free space minimum
- **OS**: macOS, Windows 10/11, or Linux
- **Network**: Internet connection for pulling Docker images

### Verify Installation

```bash
# Check Docker
docker --version
# Expected: Docker version 20.10.0 or higher

docker compose version
# Expected: Docker Compose version v2.0.0 or higher

# Check Node.js
node --version
# Expected: v20.0.0 or higher

npm --version
# Expected: 9.0.0 or higher
```

## Installation

### 1. Clone the Repository

```bash
# Clone with thredlib dependency
git clone https://github.com/yourusername/srvthreds.git
cd srvthreds

# Clone thredlib (sibling directory)
cd ..
git clone https://github.com/yourusername/thredlib.git
cd srvthreds
```

Your directory structure should be:
```
parent-directory/
├── srvthreds/
└── thredlib/
```

### 2. Install Dependencies

```bash
# Install srvthreds dependencies
npm install

# Build thredlib
cd ../thredlib
npm install
npm run build-all

# Return to srvthreds
cd ../srvthreds
```

## First-Time Setup

### Option A: Using NPM Scripts (Recommended)

Use npm scripts for easy container management.

#### 1. Start Database Services

```bash
npm run deploy-local-databases
```

This will:
- Start MongoDB replica set (mongo-repl-1)
- Start Redis cache server
- Start RabbitMQ message queue
- Initialize MongoDB replica set

**Wait for completion** (~30-60 seconds)

#### 2. Verify Databases Are Running

```bash
docker ps
```

You should see three containers:
- `mongo-repl-1` (healthy)
- `redis` (healthy)
- `rabbitmq` (healthy)

#### 3. Start Application Services

```bash
npm run deploy-local-services
```

This will:
- Build the builder image (first time: 3-5 minutes)
- Run bootstrap to initialize data
- Start engine, session-agent, persistence-agent

**First build takes longer** due to:
- Installing dependencies
- Compiling TypeScript
- Building thredlib

**Subsequent builds use cache** and are much faster.

#### 4. Monitor Startup

```bash
# Watch specific service
docker logs -f srvthreds-engine
docker logs -f srvthreds-session-agent

# Or navigate to compose directory for all logs
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml logs -f
```

Look for:
- Bootstrap completion messages
- "Engine started" from srvthreds-engine
- "Agent started" from session and persistence agents
- No error messages

### Option B: All-in-One

Start everything with a single command:

```bash
npm run deploy-local-up-all
```

This will:
1. Start all database containers
2. Initialize MongoDB replica set
3. Build application images
4. Run bootstrap
5. Start all application services

**Wait for completion** (~3-5 minutes first time, 30-60 seconds after)

## Development Workflow

### Daily Development

For active development, use the host-based development server instead of containers:

#### 1. Keep Databases Running in Docker

```bash
# If not already running
npm run deploy-local-databases
```

#### 2. Run Application on Host

```bash
# Copy local environment template
cp deploy/local/configs/.env.local.example .env

# Bootstrap data (one time)
npm run bootstrap -- -p dev

# Start development server with hot-reload
npm run start-dev
```

This approach provides:
- Hot-reload on code changes
- Faster iteration cycles
- Direct debugging access
- Full TypeScript support

#### 3. When to Use Full Docker

Use the full Docker setup when you need to:
- Test production build
- Verify container configurations
- Test multi-container networking
- Reproduce production-like environment

### Making Code Changes

#### If Changing Application Code

```bash
# Using host development (recommended)
# 1. Edit code in your editor
# 2. Save - hot reload automatically restarts
# 3. Test changes immediately

# Using Docker (slower iteration)
# 1. Edit code
# 2. Rebuild builder
docker compose -f deploy/local/docker/compose/docker-compose-services.yml build --no-cache srvthreds-builder

# 3. Restart services
npm run deploy-local-down-services
npm run deploy-local-services
```

#### If Changing thredlib

```bash
# 1. Make changes in ../thredlib/
# 2. Rebuild thredlib
cd ../thredlib
npm run build-all
cd ../srvthreds

# 3a. For host development
npm run start-dev  # Will use updated thredlib

# 3b. For Docker
# Must rebuild builder image
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder
npm run deploy-local-down-services
npm run deploy-local-services
```

#### If Changing Patterns or Configuration

```bash
# 1. Edit files in run-profiles/dev/ or run-profiles/ef-detection/

# 2. Re-run bootstrap
npm run bootstrap -- -p dev

# Or in Docker (navigate to compose directory):
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml up srvthreds-bootstrap
```

## Verification

### Check Container Status

```bash
# List all containers
docker ps

# Check specific service health
docker inspect srvthreds-engine --format='{{.State.Health.Status}}'
docker inspect mongo-repl-1 --format='{{.State.Health.Status}}'
```

All should show `healthy` or `running`.

### Test MongoDB

```bash
# Connect to MongoDB
docker exec -it mongo-repl-1 mongosh

# In mongosh:
rs.status()
# Should show PRIMARY state

show dbs
# Should list databases including your application DBs

use your_database_name
show collections
# Should show collections created by bootstrap

exit
```

### Test Redis

```bash
# Connect to Redis
docker exec -it redis redis-cli

# In redis-cli:
PING
# Should return: PONG

KEYS *
# Should show keys if any created

exit
```

### Test RabbitMQ

```bash
# Open management UI in browser
open http://localhost:15672

# Login credentials:
# Username: guest
# Password: guest

# Check:
# - Overview tab shows connections
# - Queues tab shows configured queues
# - Exchanges tab shows bindings
```

### Test Application Services

```bash
# Check engine logs
docker logs srvthreds-engine | tail -20

# Should show:
# - Successful startup
# - Connected to databases
# - Connected to message queues
# - No error messages

# Check session agent
docker logs srvthreds-session-agent | tail -20

# Check persistence agent
docker logs srvthreds-persistence-agent | tail -20
```

### Send Test Event (Optional)

If your application has REST endpoints configured:

```bash
# Example: Send test event to engine
curl -X POST http://localhost:8082/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test.event",
    "source": {"id": "test-client"},
    "data": {"message": "Hello SrvThreds"}
  }'

# Check logs for processing
docker logs srvthreds-engine -f
```

## Next Steps

### Learn More

- [Architecture Overview](architecture.md) - Understand system design
- [Configuration Reference](configuration.md) - Configure your deployment
- [Deployment CLI Guide](deployment-cli.md) - Master the CLI tool
- [Troubleshooting](troubleshooting.md) - Solve common issues

### Customize Your Deployment

1. **Create Custom Patterns**
   - Edit files in `run-profiles/dev/patterns/`
   - Re-run bootstrap to load them

2. **Configure Sessions**
   - Edit `run-profiles/dev/sessions/sessions_model.json`
   - Define participant groups

3. **Adjust Environment Variables**
   - Copy `.env.local.example` to `.env`
   - Modify as needed
   - Restart services

4. **Add Custom Agents**
   - See [AGENTS.md](../../AGENTS.md) for agent development
   - Add agent configuration
   - Update docker-compose-services.yml

### Development Best Practices

1. **Use host development for coding**
   - Faster iteration
   - Better debugging
   - Hot-reload support

2. **Use Docker for integration testing**
   - Test production build
   - Verify networking
   - Test full stack

3. **Keep databases in Docker**
   - Consistent environment
   - Easy cleanup
   - Isolated from host

4. **Monitor logs regularly**
   - Catch issues early
   - Understand event flow
   - Debug problems

5. **Clean up periodically**
   - Remove unused volumes
   - Prune build cache
   - Free disk space

## Quick Reference

### Start/Stop Commands

```bash
# Start databases only
npm run deploy-local-databases

# Stop databases
npm run deploy-local-down-databases

# Start services only
npm run deploy-local-services

# Stop services
npm run deploy-local-down-services

# Start everything
npm run deploy-local-up-all

# Stop everything
npm run deploy-local-down-all
```

### Common Operations

```bash
# View logs
docker logs -f srvthreds-engine

# Rebuild builder (navigate to compose directory)
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder

# Restart services
npm run deploy-local-down-services
npm run deploy-local-services

# Run bootstrap (navigate to compose directory)
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml up srvthreds-bootstrap

# Clean everything
npm run deploy-local-down-all
```

## Getting Help

If you encounter issues:

1. Check [troubleshooting.md](troubleshooting.md)
2. Review service logs
3. Verify prerequisites
4. Ensure sufficient system resources
5. Check Docker daemon is running

For detailed error solutions, see the troubleshooting guide.
