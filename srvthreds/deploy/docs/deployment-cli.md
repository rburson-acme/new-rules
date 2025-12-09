# Deployment Guide

Complete guide to deploying SrvThreds containers using npm scripts.

## Table of Contents

- [Overview](#overview)
- [Available NPM Scripts](#available-npm-scripts)
- [Common Workflows](#common-workflows)
- [What Each Script Does](#what-each-script-does)
- [Deployment CLI (Internal)](#deployment-cli-internal)
- [Troubleshooting](#troubleshooting)

## Overview

SrvThreds uses npm scripts as the primary interface for managing Docker container deployments. These scripts wrap an internal deployment CLI tool and provide a consistent, easy-to-use interface.

**Benefits of using npm scripts**:
- Consistent command interface
- Version controlled in package.json
- Environment-aware configurations
- Automated setup scripts (MongoDB replica set initialization)
- Pre/post deployment hooks
- Error handling and validation

## Available NPM Scripts

### All-in-One Deployment

```bash
# Start all databases and services
npm run deploy-local-up-all

# Stop all databases and services (WARNING: deletes data!)
npm run deploy-local-down-all
```

**Use when**:
- First-time setup
- Complete environment restart
- Testing full stack integration

**Time**: 3-5 minutes on first run, 30-60 seconds on subsequent runs

### Database Management

```bash
# Start database containers (MongoDB, Redis, RabbitMQ)
npm run deploy-local-databases

# Stop database containers and remove volumes (WARNING: deletes data!)
npm run deploy-local-down-databases
```

**Use when**:
- Running application on host (recommended for development)
- Need databases for testing
- Resetting database state

### Service Management

```bash
# Start application services (engine, agents)
npm run deploy-local-services

# Stop application services
npm run deploy-local-down-services
```

**Use when**:
- Testing production Docker builds
- Databases already running
- Rebuilding after code changes

## Common Workflows

### Daily Development (Recommended)

Keep databases in Docker, run application on host for fast iteration:

```bash
# One-time: Start databases
npm run deploy-local-databases

# One-time: Bootstrap data
npm run bootstrap -- -p dev

# Daily: Run dev server with hot-reload
npm run start-dev
```

**Advantages**:
- Hot-reload on code changes
- Faster iteration
- Direct debugging access
- Full TypeScript support

### Testing Production Build

Test the full containerized stack:

```bash
# Start everything
npm run deploy-local-up-all

# Monitor logs
docker logs -f srvthreds-engine

# When done, stop everything
npm run deploy-local-down-all
```

### After Code Changes

If testing Docker builds after changes:

```bash
# Stop services
npm run deploy-local-down-services

# Rebuild (navigate to compose directory)
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder

# Restart services
npm run deploy-local-services
```

### After thredlib Changes

When modifying the thredlib dependency:

```bash
# Rebuild thredlib
cd ../thredlib
npm run build-all
cd ../srvthreds

# If using Docker, rebuild builder image
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder

# Restart services
npm run deploy-local-down-services
npm run deploy-local-services

# If using host development, just restart
npm run start-dev
```

### Clean Slate Reset

Complete teardown and fresh start:

```bash
# WARNING: This deletes all data!
npm run deploy-local-down-all

# Wait for complete shutdown
sleep 5

# Fresh start
npm run deploy-local-up-all
```

## What Each Script Does

### deploy-local-up-all

**Executes**:
1. Starts database containers (MongoDB, Redis, RabbitMQ)
2. Waits for databases to be healthy
3. Initializes MongoDB replica set
4. Builds builder image (uses cache if available)
5. Runs bootstrap container to load initial data
6. Starts engine container
7. Starts session agent container
8. Starts persistence agent container
9. Waits for all services to be healthy

**Equivalent to**: `deploymentCli local s_a_dbs_s`

### deploy-local-down-all

**Executes**:
1. Stops all service containers
2. Removes service containers
3. Removes service images
4. Stops all database containers
5. Removes database containers
6. **Removes database volumes (data is deleted!)**

**Equivalent to**: `deploymentCli local d_a_dbs_s`

### deploy-local-databases

**Executes**:
1. Starts MongoDB replica set container
2. Starts Redis container
3. Starts RabbitMQ container
4. Waits for all to be healthy
5. Initializes MongoDB replica set (idempotent)

**Equivalent to**: `deploymentCli local s_a_dbs`

### deploy-local-down-databases

**Executes**:
1. Stops all database containers
2. Removes containers
3. **Removes volumes (data is deleted!)**

**Equivalent to**: `deploymentCli local d_a_dbs`

### deploy-local-services

**Executes**:
1. Builds builder image (if not exists)
2. Runs bootstrap container (loads patterns, sessions)
3. Starts engine container
4. Starts session agent container
5. Starts persistence agent container
6. Waits for all services to be healthy

**Requires**: Databases must be running first

**Equivalent to**: `deploymentCli local s_a_s`

### deploy-local-down-services

**Executes**:
1. Stops all service containers
2. Removes containers
3. Removes local images
4. Preserves volumes

**Equivalent to**: `deploymentCli local d_a_s`

## Deployment CLI (Internal)

The npm scripts wrap an internal deployment CLI tool. You generally don't need to use it directly, but it's available for advanced use cases.

### Interactive Mode

Running the CLI without arguments provides an interactive menu:

```bash
npm run deploymentCli
```

**Interactive Flow**:

1. **Select Environment**:
   ```
   Select an environment:
   1. local
   2. Cancel

   Please enter the number of your choice:
   ```

   Note: Currently only `local` environment is configured. Additional environments can be added by defining deployments with different `environments` arrays in the JSON configs.

2. **Select Deployment**:
   ```
   Select a deployment:
   1. Create Base Image (build_server) - Creates the base image used by all services.
   2. Start Databases (s_a_dbs) - Starts the database containers (Mongo, Redis, RabbitMQ).
   3. Stop Databases (d_a_dbs) - Stops and removes the database containers and their volumes.
   4. Start Services (s_a_s) - Starts the application services.
   5. Stop Services (d_a_s) - Stops and removes the application services.
   6. Start All (s_a_dbs_s) - Starts all databases and application services.
   7. Stop All (d_a_dbs_s) - Stops all databases and application services.
   8. Start Server (s_s) - Starts the application server service.
   9. Stop Server (d_s) - Stops and removes the application server services.
   10. Start Session Agent Service (s_sa) - Starts the application session agent service.
   11. Stop Session Agent Services (d_sa) - Stops and removes the application session agent service.
   12. Start Persistence Agent Service (s_pa) - Starts the application persistence agent service.
   13. Stop Persistence Agent Service (d_pa) - Stops the application persistence agent service.
   14. Run bootstrap for data (bootstrap) - Bootstrap the database with configuration data.
   15. Cancel

   Please enter the number of your choice:
   ```

3. **Execution**: The selected deployment runs automatically

**Use when**:
- Exploring available deployment options
- One-off deployments not covered by npm scripts
- Learning what deployments are available
- Running individual service deployments

### Direct CLI Usage (Advanced)

```bash
# Direct deployment with environment and short name
npm run deploymentCli -- local s_a_dbs_s

# Or with full deployment name (must quote if spaces)
npm run deploymentCli -- local "Start All"
```

**Use when**:
- Scripting custom deployment sequences
- Running specific deployments programmatically
- Need precise control over deployment selection

### CLI Architecture

The deployment CLI (`deploy/tools/deployment-cli/cli.ts`) provides:

- **Configuration-driven deployments**: Definitions in `deploy/shared/configs/deployments/`
- **Environment overrides**: Environment-specific behaviors
- **Hook system**: Pre-build and post-up commands
- **Multi-file composition**: Sequential execution of multiple compose files

### Deployment Definitions

Deployment configurations are defined in JSON files:

**Database deployments**: `deploy/shared/configs/deployments/databases.json`
**Service deployments**: `deploy/shared/configs/deployments/services.json`

Each deployment defines:
- Name and short code
- Allowed environments
- Docker Compose file(s) to use
- Pre-build commands (copy configs, build images)
- Post-up commands (initialize replica sets, cleanup)

### Adding Custom Deployments

To add a new deployment, edit the JSON configuration files and add a corresponding npm script to `package.json`:

**1. Add to deployment config** (`services.json`):
```json
{
  "name": "Start My Service",
  "shortName": "s_my",
  "description": "Starts my custom service",
  "environments": ["local"],
  "target": {
    "composing": "service",
    "deployCommand": "up",
    "composeFile": "docker-compose-services.yml",
    "defaultArgs": "my-service -d --wait"
  }
}
```

**2. Add npm script** (`package.json`):
```json
{
  "scripts": {
    "deploy-local-my-service": "npm run deploymentCli -- local s_my"
  }
}
```

**3. Use it**:
```bash
npm run deploy-local-my-service
```

## Troubleshooting

### Script Fails to Start

**Check Docker daemon**:
```bash
docker ps
```

If not running, start Docker Desktop or Docker service.

**Check disk space**:
```bash
df -h
docker system df
```

Clean up if needed:
```bash
docker system prune -a
```

### Containers Won't Start

**View logs**:
```bash
docker logs srvthreds-engine
docker logs mongo-repl-1
```

**Check container status**:
```bash
docker ps -a | grep srvthreds
```

**Common fixes**:
```bash
# Port conflict - kill process on port 27017, 6379, 5672, etc.
lsof -i :27017

# Database not ready - wait for healthcheck
docker inspect mongo-repl-1 --format='{{.State.Health.Status}}'

# Network issue - recreate
docker network rm srvthreds-net
npm run deploy-local-databases
```

### Build Failures

**Clear cache and rebuild**:
```bash
cd deploy/local/docker/compose
docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder
```

**Check for TypeScript errors**:
```bash
npm run check
```

### MongoDB Replica Set Not Initialized

**Manually run setup script**:
```bash
./deploy/local/docker/scripts/setup-repl.sh
```

**Verify status**:
```bash
docker exec -it mongo-repl-1 mongosh --eval "rs.status()"
```

### Data Persists After Down

If you want to preserve data when stopping:

```bash
# Stop services only (preserves databases)
npm run deploy-local-down-services

# Manually stop databases without removing volumes
cd deploy/local/docker/compose
docker compose -f docker-compose-db.yml stop
```

To remove data:
```bash
# Complete teardown
npm run deploy-local-down-all
```

## Best Practices

1. **Use npm scripts**: Don't call the deployment CLI directly unless necessary
2. **Database-only for development**: Run `deploy-local-databases` once, use `npm run start-dev` for app
3. **Check logs after deployment**: Always verify services started correctly
4. **Clean periodically**: Run `deploy-local-down-all` weekly to free resources
5. **Backup before major changes**: Copy `.docker/` directory before running down commands
6. **Use version control**: Track all deployment config changes in git

## Quick Reference

### NPM Scripts Summary

| Command | Action | Data Impact |
|---------|--------|-------------|
| `deploy-local-up-all` | Start all | None |
| `deploy-local-down-all` | Stop all | **Deletes all data** |
| `deploy-local-databases` | Start DBs | None |
| `deploy-local-down-databases` | Stop DBs | **Deletes DB data** |
| `deploy-local-services` | Start services | None |
| `deploy-local-down-services` | Stop services | Removes images only |

### Common Command Sequences

```bash
# First time setup
npm run deploy-local-up-all

# Daily development
npm run deploy-local-databases  # Once
npm run start-dev               # Every time

# Test production build
npm run deploy-local-up-all
docker logs -f srvthreds-engine

# After code changes (Docker)
npm run deploy-local-down-services
cd deploy/local/docker/compose && docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder
npm run deploy-local-services

# Clean everything
npm run deploy-local-down-all
```

## Summary

The npm script interface provides:

- **Simple commands**: Easy to remember and type
- **Consistent behavior**: Same commands work across environments
- **Automated setup**: MongoDB replica set, bootstrap, builds
- **Error handling**: Validates and reports issues
- **Documentation**: Commands are self-documenting in package.json

Use these scripts for all container management. The underlying deployment CLI is an implementation detail you rarely need to interact with directly.
