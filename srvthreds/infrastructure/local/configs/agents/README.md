# Agent Configuration Files

This directory contains configuration files for SrvThreds agents that define their runtime behavior across different deployment environments (Docker Compose, Kubernetes, cloud).

## Purpose

These configuration files serve as the **single source of truth** for agent startup commands, resource limits, and port mappings. This eliminates hardcoded values in:
- `docker-compose-services.yml`
- Kubernetes deployment manifests
- Terraform configurations

## File Structure

Each agent has a corresponding `.config.json` file:

- **`engine.config.json`** - Main event processing engine
- **`session-agent.config.json`** - User session and participant management
- **`persistence-agent.config.json`** - Database persistence operations
- **`bootstrap.config.json`** - One-time database initialization

## Configuration Schema

```json
{
  "name": "Agent Name",
  "description": "What this agent does",
  "command": {
    "entrypoint": "node",           // Main executable
    "args": ["path/to/script.js"]   // Command-line arguments
  },
  "ports": {
    "http": 3000                    // Port mappings (optional)
  },
  "resources": {
    "memory": {
      "request": "128Mi",           // Minimum memory
      "limit": "256Mi"              // Maximum memory
    },
    "cpu": {
      "request": "100m",            // Minimum CPU (millicores)
      "limit": "300m"               // Maximum CPU
    }
  },
  "runOnce": false                  // If true, run once and exit (like bootstrap)
}
```

## Usage

### Docker Compose

The deployment CLI reads these configs and generates appropriate `command` directives:

```yaml
srvthreds-engine:
  command: ["node", "/app/dist-server/index.js", "-d"]
```

### Kubernetes

Manifests reference these configs for `command`, `resources`, and `ports`:

```yaml
spec:
  containers:
  - name: engine
    command: ["node", "/app/dist-server/index.js", "-d"]
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
```

### Creating Multiple Agent Instances

To spin up multiple instances of an agent with different configs:

1. Copy the base config file (e.g., `session-agent.config.json` → `session-agent-2.config.json`)
2. Modify the `args` to change the instance ID:
   ```json
   "args": ["/app/dist-server/agent/agent.js", "-c", "session_agent", "-i", "org.wt.session2", "-d"]
   ```
3. Update your deployment config to reference the new file

## Configuration Parameters

### Command Arguments Explained

#### Engine
- `-d` - Debug mode (verbose logging)

#### Session Agent
- `-c session_agent` - Config name to load from database (`session_agent.json`)
- `-i org.wt.session1` - Node instance ID
- `-d` - Debug mode

#### Persistence Agent
- `-c persistence_agent` - Config name to load from database (`persistence_agent.json`)
- `-d` - Debug mode

#### Bootstrap
- `-p ef-detection` - Profile name to load patterns and config from

### Resource Limits

Resource limits follow Kubernetes conventions:
- **Memory**: `Mi` = Mebibytes (1 Mi = 1.048576 MB)
- **CPU**: `m` = millicores (1000m = 1 CPU core)

**Example**:
- `256Mi` = 256 Mebibytes = ~268 MB
- `200m` = 0.2 CPU cores = 20% of one core

## Best Practices

1. **Version Control**: Always commit agent config changes
2. **Documentation**: Update `description` when changing behavior
3. **Resource Tuning**: Monitor actual usage and adjust limits accordingly
4. **Testing**: Test config changes in local/minikube before production
5. **Consistency**: Keep resource limits consistent across similar agents

## Migration Notes

### From Hardcoded Commands

**Before** (hardcoded in docker-compose):
```yaml
srvthreds-engine:
  command: ["node", "/app/dist-server/index.js", "-d"]
```

**After** (read from config):
```yaml
srvthreds-engine:
  # Command generated from engine.config.json
```

### Cloud Deployment

These configs are designed to be cloud-agnostic and work with:
- AWS ECS/EKS
- Google Cloud Run/GKE
- Azure Container Instances/AKS

Terraform modules can read these configs to generate appropriate resource definitions.

## Troubleshooting

### Agent Won't Start

**Check**:
1. Config file syntax is valid JSON
2. `command.entrypoint` path is correct for your Docker image
3. All required arguments are present in `command.args`

### Resource Limits Too Low

**Symptoms**: Agent crashes with OOMKilled or CPU throttling

**Fix**: Increase `resources.limits.memory` or `resources.limits.cpu`

### Port Conflicts

**Issue**: Multiple agents trying to use same port

**Fix**: Update `ports` in respective config files to use different ports
