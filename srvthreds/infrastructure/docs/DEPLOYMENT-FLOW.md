# Deployment Flow Visualization

This document provides visual diagrams of how deployments work from CLI commands through to running containers/pods.

---

## Table of Contents

- [Docker Compose Deployment Flow](#docker-compose-deployment-flow)
- [Minikube/Kubernetes Deployment Flow](#minikubekubernetes-deployment-flow)
- [Configuration Generation Pipeline](#configuration-generation-pipeline)
- [Build Process Flow](#build-process-flow)

---

## Docker Compose Deployment Flow

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DOCKER COMPOSE DEPLOYMENT                        │
└─────────────────────────────────────────────────────────────────────────┘

  User Command
       ↓
┌─────────────────┐
│  npm run        │
│  deploy-local   │
│  -up-all        │
└────────┬────────┘
         ↓
┌────────────────────────────────────────────────────────────────────────┐
│                     Deployment CLI (cli.ts)                             │
│  - Reads: infrastructure/shared/configs/deployments/*.json              │
│  - Executes: Pre-build → Build → Up → Post-up                          │
└────────┬───────────────────────────────────────────────────────────────┘
         ↓
    ┌───────────────────────────────────────────────────────────┐
    │                   PRE-BUILD PHASE                          │
    │                                                            │
    │  1. Copy env config to assets/                            │
    │     └─→ infrastructure/local/configs/.env.docker          │
    │                                                            │
    │  2. Generate configs from registry                        │
    │     ├─→ shared/config/generator.ts                         │
    │     │   - Input: config-registry.yaml                     │
    │     │   - Output: docker-compose-*.yml, .env files        │
    │     │                                                      │
    │     └─→ shared/config/validator.ts                         │
    │         - Validates all generated configs                 │
    │                                                            │
    │  3. Build builder image                                   │
    │     └─→ docker compose build srvthreds-builder            │
    │         - Dockerfile: Dockerfile.builder                  │
    │         - Creates: srvthreds/builder:latest               │
    └───────────────────────────┬───────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │                      BUILD PHASE                          │
    │                                                           │
    │  Docker Compose reads:                                   │
    │  └─→ docker-compose-db.yml                               │
    │  └─→ docker-compose-services.yml                         │
    │                                                           │
    │  Builds images from builder:                             │
    │  ├─→ srvthreds/bootstrap:latest (Dockerfile.cmdRunner)   │
    │  ├─→ srvthreds/engine:latest (Dockerfile)                │
    │  ├─→ srvthreds/session-agent:latest (Dockerfile)         │
    │  └─→ srvthreds/persistence-agent:latest (Dockerfile)     │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │                       UP PHASE                            │
    │                                                           │
    │  Start databases:                                        │
    │  ├─→ mongo-repl-1 (MongoDB replica set)                 │
    │  ├─→ redis                                               │
    │  └─→ rabbitmq                                            │
    │                                                           │
    │  Start services:                                         │
    │  ├─→ srvthreds-bootstrap (runs once, exits)             │
    │  ├─→ srvthreds-engine                                   │
    │  ├─→ srvthreds-session-agent                            │
    │  └─→ srvthreds-persistence-agent                        │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │                   POST-UP PHASE                           │
    │                                                           │
    │  Cleanup:                                                │
    │  └─→ Remove deployment assets/                           │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
                        ┌───────────────┐
                        │   RUNNING     │
                        │   SERVICES    │
                        └───────────────┘
                                ↓
                    Access: localhost:3000
```

### Detailed Service Startup

```
Docker Container Startup Sequence
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                    DATABASES (FIRST)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  mongo-repl-1                                               │
│  ├─ Image: mongo:8.0                                        │
│  ├─ Port: 27017:27017                                       │
│  ├─ Volume: mongo-data                                      │
│  └─ Init: Replica set configuration                         │
│                                                              │
│  redis                                                       │
│  ├─ Image: redis:7-alpine                                   │
│  ├─ Port: 6379:6379                                         │
│  └─ Volume: redis-data                                      │
│                                                              │
│  rabbitmq                                                    │
│  ├─ Image: rabbitmq:3-management                            │
│  ├─ Ports: 5672:5672, 15672:15672                          │
│  └─ Volume: rabbitmq-data                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ (wait for healthy)
┌─────────────────────────────────────────────────────────────┐
│                 BOOTSTRAP (SECOND)                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  srvthreds-bootstrap                                        │
│  ├─ Image: srvthreds/bootstrap:latest                       │
│  ├─ Dockerfile: Dockerfile.cmdRunner                        │
│  ├─ Entrypoint: ["npm"]                                     │
│  ├─ Command: ["run", "bootstrap", "--", "-p", "ef-detection"]│
│  ├─ WorkDir: /app/srvthreds                                 │
│  └─ Purpose: Initialize patterns and configurations         │
│      - Loads patterns into MongoDB                          │
│      - Sets up initial data                                 │
│      - Exits when complete (restart: "no")                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ (depends_on: bootstrap)
┌─────────────────────────────────────────────────────────────┐
│                  SERVICES (THIRD)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  srvthreds-engine                                           │
│  ├─ Image: srvthreds/engine:latest                          │
│  ├─ Dockerfile: Dockerfile (production)                     │
│  ├─ Entrypoint: ["node"]                                    │
│  ├─ Command: ["dist-server/index.js", "-d"]                │
│  ├─ Port: 8082:8082                                         │
│  ├─ Environment:                                            │
│  │   - MONGO_HOST=mongo-repl-1:27017                       │
│  │   - REDIS_HOST=redis:6379                               │
│  │   - RABBITMQ_HOST=rabbitmq                              │
│  └─ Purpose: Main event processing engine                   │
│                                                              │
│  srvthreds-session-agent                                    │
│  ├─ Image: srvthreds/session-agent:latest                   │
│  ├─ Dockerfile: Dockerfile (production)                     │
│  ├─ Entrypoint: ["node"]                                    │
│  ├─ Command: ["dist-server/agent/agent.js",                │
│  │             "-c", "session_agent",                       │
│  │             "-i", "org.wt.session1", "-d"]              │
│  ├─ Ports: 3000:3000, 3001:3001                            │
│  ├─ Environment: (same as engine)                           │
│  └─ Purpose: Session management & WebSocket connections     │
│                                                              │
│  srvthreds-persistence-agent                                │
│  ├─ Image: srvthreds/persistence-agent:latest               │
│  ├─ Dockerfile: Dockerfile (production)                     │
│  ├─ Entrypoint: ["node"]                                    │
│  ├─ Command: ["dist-server/agent/agent.js",                │
│  │             "-c", "persistence_agent",                   │
│  │             "-i", "org.wt.persistence1", "-d"]          │
│  ├─ Environment: (same as engine)                           │
│  └─ Purpose: Data persistence operations                    │
└─────────────────────────────────────────────────────────────┘
                       ↓
              ┌────────────────┐
              │  All Running   │
              └────────────────┘
```

---

## Minikube/Kubernetes Deployment Flow

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      MINIKUBE/KUBERNETES DEPLOYMENT                      │
└─────────────────────────────────────────────────────────────────────────┘

  User Command
       ↓
┌─────────────────┐
│  npm run        │
│  minikube       │
│  -create        │
└────────┬────────┘
         ↓
┌────────────────────────────────────────────────────────────────────────┐
│              Deployment CLI → setup-minikube.sh                         │
└────────┬───────────────────────────────────────────────────────────────┘
         ↓
    ┌───────────────────────────────────────────────────────────┐
    │               MINIKUBE INITIALIZATION                      │
    │                                                            │
    │  1. Start Minikube cluster                                │
    │     └─→ minikube start --driver=docker                    │
    │         - CPUs: 4                                          │
    │         - Memory: 7836MB                                   │
    │         - Disk: 20GB                                       │
    │                                                            │
    │  2. Configure restart policy                              │
    │     └─→ docker update --restart=unless-stopped minikube   │
    │                                                            │
    │  3. Switch kubectl context                                │
    │     └─→ kubectl config use-context minikube               │
    │                                                            │
    │  4. Enable addons                                         │
    │     ├─→ ingress                                           │
    │     ├─→ metrics-server                                    │
    │     └─→ dashboard                                         │
    └───────────────────────────┬───────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │           BUILD IN MINIKUBE DOCKER ENV                    │
    │                                                           │
    │  1. Switch to Minikube Docker                            │
    │     └─→ eval $(minikube docker-env)                      │
    │                                                           │
    │  2. Generate configs                                     │
    │     └─→ shared/config/generator.ts                        │
    │         - Input: config-registry.yaml                    │
    │         - Output: K8s manifests, ConfigMap               │
    │                                                           │
    │  3. Build builder image IN MINIKUBE                      │
    │     └─→ docker compose build srvthreds-builder           │
    │         - Runs inside Minikube's Docker                  │
    │         - Creates: srvthreds/builder:latest              │
    │                                                           │
    │  4. Tag for Kubernetes                                   │
    │     └─→ docker tag srvthreds/builder:latest \           │
    │                    srvthreds:dev                         │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │             START HOST DATABASES                          │
    │                                                           │
    │  Switch back to host Docker:                             │
    │  └─→ eval $(minikube docker-env --unset)                 │
    │                                                           │
    │  Start databases on HOST (not in Minikube):              │
    │  ├─→ mongo-repl-1 (on host Docker)                       │
    │  ├─→ redis (on host Docker)                              │
    │  └─→ rabbitmq (on host Docker)                           │
    │                                                           │
    │  Verify MongoDB replica set health:                      │
    │  └─→ Check for PRIMARY node                              │
    │      - If unhealthy: Run setup-repl.sh                   │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │              DEPLOY TO KUBERNETES                         │
    │                                                           │
    │  kubectl apply -k manifests/minikube/                    │
    │                                                           │
    │  Creates:                                                │
    │  ├─→ Namespace: srvthreds                                │
    │  ├─→ ConfigMap: srvthreds-config                         │
    │  │   - MONGO_HOST=host.minikube.internal:27017          │
    │  │   - REDIS_HOST=host.minikube.internal:6379           │
    │  │   - RABBITMQ_HOST=host.minikube.internal             │
    │  │                                                        │
    │  ├─→ Deployments:                                        │
    │  │   ├─ srvthreds-bootstrap (Job-like)                  │
    │  │   ├─ srvthreds-engine                                │
    │  │   ├─ srvthreds-session-agent                         │
    │  │   └─ srvthreds-persistence-agent                     │
    │  │                                                        │
    │  └─→ Services:                                           │
    │      ├─ srvthreds-engine-service                         │
    │      └─ srvthreds-session-agent-service                  │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │              WAIT FOR READY                               │
    │                                                           │
    │  kubectl wait --for=condition=available                  │
    │    deployment/srvthreds-engine                           │
    │    deployment/srvthreds-session-agent                    │
    │    deployment/srvthreds-persistence-agent                │
    │    --timeout=300s -n srvthreds                           │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
    ┌──────────────────────────────────────────────────────────┐
    │              PORT FORWARDING                              │
    │                                                           │
    │  kubectl port-forward \                                  │
    │    svc/srvthreds-session-agent-service \                │
    │    3000:3000 -n srvthreds                                │
    └───────────────────────────┬──────────────────────────────┘
                                ↓
                        ┌───────────────┐
                        │   RUNNING     │
                        │    IN K8S     │
                        └───────────────┘
                                ↓
                    Access: localhost:3000
```

### Kubernetes Pod Startup

```
Kubernetes Pod Startup Sequence
═══════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                  HOST DATABASES (EXTERNAL)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Running on Host Docker (NOT in Kubernetes):                │
│  ├─ mongo-repl-1 → host.minikube.internal:27017            │
│  ├─ redis → host.minikube.internal:6379                     │
│  └─ rabbitmq → host.minikube.internal:5672                  │
│                                                              │
│  Why external?                                              │
│  └─ Kubernetes pods are ephemeral                           │
│     Databases need persistent state across deployments      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ (running and healthy)
┌─────────────────────────────────────────────────────────────┐
│                    NAMESPACE & CONFIG                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Namespace: srvthreds                                       │
│  └─ Isolates all resources                                  │
│                                                              │
│  ConfigMap: srvthreds-config                                │
│  └─ Environment variables for all pods:                     │
│     - MONGO_HOST=host.minikube.internal:27017              │
│     - REDIS_HOST=host.minikube.internal:6379               │
│     - RABBITMQ_HOST=host.minikube.internal                 │
│     - JWT config, etc.                                      │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                  BOOTSTRAP DEPLOYMENT                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Pod: srvthreds-bootstrap-xxxxx                             │
│  ├─ Image: srvthreds:dev (local, imagePullPolicy: Never)   │
│  ├─ Command: ["npm"]                                        │
│  ├─ Args: ["run", "bootstrap", "--", "-p", "ef-detection"] │
│  ├─ envFrom: ConfigMap (srvthreds-config)                   │
│  ├─ Resources:                                              │
│  │   - Memory: 128Mi request / 256Mi limit                 │
│  │   - CPU: 100m request / 200m limit                      │
│  └─ Purpose: Initialize patterns, runs once                 │
│                                                              │
│  Note: May crash/restart while databases initialize         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓ (loads patterns into MongoDB)
┌─────────────────────────────────────────────────────────────┐
│                  SERVICE DEPLOYMENTS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Deployment: srvthreds-engine                               │
│  ├─ Replicas: 1                                             │
│  ├─ Pod: srvthreds-engine-xxxxx                             │
│  │   ├─ Image: srvthreds:dev                                │
│  │   ├─ Command: ["node"]                                   │
│  │   ├─ Args: ["dist-server/index.js", "-d"]               │
│  │   ├─ envFrom: ConfigMap (srvthreds-config)               │
│  │   └─ Port: 8082                                          │
│  └─ Service: srvthreds-engine-service                       │
│      - Type: ClusterIP                                      │
│      - Port: 8082 → 8082                                    │
│                                                              │
│  Deployment: srvthreds-session-agent                        │
│  ├─ Replicas: 1                                             │
│  ├─ Pod: srvthreds-session-agent-xxxxx                      │
│  │   ├─ Image: srvthreds:dev                                │
│  │   ├─ Command: ["node"]                                   │
│  │   ├─ Args: ["dist-server/agent/agent.js",               │
│  │   │           "-c", "session_agent",                     │
│  │   │           "-i", "org.wt.session1", "-d"]            │
│  │   ├─ envFrom: ConfigMap (srvthreds-config)               │
│  │   └─ Ports: 3000, 3001                                   │
│  └─ Service: srvthreds-session-agent-service                │
│      - Type: ClusterIP                                      │
│      - Ports: 3000 → 3000, 3001 → 3001                     │
│                                                              │
│  Deployment: srvthreds-persistence-agent                    │
│  ├─ Replicas: 1                                             │
│  ├─ Pod: srvthreds-persistence-agent-xxxxx                  │
│  │   ├─ Image: srvthreds:dev                                │
│  │   ├─ Command: ["node"]                                   │
│  │   ├─ Args: ["dist-server/agent/agent.js",               │
│  │   │           "-c", "persistence_agent",                 │
│  │   │           "-i", "org.wt.persistence1", "-d"]        │
│  │   └─ envFrom: ConfigMap (srvthreds-config)               │
│  └─ No Service (internal communication only)                │
└─────────────────────────────────────────────────────────────┘
                       ↓
              ┌────────────────┐
              │  All Running   │
              │    in K8s      │
              └────────────────┘
```

---

## Configuration Generation Pipeline

```
Configuration Generation Flow
════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                   SINGLE SOURCE OF TRUTH                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              infrastructure/config-registry.yaml             │
│                                                              │
│  Defines:                                                   │
│  ├─ Services (builder, bootstrap, engine, agents)          │
│  ├─ Databases (mongo, redis, rabbitmq)                     │
│  ├─ Ports (3000, 3001, 8082, etc.)                         │
│  ├─ Commands (entrypoint + args)                           │
│  ├─ Resources (CPU, memory limits)                         │
│  ├─ Dockerfiles (which to use for each service)            │
│  └─ Connection strings (local, docker, kubernetes, etc.)   │
└───────────────────────────┬─────────────────────────────────┘
                            ↓
    ┌───────────────────────────────────────────────────────────┐
    │      Config Generator (shared/config/generator.ts)          │
    └───────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │         Generates All Configs          │
        └───────────────────────────────────────┘
                            ↓
    ┌──────────────────────┬────────────────────┬──────────────┐
    ↓                      ↓                    ↓              ↓
┌──────────┐     ┌──────────────┐    ┌──────────────┐   ┌──────────┐
│  Docker  │     │ Kubernetes   │    │    .env      │   │  Agent   │
│ Compose  │     │  Manifests   │    │    Files     │   │ Configs  │
└──────────┘     └──────────────┘    └──────────────┘   └──────────┘
     ↓                   ↓                    ↓                ↓
     │                   │                    │                │
     ├─ docker-compose-  ├─ Deployments:     ├─ .env.local    ├─ bootstrap
     │  db.yml           │  - bootstrap       ├─ .env.docker   │  .config.json
     │                   │  - engine          ├─ .env.k8s      ├─ engine
     ├─ docker-compose-  │  - session-agent  └─ .env.minikube │  .config.json
     │  services.yml     │  - persistence
     │                   │    agent
     │                   │
     │ Generated:        ├─ Services:
     │ - service.image   │  - engine-svc
     │ - entrypoint[]    │  - session-svc
     │ - command[]       │
     │ - environment[]   ├─ ConfigMaps:
     │ - ports[]         │  - srvthreds-
     │ - networks[]      │    config
     │ - depends_on[]    │
     │ - build context   │ Generated:
     │                   │ - command[]
     │                   │ - args[]
     │                   │ - envFrom[]
     │                   │ - ports[]
     │                   │ - resources
     └───────────────────┴──────────────────
                            ↓
    ┌───────────────────────────────────────────────────────────┐
    │     Config Validator (shared/config/validator.ts)           │
    │                                                            │
    │  Validates:                                               │
    │  ├─ Port consistency across all files                     │
    │  ├─ Service names match                                   │
    │  ├─ Required fields present                               │
    │  ├─ Command format correct                                │
    │  └─ No conflicts or duplicates                            │
    └───────────────────────────────────────────────────────────┘
                            ↓
                   ┌─────────────────┐
                   │ ✅ Ready to Use  │
                   └─────────────────┘
```

### How Commands are Transformed

```
Command Transformation Example
═══════════════════════════════

config-registry.yaml:
────────────────────
services:
  session-agent:
    command:
      entrypoint: node
      args:
        - dist-server/agent/agent.js
        - -c
        - session_agent
        - -i
        - org.wt.session1
        - -d

         ↓ (shared/config/generator.ts processes)

Docker Compose:
───────────────
services:
  srvthreds-session-agent:
    entrypoint:
      - node
    command:
      - dist-server/agent/agent.js
      - '-c'
      - session_agent
      - '-i'
      - org.wt.session1
      - '-d'

         ↓ (Docker merges for execution)

Docker Execution:
─────────────────
node dist-server/agent/agent.js -c session_agent -i org.wt.session1 -d

         │
         │
         ↓ (shared/config/generator.ts processes)

Kubernetes Manifest:
────────────────────
spec:
  containers:
    - name: srvthreds-session-agent
      command:
        - node
      args:
        - dist-server/agent/agent.js
        - '-c'
        - session_agent
        - '-i'
        - org.wt.session1
        - '-d'

         ↓ (Kubernetes merges for execution)

Kubernetes Execution:
─────────────────────
node dist-server/agent/agent.js -c session_agent -i org.wt.session1 -d
```

---

## Build Process Flow

```
Multi-Stage Docker Build
════════════════════════

┌─────────────────────────────────────────────────────────────┐
│                      BUILDER IMAGE                           │
│                 (Dockerfile.builder)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FROM node:20-alpine                                        │
│  WORKDIR /app                                               │
│                                                              │
│  Step 1: Build thredlib (shared library)                    │
│  ├─ COPY thredlib/ ./thredlib/                              │
│  ├─ cd thredlib && npm ci && npm run build-all              │
│  └─ Output: /app/thredlib/lib/**/*.js                       │
│                                                              │
│  Step 2: Build srvthreds                                    │
│  ├─ COPY srvthreds/ ./srvthreds/                            │
│  ├─ cd srvthreds && npm ci                                  │
│  ├─ npm run build                                           │
│  │   ├─ Transpile TypeScript → JavaScript                   │
│  │   ├─ Copy web assets                                     │
│  │   └─ Copy config files                                   │
│  └─ Output: /app/srvthreds/dist-server/**/*.js              │
│                                                              │
│  Step 3: Add deployment assets                              │
│  ├─ COPY run-profiles/ ./dist-server/run-profiles/         │
│  ├─ COPY infrastructure/.../assets/.env ./dist-server/     │
│  └─ Output: /app/srvthreds/dist-server/                     │
│                                                              │
│  Result: srvthreds/builder:latest                           │
│  Size: ~500MB (includes all source + compiled code)         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                                 ↓
┌──────────────────┐            ┌──────────────────┐
│ PRODUCTION IMAGE │            │   CMD RUNNER     │
│  (Dockerfile)    │            │(Dockerfile.cmd   │
│                  │            │    Runner)       │
└──────────────────┘            └──────────────────┘
        ↓                                 ↓
        │                                 │
        │  FROM node:20-alpine            │  FROM builder:latest
        │  WORKDIR /app                   │  WORKDIR /app/srvthreds
        │                                 │
        │  Copy package*.json             │  Uses builder directly
        │  npm ci --only=production       │  (no npm install needed)
        │                                 │
        │  COPY --from=builder            │  Default CMD:
        │    /app/srvthreds/dist-server   │  npm run bootstrap
        │    ./dist-server                │
        │                                 │  Used for:
        │  Create non-root user           │  - Bootstrap jobs
        │  chown -R srvthreds:nodejs      │  - One-time scripts
        │                                 │
        │  USER srvthreds                 │  Size: ~500MB
        │                                 │  (same as builder)
        │  ENTRYPOINT ["node",            │
        │    "dist-server/index.js"]      │
        │                                 │
        │  CMD ["--service-type",         │
        │       "engine", ...]            │
        │                                 │
        │  Used for:                      │
        │  - Engine                       │
        │  - Session Agent                │
        │  - Persistence Agent            │
        │                                 │
        │  Size: ~200MB                   │
        │  (optimized, production only)   │
        └─────────────────────────────────┘

Why this architecture?
──────────────────────
1. Builder: Contains EVERYTHING (source + compiled)
   - Used as base for all other images
   - Single build, reused everywhere
   - Ensures consistency

2. Production: Optimized runtime
   - Only production dependencies
   - Only compiled code (no source)
   - Smaller size
   - Better security (no dev tools)

3. CmdRunner: For utility scripts
   - Direct access to builder image
   - Can run npm scripts
   - Used for bootstrap, migrations, etc.
```

### Image Relationships

```
Image Dependency Graph
══════════════════════

                    node:20-alpine
                          ↓
              ┌───────────────────────┐
              │  srvthreds/builder    │
              │                       │
              │  /app/thredlib/lib/   │
              │  /app/srvthreds/      │
              │    dist-server/       │
              │                       │
              │  ~500MB               │
              └───────────┬───────────┘
                          ↓
         ┌────────────────┴────────────────┐
         ↓                                 ↓
┌────────────────────┐         ┌──────────────────────┐
│ Production Images  │         │    Cmd Runner        │
│                    │         │                      │
│ engine:latest      │         │  bootstrap:latest    │
│ session-agent      │         │                      │
│ persistence-agent  │         │  Direct use of       │
│                    │         │  builder image       │
│ Optimized:         │         │                      │
│ - Prod deps only   │         │  Full access to:     │
│ - No source        │         │  - npm scripts       │
│ - Non-root user    │         │  - All tooling       │
│                    │         │                      │
│ ~200MB each        │         │  ~500MB              │
└────────────────────┘         └──────────────────────┘
         ↓                                 ↓
         │                                 │
    Running Services              One-time Bootstrap
    - Long-lived                  - Runs once
    - HTTP servers                - Initializes data
    - WebSocket                   - Exits when done
```

---

## Key Differences: Docker vs Kubernetes

```
Docker Compose vs Kubernetes
════════════════════════════

┌─────────────────────────┬─────────────────────────┐
│    Docker Compose       │      Kubernetes         │
├─────────────────────────┼─────────────────────────┤
│                         │                         │
│ Databases:              │ Databases:              │
│ ├─ Run in containers    │ ├─ Run on HOST Docker   │
│ ├─ On srvthreds-net     │ ├─ host.minikube.       │
│ └─ Direct connections   │ │   internal            │
│                         │ └─ Cross-VM access      │
│                         │                         │
│ Services:               │ Services:               │
│ ├─ Individual containers│ ├─ Pods in namespace    │
│ ├─ Direct port mapping  │ ├─ Services for routing │
│ │   (3000:3000)         │ ├─ Port-forward needed  │
│ └─ depends_on for order │ │   for external access │
│                         │ └─ Self-healing         │
│                         │     (restarts failures) │
│                         │                         │
│ Environment:            │ Environment:            │
│ ├─ environment: []      │ ├─ ConfigMap            │
│ └─ .env files           │ ├─ envFrom:             │
│                         │ │   configMapRef        │
│                         │ └─ Centralized config   │
│                         │                         │
│ Images:                 │ Images:                 │
│ ├─ Pull from registry   │ ├─ Pre-built in         │
│ │   or local build      │ │   Minikube Docker     │
│ └─ Tag: latest          │ ├─ imagePullPolicy:     │
│                         │ │   Never               │
│                         │ └─ Tag: dev             │
│                         │                         │
│ Networking:             │ Networking:             │
│ ├─ Bridge network       │ ├─ CNI (bridge)         │
│ ├─ Service discovery    │ ├─ DNS-based discovery  │
│ │   by container name   │ │   (service-name.      │
│ └─ localhost access     │ │   namespace.svc)      │
│                         │ └─ Port-forward for     │
│                         │     localhost access    │
│                         │                         │
│ Scaling:                │ Scaling:                │
│ └─ Manual (edit file)   │ ├─ kubectl scale        │
│                         │ └─ replicas: N          │
│                         │                         │
│ Best for:               │ Best for:               │
│ ├─ Local development    │ ├─ Production-like      │
│ ├─ Quick iteration      │ ├─ Testing K8s features │
│ └─ Simple setup         │ └─ Learning K8s         │
└─────────────────────────┴─────────────────────────┘
```

---

## Troubleshooting Quick Reference

```
Common Issues & Solutions
═════════════════════════

Docker Compose:
───────────────
❌ Port already in use
   └─→ docker ps (check running containers)
   └─→ lsof -i :3000 (check what's using port)
   └─→ npm run deploy-local-down-all

❌ Container won't start
   └─→ docker logs <container-name>
   └─→ Check: MONGO_HOST, REDIS_HOST connectivity

❌ MongoDB replica set issues
   └─→ bash infrastructure/local/docker/scripts/setup-repl.sh

Kubernetes:
───────────
❌ Pod CrashLoopBackOff
   └─→ kubectl logs <pod-name> -n srvthreds
   └─→ kubectl describe pod <pod-name> -n srvthreds
   └─→ Check: host.minikube.internal connectivity

❌ ImagePullBackOff
   └─→ Verify: imagePullPolicy: Never
   └─→ Check: image exists in Minikube Docker
       eval $(minikube docker-env)
       docker images | grep srvthreds

❌ ConfigMap not loading
   └─→ kubectl get configmap -n srvthreds
   └─→ kubectl describe configmap srvthreds-config -n srvthreds
   └─→ Verify: envFrom in pod spec

❌ Can't connect to databases
   └─→ Verify host databases running:
       docker ps | grep -E 'mongo|redis|rabbitmq'
   └─→ Test connectivity from pod:
       kubectl exec -it <pod> -n srvthreds -- \
         ping host.minikube.internal

Configuration:
──────────────
❌ Changes not taking effect
   └─→ Re-run config generation:
       npx tsx infrastructure/tools/shared/config/generator.ts
   └─→ Validate:
       npx tsx infrastructure/tools/shared/config/validator.ts
```

---

## Next Phase: Terraform & Cloud

The next phase will add similar visualizations for:

1. **Terraform Infrastructure as Code**
   - AWS/GCP/Azure resource provisioning
   - State management
   - Module organization

2. **Cloud Deployment (EKS/GKE/AKS)**
   - Managed Kubernetes deployment
   - Load balancers and ingress
   - Cloud-native databases (RDS, Cloud SQL, etc.)
   - Secrets management (AWS Secrets Manager, etc.)
   - CI/CD pipelines

3. **Production Considerations**
   - Multi-region deployment
   - Auto-scaling configuration
   - Monitoring & observability
   - Backup & disaster recovery

---

*Last updated: 2025-11-05*
