# Docker Build Context & .dockerignore Analysis

## Summary

**Answer: Only ONE infrastructure path is needed in Docker images:**
```
infrastructure/tools/deployment-cli/assets/
```

All other infrastructure files are NOT needed in containers and can be safely ignored.

## Current State

### Files That ARE Copied to Images

1. **`infrastructure/tools/deployment-cli/assets/.env`**
   - **Where**: Dockerfile.builder line 27
   - **When**: During Docker build
   - **Why**: Environment-specific configuration (database hosts, service URLs, etc.)
   - **Lifecycle**:
     - Created during pre-build step
     - Copied to `/app/srvthreds/dist-server/.env` in container
     - Cleaned up after build completes

### Files That Are NOT Needed

Everything else under `infrastructure/`:
- ❌ `infrastructure/local/` - Docker/Kubernetes configs (build-time only)
- ❌ `infrastructure/cloud/` - Cloud deployment configs (build-time only)
- ❌ `infrastructure/shared/` - Shared configs (build-time only)
- ❌ `infrastructure/tools/` - Deployment tooling (build-time only)
- ❌ `infrastructure/docs/` - Documentation
- ❌ `infrastructure/test/` - Testing infrastructure

## .dockerignore Files

### Root `.dockerignore`
**Location**: `/Users/aresha/Repos/new-rules/srvthreds/.dockerignore`

**Status**: ✅ Correctly configured

Does NOT block `infrastructure/`, allowing selective copying. Blocks:
- `k8s/` (old location, not used)
- `terraform/` (old location, not used)
- `scripts/` (old location, not used)

### Dockerfile-Specific `.dockerignore`
**Location**: `infrastructure/local/docker/dockerfiles/Dockerfile.builder.dockerignore`

**Status**: ⚠️ NOT BEING USED (Docker doesn't support dockerfile-specific .dockerignore)

**Why this file exists**: You likely created it thinking Docker would use it, but Docker only uses the root `.dockerignore` file.

**What it attempts to block**:
```
infrastructure/local/compose
infrastructure/local/scripts
infrastructure/kubernetes  (old path)
infrastructure/terraform   (old path)
infrastructure/docs
```

**Problem**: This file has NO EFFECT. Docker doesn't support per-Dockerfile .dockerignore files.

## How .dockerignore Actually Works

Docker looks for `.dockerignore` in **one place only**: the build context root.

```bash
# When you run:
docker build -f infrastructure/local/docker/dockerfiles/Dockerfile.builder .

# Docker uses:
./.dockerignore  ← Only this file matters

# Docker does NOT use:
./infrastructure/local/docker/dockerfiles/Dockerfile.builder.dockerignore  ← Has no effect
```

## Why You Created Individual Folders (Likely Reasoning)

Based on the pattern, you probably:

1. **Wanted per-Dockerfile .dockerignore** - But this isn't supported by Docker
2. **Noticed large build contexts** - Including all of infrastructure/ adds unnecessary files
3. **Tried to optimize** - Created specific .dockerignore files for specific Dockerfiles

## Current Build Process Flow

### Phase 1: Pre-build (Outside Container)
```bash
# Generate configurations
tsx infrastructure/tools/shared/config/generator.ts

# Validate configurations
tsx infrastructure/tools/shared/config/validator.ts

# Copy environment file to staging area
cp infrastructure/local/configs/.env.local.example \
   infrastructure/tools/deployment-cli/assets/.env
```

### Phase 2: Docker Build (Inside Container)
```dockerfile
# Copy entire repo (filtered by .dockerignore)
COPY . ./srvthreds/

# Build the application
RUN npm ci && npm run build

# Copy staged .env file into dist-server
COPY infrastructure/tools/deployment-cli/assets/*.* ./dist-server/
```

### Phase 3: Cleanup (Outside Container)
```bash
# Remove staged files
find infrastructure/tools/deployment-cli/assets/ -mindepth 1 -delete
```

## Optimization Opportunities

### Option 1: Exclude More in Root .dockerignore (Recommended)

Add to `.dockerignore`:
```
# Build-time only infrastructure (not needed in images)
infrastructure/local/
infrastructure/cloud/
infrastructure/shared/
infrastructure/docs/
infrastructure/test/
infrastructure/tools/kubernetes-deployer/
infrastructure/tools/terraform-cli/
infrastructure/tools/scripts/

# Keep these for build:
!infrastructure/tools/deployment-cli/assets/
```

**Impact**: Reduces build context from ~20MB to ~2MB
**Risk**: Low - these files aren't used at runtime

### Option 2: Multi-Stage Build with Minimal Final Image (Already Done)

Your production Dockerfile already does this:
```dockerfile
FROM srvthreds/builder AS builder
FROM node:20-alpine AS production
COPY --from=builder /app/srvthreds/dist-server ./dist-server
```

**Result**: Production images don't include infrastructure/ at all

### Option 3: Build Assets Outside Docker (Current Approach)

Continue using the `assets/` directory pattern:
- Pre-build creates necessary files
- Docker copies only what's needed
- Post-build cleans up

**Status**: ✅ This is what you're already doing

## Recommendations

### 1. Remove Unused .dockerignore File (High Priority)
```bash
# This file has no effect and is confusing
rm infrastructure/local/docker/dockerfiles/Dockerfile.builder.dockerignore
```

### 2. Optimize Root .dockerignore (Medium Priority)
Add exclusions for infrastructure subdirectories (see Option 1 above)

**Benefits**:
- Faster Docker builds (smaller context)
- Less data transferred to Docker daemon
- Clearer what's included/excluded

### 3. Document the Assets Pattern (Low Priority)
Add comments to Dockerfile.builder explaining the assets/ staging pattern:

```dockerfile
# Copy environment config from staging area
# This file is created during pre-build and cleaned up after build
COPY infrastructure/tools/deployment-cli/assets/*.* ./dist-server/
```

## Testing Your Changes

### Verify Build Context Size
```bash
# Before optimization
docker build -f infrastructure/local/docker/dockerfiles/Dockerfile.builder . --no-cache 2>&1 | grep "Sending build context"

# After adding exclusions to .dockerignore
docker build -f infrastructure/local/docker/dockerfiles/Dockerfile.builder . --no-cache 2>&1 | grep "Sending build context"
```

### Verify Build Still Works
```bash
# Run full build
npm run build

# Build images
docker compose -f infrastructure/local/docker/compose/docker-compose-services.yml build

# Test bootstrap
docker run --rm srvthreds/bootstrap:latest npm run bootstrap -- --help
```

## Summary Table

| Path | Needed in Container? | Reason | Action |
|------|---------------------|--------|--------|
| `infrastructure/tools/deployment-cli/assets/` | ✅ Yes (temporarily) | Staging area for .env | Keep accessible |
| `infrastructure/local/` | ❌ No | Build configs | Add to .dockerignore |
| `infrastructure/cloud/` | ❌ No | Deployment configs | Add to .dockerignore |
| `infrastructure/shared/` | ❌ No | Build-time configs | Add to .dockerignore |
| `infrastructure/tools/kubernetes-deployer/` | ❌ No | Deployment tooling | Add to .dockerignore |
| `infrastructure/tools/terraform-cli/` | ❌ No | Deployment tooling | Add to .dockerignore |
| `infrastructure/docs/` | ❌ No | Documentation | Add to .dockerignore |
| `infrastructure/test/` | ❌ No | Test infrastructure | Add to .dockerignore |

## Related Files

- [.dockerignore](./../.dockerignore) - Root Docker ignore file (ACTIVE)
- [Dockerfile.builder.dockerignore](./local/docker/dockerfiles/Dockerfile.builder.dockerignore) - Per-file ignore (NOT USED)
- [Dockerfile.builder](./local/docker/dockerfiles/Dockerfile.builder) - Builder image
- [docker-compose-services.yml](./local/docker/compose/docker-compose-services.yml) - Service definitions
