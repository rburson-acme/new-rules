# Deployment Configuration Files

This directory contains deployment configurations split by logical concerns, replacing the monolithic `containerDeploymentConfig.json`.

## File Organization

### **databases.json** - Database Operations
Contains deployments for managing database containers:
- `s_a_dbs` - Start databases (MongoDB, Redis, RabbitMQ)
- `d_a_dbs` - Stop databases

**Why separate?** Database lifecycle is independent from application services. You often need to start databases before services or keep them running between service restarts.

### **services.json** - Application Services
Contains deployments for managing application containers:
- `s_a_s` - Start all services
- `d_a_s` - Stop all services
- `s_a_dbs_s` - Start databases + services
- `d_a_dbs_s` - Stop databases + services
- `s_s` / `d_s` - Individual engine control
- `s_sa` / `d_sa` - Individual session agent control
- `s_pa` / `d_pa` - Individual persistence agent control
- `bootstrap` - Run bootstrap job

**Why separate?** Service deployments are the most frequently modified configs and need to be easily accessible.

### **build.json** - Build Operations
Contains deployments for building Docker images:
- `build_server` - Build base server image

**Why separate?** Build operations have different concerns (cache management, optimization flags) than runtime operations.

### **kubernetes.json** - Kubernetes Operations
Contains deployments for Kubernetes/Minikube:
- `k8s_minikube` - Full Minikube deployment
- `k8s_apply` - Apply manifests
- `set_context` - Switch kubectl context
- `k8s_reset` - Reset namespace
- `k8s_cleanup` - Full cleanup

**Why separate?** Kubernetes deployments have fundamentally different lifecycles and tooling (kubectl, kustomize) than Docker Compose.

## Usage

The deployment CLI automatically loads all `*.json` files from this directory and merges them into a single deployment registry.

```bash
# All commands work exactly the same as before
npm run deploymentCli local s_a_dbs_s
npm run deploymentCli minikube k8s_minikube
npm run deploymentCli local build_server
```

## Environment Overrides

Environment-specific overrides (like `local`, `minikube`, `dev`) are defined inline within each deployment under `target.environmentOverrides`.

For cross-cutting environment configs, see `../environments/` directory.

## Adding New Deployments

1. Choose the appropriate file based on what the deployment does:
   - Managing databases? → `databases.json`
   - Managing services? → `services.json`
   - Building images? → `build.json`
   - Kubernetes operations? → `kubernetes.json`

2. Add your deployment object to the `deployments` array:
```json
{
  "name": "Descriptive Name",
  "shortName": "short_cmd",
  "description": "What this deployment does",
  "environments": ["local", "dev"],
  "target": {
    "composing": "service",
    "deployCommand": "up",
    "composeFile": "docker-compose-services.yml",
    "defaultArgs": "my-service -d --wait"
  }
}
```

3. Test your new deployment:
```bash
npm run deploymentCli local short_cmd
```

## Migration Notes

### Before (Monolithic)
```
infrastructure/deployment/configs/containerDeploymentConfig.json  (471 lines)
```

### After (Modular)
```
infrastructure/deployment/configs/deployments/
├── databases.json    (~50 lines)
├── services.json     (~300 lines)
├── build.json        (~40 lines)
└── kubernetes.json   (~80 lines)
```

**Benefits**:
- Easier to find specific deployments
- Reduced merge conflicts (team members typically work on different concerns)
- Clearer separation of responsibilities
- Better for code reviews (smaller, focused changes)

## Future: Environment-Specific Files

For cloud deployments, environment-specific files in `../environments/` can override base configs:
- `local.json` - Local development overrides
- `minikube.json` - Minikube-specific settings
- `dev.json` - Cloud dev environment
- `staging.json` - Cloud staging environment
- `prod.json` - Cloud production environment

This approach scales better than inline `environmentOverrides` when you have many environments with complex differences.
