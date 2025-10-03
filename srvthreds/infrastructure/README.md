# Deployment CLI

An interactive command-line interface for managing Docker Compose deployments across multiple environments.

## Overview

The Deployment CLI provides a streamlined way to start, stop, and manage containerized services (databases and application services) using Docker Compose. It supports both interactive menu-driven operation and direct command-line execution.

## Usage

### Interactive Mode

Run the CLI without arguments to enter interactive mode:

```bash
./deploymentCli.ts
```

The CLI will prompt you to:
1. Select an environment (local, dev, test)
2. Choose from available deployments for that environment

### Direct Command Mode

Execute deployments directly by specifying environment and deployment name or shortName:

```bash
./deploymentCli.ts <environment> <deployment-name|shortName>
```

**Examples using full names:**
```bash
./deploymentCli.ts local "Start Databases"
./deploymentCli.ts local "Start All"
./deploymentCli.ts dev "Stop Services"
```

**Examples using shortNames:**
```bash
./deploymentCli.ts local "s_s_dbs"      # Start Databases
./deploymentCli.ts local "s_a_dbs_s"  # Start All
./deploymentCli.ts dev "d_a_s"        # Stop Services
```

## Available Deployments

### Database Management
- **Start Databases** (`s_s_dbs`): Starts MongoDB, Redis, and RabbitMQ containers
  - Environments: local, dev, test
  - Includes MongoDB replica set initialization
- **Stop Databases** (`d_dbs`): Stops and removes database containers and volumes
  - Environments: local, dev, test

### Service Management
- **Start Services** (`s_a_s`): Starts application service containers
  - Environments: local, dev
- **Stop Services** (`d_a_s`): Stops and removes application service containers
  - Environments: local, dev

### Full Stack Management
- **Start All** (`s_a_dbs_s`): Starts both databases and services in sequence
  - Environment: local only
- **Stop All** (`d_a_dbs_s`): Stops all containers and removes volumes
  - Environment: local only

### Individual Service Management
- **Start Server** (`s_s`): Starts only the main server service
  - Environments: local, dev
- **Stop Server** (`d_s`): Stops the main server service
  - Environments: local, dev
- **Start Session Agent Service** (`s_sa`): Starts session agent service
  - Environments: local, dev
- **Stop Session Agent Services** (`d_sa`): Stops session agent service
  - Environments: local, dev
- **Start Persistence Agent Service** (`s_pa`): Starts persistence agent service
  - Environments: local, dev
- **Stop Persistence Agent Service** (`d_pa`): Stops persistence agent service
  - Environments: local, dev

### Utility Operations
- **Run bootstrap for data** (`bootstrap`): Bootstraps database with configuration data
  - Environments: local, dev
- **Create Base Image** (`build`): Creates the base builder image used by all services
  - Environments: local, dev

## Configuration

The deployment configuration is defined in [`configs/containerDeploymentConfig.json`](configs/containerDeploymentConfig.json). This file specifies:

- **Deployment definitions** with names, shortNames, descriptions, and supported environments
- **Docker Compose files** to use for each deployment
- **Default arguments** for docker compose commands
- **Pre-build commands** (e.g., building the base builder image before services)
- **Post-deployment commands** (e.g., MongoDB replica set setup)

### Configuration Structure

```json
{
  "deployments": [
    {
      "name": "Deployment Name",
      "shortName": "-shortcut",
      "description": "Human-readable description",
      "environments": ["local", "dev", "test"],
      "target": {
        "composing": "deployment-type",
        "deployCommand": "up|down",
        "composeFile": "docker-compose-file.yml",
        "defaultArgs": "-d --wait",
        "preBuildCommands": [
          {
            "description": "Command description",
            "command": "shell command to execute before deployment"
          }
        ],
        "postUpCommands": [
          {
            "description": "Command description",
            "command": "shell command to execute after deployment"
          }
        ],
        "environmentOverrides": {
          "staging": {
            "preBuildCommands": [
              {
                "description": "Environment-specific pre-build command",
                "command": "shell command for staging environment"
              }
            ],
            "postUpCommands": [
              {
                "description": "Environment-specific post-up command",
                "command": "shell command for staging environment"
              }
            ]
          }
        }
      }
    }
  ]
}
```

## Docker Compose Files

The CLI works with these Docker Compose files in the [`dockerCompose/`](dockerCompose/) directory:

- **docker-compose-db.yml**: Database services (MongoDB, Redis, RabbitMQ)
- **docker-compose-services.yml**: Application services

## Features

- **Environment Validation**: Ensures deployments are only run in supported environments
- **Interactive Selection**: User-friendly menus with numbered options showing both full names and shortNames
- **ShortName Support**: Quick deployment execution using short, memorable aliases
- **Pre-Build Commands**: Automatic execution of build commands before container startup (e.g., building base images)
- **Post-Deployment Commands**: Automatic execution of setup commands after container startup
- **Environment-Specific Overrides**: Override pre-build and post-up commands per environment for flexible deployment strategies
- **Multi-Compose Support**: Can orchestrate multiple compose files in sequence
- **Asset Management**: Automatically creates and cleans up deployment assets (e.g., environment files)
- **Error Handling**: Graceful error handling with informative messages
- **Cancellation**: Built-in cancel option for interactive operations

## Dependencies

- Node.js with ES modules support
- Docker and Docker Compose
- TypeScript compilation (if running .ts files directly)

## File Structure

```
infrastructure/
├── deploymentCli.ts              # Main CLI script
├── deployment.ts                 # Deployment execution logic
├── configs/
│   ├── containerDeploymentConfig.json  # Deployment configuration
│   └── .env.*.example            # Environment variable templates
├── dockerCompose/
│   ├── docker-compose-db.yml           # Database services
│   ├── docker-compose-services.yml     # Application services
│   ├── Dockerfile                      # Main service Dockerfile
│   ├── Dockerfile.builder              # Base builder image
│   └── Dockerfile.cmdRunner            # Command runner image
├── scripts/
│   ├── setup-repl.sh             # MongoDB replica set initialization
│   └── validationScript.sh       # Validation utilities
├── deploymentAssets/             # Temporary files created during deployment
└── README.md                     # This file
```

## Pre-Build and Post-Deployment Commands

### Pre-Build Commands

Some deployments include pre-build commands that run before containers start. For example, the services deployment builds the base builder image:

```bash
docker compose -f infrastructure/dockerCompose/docker-compose-services.yml build srvthreds-builder
```

This ensures dependencies are built and cached before starting the main services.

### Post-Deployment Commands

Some deployments include post-deployment commands that run automatically after containers start. For example, the database deployment includes MongoDB replica set initialization:

```bash
docker exec mongo-repl-1 mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongo-repl-1:27017' }] })"
```

These commands ensure that services are properly configured and ready for use after startup.

### Environment-Specific Command Overrides

The deployment system supports environment-specific command overrides, allowing you to define different pre-build and post-up commands for different environments. This is useful when:

- Production builds require different optimization flags (e.g., `--no-cache`)
- Staging environments need additional setup steps (e.g., database migrations)
- Development environments need test data bootstrapping
- Different environments have different validation requirements

**How it works:**

1. Define default `preBuildCommands` and `postUpCommands` at the target level
2. Add `environmentOverrides` with environment-specific commands
3. When deploying to a specific environment, the override commands **completely replace** the defaults (if defined)
4. If no override exists for an environment, the default commands are used

**Example:**

```json
{
  "target": {
    "preBuildCommands": [
      { "description": "Building with cache...", "command": "docker compose build" }
    ],
    "environmentOverrides": {
      "production": {
        "preBuildCommands": [
          { "description": "Building without cache for production...", "command": "docker compose build --no-cache" }
        ],
        "postUpCommands": [
          { "description": "Running migrations...", "command": "npm run migrate" }
        ]
      }
    }
  }
}
```

In this example:
- **Local/Dev**: Uses cached builds (default `preBuildCommands`), no post-up commands
- **Production**: Rebuilds from scratch (`--no-cache`), runs migrations after deployment