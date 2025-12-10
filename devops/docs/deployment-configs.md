# Deployment Configuration Guide

Deployment configurations define how applications are built and deployed. These JSON files specify Docker Compose commands, pre/post hooks, and environment-specific overrides.

## Location

```
projects/{project}/deployments/
├── services.json      # Application service deployments
├── databases.json     # Database setup/teardown
└── build.json         # Build configurations
```

## Schema

### Root Structure

```json
{
  "deployments": [
    {
      "name": "string",           // Human-readable name
      "shortName": "string",      // CLI identifier (used with --deployment)
      "description": "string",    // What this deployment does
      "environments": ["string"], // Where this can run
      "target": {
        // Deployment target configuration
      }
    }
  ]
}
```

### Target Configuration

```json
{
  "target": {
    "deployCommand": "string",    // Docker Compose command (up, build, down, etc.)
    "composeFile": "string",      // Single compose file (or use composeFiles)
    "composeFiles": [...],        // Multiple compose files (see ComposeFileConfig below)
    "defaultArgs": "string",      // Default arguments for compose command
    "preBuildCommands": [         // Commands to run before deployment
      {
        "description": "string",
        "command": "string"
      }
    ],
    "postUpCommands": [           // Commands to run after deployment
      {
        "description": "string",
        "command": "string"
      }
    ],
    "environmentOverrides": {     // Environment-specific overrides
      "{environment}": {
        "preBuildCommands": [...],
        "postUpCommands": [...],
        "defaultArgs": "string"
      }
    }
  }
}
```

### ComposeFileConfig (for multi-file orchestration)

When using `composeFiles`, each entry is executed **sequentially** with its own lifecycle hooks:

```json
{
  "composeFiles": [
    {
      "composeFile": "string",           // Compose file path (relative to docker.composePath)
      "defaultArgs": "string",           // Args for this specific file
      "preBuildCommands": [              // Commands before this file's deployment
        {
          "description": "string",
          "command": "string"
        }
      ],
      "postUpCommands": [                // Commands after this file's deployment
        {
          "description": "string",
          "command": "string"
        }
      ],
      "environmentOverrides": {          // Environment-specific overrides for this file
        "{environment}": {
          "preBuildCommands": [...],
          "postUpCommands": [...],
          "defaultArgs": "string"
        }
      }
    }
  ]
}
```

**Execution order for each compose file in the array:**
1. Run `preBuildCommands` (or environment override)
2. Execute `docker compose -f <file> <deployCommand> <args>`
3. Run `postUpCommands` (or environment override)
4. Move to next compose file in array

## Fields Reference

### Deployment Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable deployment name |
| `shortName` | string | Yes | CLI identifier for `--deployment` flag |
| `description` | string | Yes | What this deployment does |
| `environments` | string[] | Yes | Valid environments for this deployment |

### Target Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `deployCommand` | string | Yes | Docker Compose command |
| `composeFile` | string | No* | Single compose file path |
| `composeFiles` | ComposeFileConfig[] | No* | Multiple compose files (executed sequentially) |
| `defaultArgs` | string | No | Default command arguments |
| `preBuildCommands` | array | No | Pre-deployment commands |
| `postUpCommands` | array | No | Post-deployment commands |
| `environmentOverrides` | object | No | Environment-specific settings |

*Either `composeFile` or `composeFiles` is required.

### ComposeFileConfig Fields (for multi-file deployments)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `composeFile` | string | Yes | Compose file path (relative to `docker.composePath`) |
| `defaultArgs` | string | No | Args for this specific file (overrides target-level) |
| `preBuildCommands` | array | No | Commands before this file's deployment |
| `postUpCommands` | array | No | Commands after this file's deployment |
| `environmentOverrides` | object | No | Environment-specific overrides for this file |

### Deploy Commands

| Command | Purpose |
|---------|---------|
| `up` | Start services |
| `build` | Build images |
| `down` | Stop services |
| `pull` | Pull images |
| `restart` | Restart services |

### Environments

| Environment | Description |
|-------------|-------------|
| `development` | Local development (host Docker) |
| `minikube` | Local Minikube cluster |
| `dev` | Azure dev environment |
| `test` | Azure test environment |
| `prod` | Azure production environment |

---

## Examples

### Service Deployment

```json
{
  "deployments": [
    {
      "name": "Start All Services",
      "shortName": "s_a_s",
      "description": "Starts all application services with dependencies",
      "environments": ["development", "minikube"],
      "target": {
        "deployCommand": "up",
        "composeFile": "docker-compose-services.yml",
        "defaultArgs": "-d --wait",
        "preBuildCommands": [
          {
            "description": "Building base builder image",
            "command": "docker compose -f docker/compose/docker-compose-builder.yml build srvthreds-builder"
          }
        ],
        "environmentOverrides": {
          "minikube": {
            "preBuildCommands": [
              {
                "description": "Configuring Minikube Docker environment",
                "command": "eval $(minikube docker-env)"
              },
              {
                "description": "Building base builder image",
                "command": "docker compose -f docker/compose/docker-compose-builder.yml build srvthreds-builder"
              }
            ]
          }
        }
      }
    }
  ]
}
```

### Database Deployment

```json
{
  "deployments": [
    {
      "name": "Start All Databases",
      "shortName": "s_a_dbs",
      "description": "Starts MongoDB replica set and Redis for local development",
      "environments": ["development", "minikube"],
      "target": {
        "deployCommand": "up",
        "composeFiles": [
          {
            "file": "docker-compose-mongodb.yml",
            "description": "MongoDB replica set"
          },
          {
            "file": "docker-compose-redis.yml",
            "description": "Redis cache"
          }
        ],
        "defaultArgs": "-d --wait",
        "postUpCommands": [
          {
            "description": "Initialize MongoDB replica set",
            "command": "docker exec mongo-repl-1 mongosh --eval 'rs.initiate()'"
          }
        ]
      }
    },
    {
      "name": "Stop All Databases",
      "shortName": "d_a_dbs",
      "description": "Stops all database containers",
      "environments": ["development", "minikube"],
      "target": {
        "deployCommand": "down",
        "composeFiles": [
          {
            "file": "docker-compose-mongodb.yml",
            "description": "MongoDB replica set"
          },
          {
            "file": "docker-compose-redis.yml",
            "description": "Redis cache"
          }
        ],
        "defaultArgs": "-v"
      }
    }
  ]
}
```

### Build Configuration

```json
{
  "deployments": [
    {
      "name": "Build Server Images",
      "shortName": "build_server",
      "description": "Builds all server-side Docker images",
      "environments": ["development", "minikube", "dev", "test", "prod"],
      "target": {
        "deployCommand": "build",
        "composeFile": "docker-compose-build.yml",
        "defaultArgs": "--no-cache",
        "preBuildCommands": [
          {
            "description": "Clean previous builds",
            "command": "docker system prune -f"
          }
        ],
        "environmentOverrides": {
          "prod": {
            "defaultArgs": "--no-cache --pull"
          }
        }
      }
    }
  ]
}
```

### Multi-File Orchestration (Full Environment Setup)

This example starts databases first (with post-initialization), then services:

```json
{
  "deployments": [
    {
      "name": "Start All",
      "shortName": "s_a_dbs_s",
      "description": "Starts all databases and application services",
      "environments": ["development", "minikube"],
      "target": {
        "deployCommand": "up",
        "composeFiles": [
          {
            "composeFile": "docker-compose-db.yml",
            "defaultArgs": "-d --wait",
            "postUpCommands": [
              {
                "description": "Initialize MongoDB replica set",
                "command": "chmod +x scripts/setup-repl.sh && scripts/setup-repl.sh"
              }
            ]
          },
          {
            "composeFile": "docker-compose-services.yml",
            "defaultArgs": "-d --wait",
            "preBuildCommands": [
              {
                "description": "Build base builder image",
                "command": "docker compose -f docker-compose-services.yml build srvthreds-builder"
              }
            ],
            "environmentOverrides": {
              "minikube": {
                "preBuildCommands": [
                  {
                    "description": "Build with no cache for Minikube",
                    "command": "docker compose -f docker-compose-services.yml build --no-cache srvthreds-builder"
                  }
                ]
              }
            }
          }
        ]
      }
    }
  ]
}
```

**Execution flow:**
1. Start databases: `docker compose -f docker-compose-db.yml up -d --wait`
2. Run replica set init script
3. Build base image (with environment-specific override if minikube)
4. Start services: `docker compose -f docker-compose-services.yml up -d --wait`

---

## Environment Overrides

Environment overrides allow customizing deployment behavior per environment.

### Override Priority

1. Environment-specific override (if exists)
2. Base target configuration

### What Can Be Overridden

- `preBuildCommands` - Completely replaces base commands
- `postUpCommands` - Completely replaces base commands
- `defaultArgs` - Replaces default arguments

### Example

```json
{
  "target": {
    "deployCommand": "up",
    "composeFile": "docker-compose.yml",
    "defaultArgs": "-d",
    "preBuildCommands": [
      {
        "description": "Default pre-build",
        "command": "echo 'Building...'"
      }
    ],
    "environmentOverrides": {
      "minikube": {
        "preBuildCommands": [
          {
            "description": "Setup Minikube Docker",
            "command": "eval $(minikube docker-env)"
          },
          {
            "description": "Minikube pre-build",
            "command": "echo 'Building for Minikube...'"
          }
        ]
      },
      "prod": {
        "defaultArgs": "-d --no-build",
        "postUpCommands": [
          {
            "description": "Notify deployment",
            "command": "curl -X POST https://hooks.slack.com/..."
          }
        ]
      }
    }
  }
}
```

---

## Command Execution

### How Commands Run

1. **Pre-build commands** run sequentially before the main compose command
2. **Deploy command** runs: `docker compose -f <file> <command> <args>`
3. **Post-up commands** run sequentially after compose completes

### Working Directory

All commands run from the devops root directory. Paths in compose files and commands should be relative to this root.

### Command Format

Commands are split by spaces and executed. For complex commands:

```json
{
  "description": "Complex command",
  "command": "bash -c 'echo hello && echo world'"
}
```

---

## Multi-File Compose

When using `composeFiles`, files are merged in order:

```json
{
  "composeFiles": [
    { "file": "docker-compose-base.yml" },
    { "file": "docker-compose-override.yml" }
  ]
}
```

Equivalent to:
```bash
docker compose -f docker-compose-base.yml -f docker-compose-override.yml up
```

---

## Naming Conventions

### shortName Patterns

| Pattern | Meaning | Example |
|---------|---------|---------|
| `s_*` | Start something | `s_a_s` (start all services) |
| `d_*` | Stop/down something | `d_a_dbs` (down all databases) |
| `build_*` | Build something | `build_server` |
| `*_dbs` | Database related | `s_a_dbs` |
| `*_s` | Services related | `s_a_s` |

---

## Validation

The configuration validator checks:

1. All referenced compose files exist
2. Environment names are valid
3. Required fields are present
4. Command syntax is valid

Run validation:
```bash
npm run config:srvthreds:validate
```

---

## Best Practices

1. **Use descriptive names** - `name` should clearly describe the action
2. **Keep shortNames concise** - They're typed on CLI
3. **Document commands** - Use `description` field for every command
4. **Limit environments** - Only list environments where deployment makes sense
5. **Use overrides sparingly** - Prefer configuration that works across environments
6. **Order compose files correctly** - Base files first, overrides last
