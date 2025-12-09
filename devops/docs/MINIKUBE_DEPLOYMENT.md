# Minikube Deployment Guide

Guide for deploying srvthreds to a local Minikube Kubernetes cluster.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Deployment Commands](#deployment-commands)
- [Configuration](#configuration)
- [Operations](#operations)
- [Troubleshooting](#troubleshooting)

## Overview

Minikube provides a local Kubernetes cluster for development and testing.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Host Machine                       │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Host Docker                                 │  │
│  │  ┌────────────┐   ┌────────────┐            │  │
│  │  │  MongoDB   │   │   Redis    │            │  │
│  │  └────────────┘   └────────────┘            │  │
│  └──────────────────────────────────────────────┘  │
│                        ▲                            │
│                        │                            │
│  ┌─────────────────────┼─────────────────────────┐ │
│  │  Minikube Cluster   │ host.minikube.internal  │ │
│  │                     │                         │ │
│  │  ┌─────────────────────────────────────────┐ │ │
│  │  │  Namespace: srvthreds                   │ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────┐  ┌──────────┐  ┌───────┐│ │ │
│  │  │  │  Engine  │  │ Session  │  │Persist││ │ │
│  │  │  │   Pod    │  │   Pod    │  │  Pod  ││ │ │
│  │  │  └──────────┘  └──────────┘  └───────┘│ │ │
│  │  │                                         │ │ │
│  │  │  ┌──────────────────────────────────┐  │ │ │
│  │  │  │       RabbitMQ                   │  │ │ │
│  │  │  │      (StatefulSet)               │  │ │ │
│  │  │  └──────────────────────────────────┘  │ │ │
│  │  └─────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Key Design:**
- Databases (MongoDB, Redis) run on host Docker for persistence
- Application services run in Minikube cluster
- Services connect to databases via `host.minikube.internal`
- RabbitMQ runs as StatefulSet in Minikube

## Prerequisites

### Required Software

```bash
# Docker Desktop (v20.10+)
docker --version
docker info

# Minikube (v1.30+)
minikube version

# kubectl (v1.26+)
kubectl version --client

# Node.js (v18+)
node --version
npm --version
```

### System Requirements

- **CPU**: 4+ cores (6+ recommended)
- **Memory**: 8GB+ RAM (12GB+ recommended)
- **Disk**: 20GB+ free space

## Quick Start

```bash
# Navigate to devops directory
cd devops

# Install dependencies
npm install

# Deploy to Minikube (creates cluster if needed)
npm run minikube:deploy

# Check deployment status
npm run minikube:status
```

### What Happens During Deploy

1. Verifies Docker is running
2. Creates Minikube cluster (if not exists)
3. Sets Docker environment to Minikube
4. Builds service images
5. Starts MongoDB and Redis on host Docker
6. Applies Kubernetes manifests
7. Waits for pods to be ready

## Deployment Commands

| Command | Description |
|---------|-------------|
| `npm run minikube:deploy` | Full deployment to Minikube |
| `npm run minikube:status` | Check deployment status |
| `npm run minikube:reset` | Reset deployment (keeps cluster) |
| `npm run minikube:cleanup` | Full cleanup (deletes cluster) |

### Command Options

```bash
# Deploy with dry-run
npm run k8s -- minikube deploy --dry-run

# Deploy with verbose output
npm run k8s -- minikube deploy -v

# Deploy different project
npm run k8s -- minikube deploy --project <project-name>

# Skip database setup
npm run k8s -- minikube deploy --skip-db

# Cleanup including databases
npm run k8s -- minikube cleanup --delete-dbs
```

## Configuration

### Manifests

Manifests are located in `minikube/srvthreds/manifests/`:

```
minikube/srvthreds/manifests/
├── base/                         # Base manifests
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── srvthreds-engine.yaml
│   ├── srvthreds-session-agent.yaml
│   ├── srvthreds-persistence-agent.yaml
│   ├── srvthreds-bootstrap.yaml
│   └── srvthreds-builder.yaml
├── minikube/                     # Minikube overlay
│   ├── kustomization.yaml
│   ├── configmap-minikube.yaml
│   ├── mongo.yaml
│   ├── mongo-repl-1.yaml
│   ├── rabbitmq.yaml
│   └── redis.yaml
└── prod/                         # Prod overlay
    ├── kustomization.yaml
    └── configmap-prod.yaml
```

### Agent Configs

Agent configuration files are in `minikube/srvthreds/configs/agents/`:

```
configs/agents/
├── bootstrap.config.json
├── builder.config.json
├── engine.config.json
├── persistence-agent.config.json
├── session-agent.config.json
└── test.config.json
```

### Database Configuration

Databases run on host Docker:

| Database | Port | Connection |
|----------|------|------------|
| MongoDB | 27017 | `host.minikube.internal:27017` |
| Redis | 6379 | `host.minikube.internal:6379` |
| RabbitMQ | 5672 | `rabbitmq-service:5672` (in-cluster) |

## Operations

### Cluster Management

```bash
# Start Minikube (if stopped)
minikube start

# Stop Minikube (preserves data)
minikube stop

# Delete Minikube cluster
minikube delete

# View cluster status
minikube status

# Open dashboard
minikube dashboard
```

### Pod Management

```bash
# List pods
kubectl get pods -n srvthreds

# View pod logs
kubectl logs <pod-name> -n srvthreds
kubectl logs -f <pod-name> -n srvthreds  # Follow

# Describe pod
kubectl describe pod <pod-name> -n srvthreds

# Execute command in pod
kubectl exec -it <pod-name> -n srvthreds -- sh

# Delete pod (triggers restart)
kubectl delete pod <pod-name> -n srvthreds
```

### Service Access

```bash
# List services
kubectl get svc -n srvthreds

# Port forward to service
kubectl port-forward -n srvthreds svc/srvthreds-session-agent-service 3000:3000

# Access in browser
open http://localhost:3000
```

### Image Management

```bash
# Set Docker to use Minikube's Docker daemon
eval $(minikube docker-env)

# List images in Minikube
docker images

# Build images
cd ../srvthreds
npm run deploymentCli -- minikube build_server

# Reset Docker environment
eval $(minikube docker-env -u)
```

### Database Access

```bash
# Connect to MongoDB
docker exec -it mongo-repl-1 mongosh

# Connect to Redis
docker exec -it redis redis-cli

# View database logs
docker logs mongo-repl-1
docker logs redis
```

## Troubleshooting

### Common Issues

#### Minikube Won't Start

```bash
# Check available resources
sysctl -n hw.ncpu  # macOS
nproc              # Linux

# Start with fewer resources
minikube start --cpus=2 --memory=4096
```

#### Docker Not Running

```bash
# Start Docker Desktop
open -a Docker  # macOS

# Verify Docker is running
docker info
```

#### Images Not Found

```bash
# Set Docker environment to Minikube
eval $(minikube docker-env)

# Verify images exist
docker images | grep srvthreds

# Rebuild if needed
cd ../srvthreds
npm run deploymentCli -- minikube build_server
```

#### Database Connection Failed

```bash
# Check databases are running
docker ps | grep mongo
docker ps | grep redis

# Start databases
cd ../srvthreds
npm run deploymentCli -- minikube s_a_dbs

# Test from Minikube
kubectl run -it --rm debug --image=busybox --restart=Never -- sh
telnet host.minikube.internal 27017
```

#### Pods Crashing

```bash
# Check logs
kubectl logs <pod-name> -n srvthreds

# Check previous container logs
kubectl logs <pod-name> -n srvthreds --previous

# Check events
kubectl get events -n srvthreds --sort-by='.lastTimestamp'
```

#### Namespace Stuck Terminating

```bash
# Force delete
kubectl delete namespace srvthreds --grace-period=0 --force

# Remove finalizers if stuck
kubectl get namespace srvthreds -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/srvthreds/finalize" -f -
```

### Cleanup and Reset

```bash
# Reset deployment (keeps cluster)
npm run minikube:reset

# Full cleanup
npm run minikube:cleanup

# Cleanup with databases
npm run k8s -- minikube cleanup --delete-dbs

# Manual full cleanup
minikube delete
docker stop mongo-repl-1 redis
docker rm mongo-repl-1 redis
docker system prune -a --volumes
```

## Next Steps

- [Azure Deployment Guide](AZURE_DEPLOYMENT.md) - Cloud deployment
- [Project Configuration Guide](PROJECT_CONFIGURATION.md) - Config system
- [Troubleshooting Guide](TROUBLESHOOTING.md) - Common issues
