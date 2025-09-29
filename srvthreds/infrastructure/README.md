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

Execute deployments directly by specifying environment and deployment name:

```bash
./deploymentCli.ts <environment> <deployment-name>
```

**Examples:**
```bash
./deploymentCli.ts local "Start Databases"
./deploymentCli.ts local "Start All"
./deploymentCli.ts dev "Stop Services"
```

## Available Deployments

### Database Management
- **Start Databases**: Starts MongoDB, Redis, and RabbitMQ containers
  - Environments: local, dev, test
  - Includes MongoDB replica set initialization
- **Stop Databases**: Stops and removes database containers and volumes
  - Environments: local, dev, test

### Service Management
- **Start Services**: Starts application service containers
  - Environments: local, dev
- **Stop Services**: Stops and removes application service containers
  - Environments: local, dev

### Full Stack Management
- **Start All**: Starts both databases and services in sequence
  - Environment: local only
- **Stop All**: Stops all containers and removes volumes
  - Environment: local only

## Configuration

The deployment configuration is defined in [`containerDeploymentConfig.json`](dockerCompose/containerDeploymentConfig.json). This file specifies:

- **Deployment definitions** with names, descriptions, and supported environments
- **Docker Compose files** to use for each deployment
- **Default arguments** for docker compose commands
- **Post-deployment commands** (e.g., MongoDB replica set setup)

### Configuration Structure

```json
{
  "deployments": [
    {
      "name": "Deployment Name",
      "description": "Human-readable description",
      "environments": ["local", "dev", "test"],
      "target": {
        "composing": "deployment-type",
        "deployCommand": "up|down",
        "composeFile": "docker-compose-file.yml",
        "defaultArgs": "-d --wait",
        "postUpCommands": [
          {
            "description": "Command description",
            "command": "shell command to execute"
          }
        ]
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
- **Interactive Selection**: User-friendly menus with numbered options
- **Post-Deployment Commands**: Automatic execution of setup commands after container startup
- **Multi-Compose Support**: Can orchestrate multiple compose files in sequence
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
├── dockerCompose/
│   ├── containerDeploymentConfig.json  # Deployment configuration
│   ├── docker-compose-db.yml           # Database services
│   └── docker-compose-services.yml     # Application services
└── README.md                     # This file
```

## Post-Deployment Commands

Some deployments include post-deployment commands that run automatically after containers start. For example, the database deployment includes MongoDB replica set initialization:

```bash
docker exec mongo-repl-1 mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"
```

These commands ensure that services are properly configured and ready for use after startup.