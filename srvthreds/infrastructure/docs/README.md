# Infrastructure Documentation

Welcome to the SrvThreds infrastructure documentation. This guide will help you find the right documentation for your needs.

---

## 📚 Quick Navigation

**I want to...**

### Get Started
- **[Deploy locally for the first time](#getting-started)** → Start here!
- **[Understand the architecture](#architecture)** → System overview
- **[Configure services](#configuration)** → Environment variables and config

### Common Tasks
- **[Make configuration changes](#configuration-management)** → Edit ports, resources, paths
- **[Switch between environments](#deployment)** → Local, Docker, Kubernetes
- **[Troubleshoot issues](#troubleshooting)** → Debug problems
- **[Understand Git workflow](#developer-workflow)** → What to commit

### Advanced
- **[Production deployment](#deployment)** → Cloud deployment guide
- **[Security model](#security)** → Authentication and security
- **[Build system](#build-system)** → Docker builds and images

---

## 🚀 Getting Started

**First time setting up? Start here:**

1. **[DEPLOYMENT.md](DEPLOYMENT.md#local-development-docker-compose)** - Section: "Local Development (Docker Compose)"
   - Quick setup: `npm run deploy-local-up-all`
   - What gets installed: MongoDB, Redis, RabbitMQ, Services
   - How to verify it's working

2. **[CONFIGURATION.md](CONFIGURATION.md#quick-start)** - Section: "Quick Start"
   - Environment variables overview
   - Which `.env` file to use
   - Connection string format

**Estimated time: 10 minutes**

---

## ⚙️ Configuration Management

### Making Configuration Changes

All infrastructure configuration is centralized in `infrastructure/config-registry.yaml`. The deployment pipeline automatically generates and validates configs.

**Quick reference:**
```bash
# 1. Edit config
vim infrastructure/config-registry.yaml

# 2. Deploy (auto-generates and validates)
npm run deploy-local-up-all
```

**Key points:**
- Single source of truth: `config-registry.yaml`
- No manual config generation needed
- Automatic validation before deployment
- All Docker Compose, Kubernetes, and env files are auto-generated

### Understanding Configuration

**Application configuration (environment variables):**
- **[CONFIGURATION.md](CONFIGURATION.md)** - How the app reads config (MongoDB, Redis, RabbitMQ connection strings)

---

## 🚢 Deployment

### Switching Environments

- **[SWITCHING-DEPLOYMENTS.md](SWITCHING-DEPLOYMENTS.md)** - How to switch between local Docker and Kubernetes

### Local Development (Docker Compose)

- **[DEPLOYMENT.md](DEPLOYMENT.md#local-development-docker-compose)** - Docker Compose setup
- **[DEVELOPER-DEPLOYMENT-PATTERNS.md](DEVELOPER-DEPLOYMENT-PATTERNS.md)** - Common dev scenarios

### Kubernetes (Minikube)

- **[DEPLOYMENT.md](DEPLOYMENT.md#kubernetes-minikube)** - Minikube setup
- **[DEBUGGING-MINIKUBE.md](DEBUGGING-MINIKUBE.md)** - Minikube troubleshooting

### Production

- **[DEPLOYMENT.md](DEPLOYMENT.md#production-deployment)** - Cloud deployment guide

---

## 🔧 Troubleshooting

### General Issues

- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Comprehensive troubleshooting guide
  - Container issues
  - Database connection problems
  - Port conflicts
  - Build failures

### Specific Components

- **[TROUBLESHOOTING-RABBITMQ.md](TROUBLESHOOTING-RABBITMQ.md)** - RabbitMQ message routing issues
- **[DEBUGGING-MINIKUBE.md](DEBUGGING-MINIKUBE.md)** - Kubernetes/Minikube debugging
- **[WEBSOCKET-CLIENT-GUIDE.md](WEBSOCKET-CLIENT-GUIDE.md)** - WebSocket connection issues

---

## 🏗️ Architecture

### System Overview

See main README: [../README.md](../README.md)

### Build System

Docker build uses a multi-stage strategy:
- **Builder image**: Contains all compiled code at `/app/srvthreds/`
- **Production services**: Copy from builder into optimized runtime images
- **Bootstrap**: Uses builder image directly for npm scripts

---

## 🔒 Security

- **[PROGRESSIVE-SECURITY-MODEL.md](PROGRESSIVE-SECURITY-MODEL.md)** - Security approach
  - Authentication
  - Authorization
  - Progressive enhancement

---

## 👨‍💻 Developer Workflow

### Git Strategy

**What to commit:**
- ✅ `config-registry.yaml` - Single source of truth
- ✅ Documentation files
- ✅ Dockerfiles and scripts

**Don't commit:**
- ❌ Auto-generated configs (Docker Compose, Kubernetes manifests, env files)
- ❌ `.env` files (use `.env.example` templates)

### Common Patterns

- **[DEVELOPER-DEPLOYMENT-PATTERNS.md](DEVELOPER-DEPLOYMENT-PATTERNS.md)** - Common development scenarios
  - Backend + frontend development
  - Database-only development
  - Testing workflows

---

## 📖 Configuration System

All infrastructure configuration is managed through `infrastructure/config-registry.yaml`:
- Defines all services, databases, ports, paths, and resources
- Single source of truth for Docker Compose, Kubernetes, and env files
- Automatically generates and validates configs during deployment
- Reduces duplication from 238 port references down to 24 in registry + auto-generated files

---

## 📋 Documentation Index

### Essential (Read These First)

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [DEPLOYMENT.md](DEPLOYMENT.md) | How to deploy | First time setup, switching environments |
| [CONFIGURATION.md](CONFIGURATION.md) | Environment variables | Setting up connections, understanding config |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Fix issues | When something breaks |

### Workflow & Best Practices

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [SWITCHING-DEPLOYMENTS.md](SWITCHING-DEPLOYMENTS.md) | Switch Docker ↔ Kubernetes | Moving between environments |
| [DEVELOPER-DEPLOYMENT-PATTERNS.md](DEVELOPER-DEPLOYMENT-PATTERNS.md) | Common dev scenarios | Learning development workflows |

### Troubleshooting Guides

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | General issues | Something isn't working |
| [DEBUGGING-MINIKUBE.md](DEBUGGING-MINIKUBE.md) | Kubernetes issues | Minikube problems |
| [TROUBLESHOOTING-RABBITMQ.md](TROUBLESHOOTING-RABBITMQ.md) | RabbitMQ issues | Message routing problems |
| [WEBSOCKET-CLIENT-GUIDE.md](WEBSOCKET-CLIENT-GUIDE.md) | WebSocket issues | Client connection problems |

### Advanced / Reference

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [PROGRESSIVE-SECURITY-MODEL.md](PROGRESSIVE-SECURITY-MODEL.md) | Security architecture | Implementing security features |

---

## 🎯 Common Scenarios

### "I'm new to this project"

1. Read: [DEPLOYMENT.md](DEPLOYMENT.md) - Local Development section
2. Run: `npm run deploy-local-up-all`
3. Read: [DEVELOPER-DEPLOYMENT-PATTERNS.md](DEVELOPER-DEPLOYMENT-PATTERNS.md)
4. Keep handy: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### "I need to change a port/resource/path"

1. Edit: `infrastructure/config-registry.yaml`
2. Deploy: `npm run deploy-local-up-all` (auto-generates and validates)

### "Something's broken"

1. Check: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. If Kubernetes: [DEBUGGING-MINIKUBE.md](DEBUGGING-MINIKUBE.md)
3. If RabbitMQ: [TROUBLESHOOTING-RABBITMQ.md](TROUBLESHOOTING-RABBITMQ.md)
4. If WebSocket: [WEBSOCKET-CLIENT-GUIDE.md](WEBSOCKET-CLIENT-GUIDE.md)

### "I'm deploying to production"

1. Read: [DEPLOYMENT.md](DEPLOYMENT.md) - Production Deployment section
2. Read: [PROGRESSIVE-SECURITY-MODEL.md](PROGRESSIVE-SECURITY-MODEL.md)
3. Review: [CONFIGURATION.md](CONFIGURATION.md) - Production configuration

### "I want to understand the build system"

1. Examine: Dockerfiles in `infrastructure/local/docker/dockerfiles/`
   - `Dockerfile.builder` - Base image with all compiled code
   - `Dockerfile` - Production services
   - `Dockerfile.cmdRunner` - Bootstrap/utility scripts

---

## 🤔 FAQ

**Q: Which docs do I need to read?**

A: Start with the "Essential" section above. Most developers only need:
- DEPLOYMENT.md
- CONFIGURATION.md
- TROUBLESHOOTING.md

**Q: How do I change ports or resources?**

A: Edit `infrastructure/config-registry.yaml` and run any deployment command. Configs auto-generate.

**Q: What should I commit to git?**

A:
- ✅ Commit: `config-registry.yaml`, documentation, Dockerfiles
- ❌ Don't commit: Auto-generated configs, `.env` files

**Q: How do I switch from Docker to Kubernetes?**

A: [SWITCHING-DEPLOYMENTS.md](SWITCHING-DEPLOYMENTS.md) has the complete guide.

---

## 💡 Tips

1. **Use the search function** - All docs are searchable
2. **Start with DEPLOYMENT.md** - It's the main entry point
3. **Bookmark TROUBLESHOOTING.md** - You'll need it
4. **Config changes are automatic** - Just edit `config-registry.yaml` and deploy

---

## 📞 Getting Help

- **Can't find what you need?** Check the Table of Contents in each doc
- **Still stuck?** See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Found a bug in docs?** Please update and commit!

---

*Last updated: 2025-11-05*
