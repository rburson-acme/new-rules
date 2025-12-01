# Test Configuration Guide

This guide explains how test configuration works in the srvthreds project and how to properly configure your environment for running tests.

## Overview

Tests in this project are **stateful integration tests** that require connections to real infrastructure services:

- **MongoDB** - Primary data persistence
- **Redis** - Caching and distributed locking
- **RabbitMQ** - Message queue for inter-service communication

Tests must be run **sequentially** (no parallelism) due to shared state and resource dependencies.

## Configuration Architecture

### Three-Layer Configuration Pattern

1. **`.env` file** (optional) - Local development settings
2. **`src/test/setup.ts`** - Default test configuration with fallbacks
3. **Environment variables** - CI/CD and runtime overrides

This pattern ensures tests can run in multiple environments:

- ✅ Local development with Docker containers
- ✅ CI/CD pipelines
- ✅ Kubernetes/Minikube clusters

## Quick Start

### 1. Start Required Services

```bash
# Start databases using Docker Compose
npm run deploy-local-databases

# Verify services are running
docker ps
```

### 2. Configure Environment (Optional)

Copy `.env.example` to `.env` and customize if needed:

```bash
cp .env.example .env
```

For local development with Docker containers, the defaults work out of the box:

```env
MONGO_HOST=localhost:27017
MONGO_DIRECT_CONNECTION=true
REDIS_HOST=localhost:6379
RABBITMQ_HOST=localhost
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test src/test/persistence/persistence.test.ts

# Run only changed tests
npm run test-changed
```

## MongoDB Connection Configuration

### Understanding `MONGO_DIRECT_CONNECTION`

MongoDB can operate in two modes:

1. **Direct Connection** (`directConnection=true`)
   - Connects directly to a single MongoDB instance
   - Required for single-node replica sets in local development
   - Connection string: `mongodb://localhost:27017/`

2. **Replica Set Connection** (`directConnection=false` or unset)
   - Connects through MongoDB replica set discovery
   - Required for multi-node production clusters
   - Connection string: `mongodb://localhost:27017/?replicaSet=rs0`

### Local Development Setup

When running MongoDB in Docker with a single-node replica set:

```env
MONGO_HOST=localhost:27017
MONGO_DIRECT_CONNECTION=true
```

**Why `directConnection=true` is required:**

MongoDB driver behavior:

- Without `directConnection=true`, the driver attempts replica set discovery
- Single-node replica sets can fail discovery when accessed via localhost
- Setting `directConnection=true` bypasses discovery and connects directly

### Configuration Precedence

The `PersistenceFactory` checks configuration in this order:

```typescript
1. directConnection parameter (code)
2. process.env.MONGO_DIRECT_CONNECTION (environment)
3. hostString parameter (code)
4. process.env.MONGO_HOST (environment)
5. 'localhost:27017' (fallback default)
```

## Test Configuration Loading

### Automatic Setup via Vitest

The [vitest.config.ts](../../vitest.config.ts) file configures automatic setup:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'], // Loaded before all tests
    fileParallelism: false, // Sequential execution
  },
});
```

### What `setup.ts` Does

1. Loads `.env` file if present
2. Sets sensible defaults for all required environment variables
3. Configures logger for test output
4. Ensures tests can run without manual configuration

### Individual Test Requirements

Tests should NOT:

- ❌ Load `dotenv/config` directly
- ❌ Set environment variables
- ❌ Create custom connection logic

Tests SHOULD:

- ✅ Use factories: `PersistenceFactory`, `StorageFactory`
- ✅ Trust the setup configuration
- ✅ Clean up resources in `afterAll` hooks

Example:

```typescript
import { MongoPersistenceProvider } from '../../ts/persistence/mongodb/MongoPersistenceProvider.js';

test('connect', async function () {
  // Uses environment variables automatically configured by setup.ts
  persistenceProvider = new MongoPersistenceProvider(process.env.MONGO_HOST || 'localhost:27017');
  await persistenceProvider.connect();
});
```

## CI/CD Configuration

### GitHub Actions Example

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:latest
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 27017:27017

      redis:
        image: redis:latest
        ports:
          - 6379:6379

      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Initialize MongoDB replica set
        run: |
          docker exec ${{ job.services.mongodb.id }} mongosh --eval "rs.initiate()"
          sleep 5

      - name: Run tests
        env:
          MONGO_HOST: localhost:27017
          MONGO_DIRECT_CONNECTION: true
          REDIS_HOST: localhost:6379
          RABBITMQ_HOST: localhost
        run: npm test
```

### Docker Container Testing

When running tests inside a Docker container:

```dockerfile
# Dockerfile.test
FROM node:20

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .

ENV MONGO_HOST=mongodb:27017
ENV MONGO_DIRECT_CONNECTION=true
ENV REDIS_HOST=redis:6379
ENV RABBITMQ_HOST=rabbitmq

CMD ["npm", "test"]
```

```yaml
# docker-compose.test.yml
version: '3.8'
services:
  test:
    build:
      context: .
      dockerfile: Dockerfile.test
    depends_on:
      - mongodb
      - redis
      - rabbitmq
    environment:
      - MONGO_HOST=mongodb:27017
      - MONGO_DIRECT_CONNECTION=true
      - REDIS_HOST=redis:6379
      - RABBITMQ_HOST=rabbitmq
```

## Troubleshooting

### Test Times Out Connecting to MongoDB

**Symptom:**

```
Error: Test timed out in 5000ms.
```

**Causes & Solutions:**

1. **MongoDB not running**

   ```bash
   docker ps | grep mongo
   # If not running:
   npm run deploy-local-databases
   ```

2. **Wrong connection configuration**

   ```bash
   # Check your .env or set explicitly:
   export MONGO_HOST=localhost:27017
   export MONGO_DIRECT_CONNECTION=true
   ```

3. **Replica set not initialized**

   ```bash
   docker exec mongo-repl-1 mongosh --eval "rs.status()"
   # If not initialized:
   docker exec mongo-repl-1 mongosh --eval "rs.initiate()"
   ```

4. **Port conflicts**
   ```bash
   lsof -i :27017
   # Kill any conflicting processes or use different port
   ```

### Tests Fail with "Cannot read properties of undefined"

**Symptom:**

```
Cleanup Failed Cannot read properties of undefined (reading 'deleteDatabase')
```

**Cause:** Test failed before persistence was initialized

**Solution:** Ensure connection succeeds before running other tests

### Redis Connection Errors

```bash
# Verify Redis is accessible
redis-cli ping
# Should return: PONG

# Check if Redis container is healthy
docker inspect redis | grep Status
```

### RabbitMQ Connection Issues

```bash
# Check RabbitMQ status
docker exec rabbitmq rabbitmqctl status

# Access management UI
open http://localhost:15672
# Default credentials: guest/guest
```

## Best Practices

### 1. Use Environment-Specific Configuration

```typescript
// ❌ Bad - hardcoded configuration
const provider = new MongoPersistenceProvider('localhost:27017', {
  connectOptions: { directConnection: true },
});

// ✅ Good - uses environment configuration
const provider = new MongoPersistenceProvider();
```

### 2. Clean Up Resources

```typescript
afterAll(async () => {
  await persistence?.deleteDatabase();
  await persistenceProvider?.disconnect();
  await StorageFactory.disconnectAll();
});
```

### 3. Test Configuration Locally

```bash
# Verify your configuration works
npm test src/test/persistence/persistence.test.ts
```

### 4. Don't Commit Secrets

The `.env` file is gitignored. Use `.env.example` as a template.

```bash
# ✅ Safe to commit
.env.example

# ❌ Never commit
.env
```

## Migration from Previous Setup

If you have existing tests that aren't working:

1. **Remove direct dotenv imports** from test files
2. **Remove environment variable assignments** in test code
3. **Trust the setup.ts configuration**
4. **Use factories** for all resource connections

Example migration:

```typescript
// Before
import 'dotenv/config';
process.env.MONGO_HOST = 'localhost:27017';
const provider = new MongoPersistenceProvider('localhost:27017', {
  connectOptions: { directConnection: true },
});

// After
// No imports or env manipulation needed
const provider = new MongoPersistenceProvider();
```

## Additional Resources

- [MongoDB Connection String Options](https://www.mongodb.com/docs/manual/reference/connection-string/)
- [Vitest Configuration](https://vitest.dev/config/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Container Setup Guide](../../deploy-containers/docs/DEPLOYMENT.md)
