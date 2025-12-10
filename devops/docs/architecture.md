# System Architecture

This document describes the architecture of the DevOps toolkit, including component relationships, design patterns, and data flow.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLI Layer                                   │
├─────────────────────────────┬───────────────────────────────────────────┤
│      terraform-cli          │           kubernetes-cli                   │
│  (Infrastructure Mgmt)      │       (Deployment Orchestration)          │
└──────────────┬──────────────┴──────────────────┬────────────────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────┐    ┌─────────────────────────────────────────┐
│    TerraformManager      │    │         kubernetes-deployer              │
│  (Terraform Operations)  │    │  ┌─────────────┬─────────────────────┐  │
└──────────────┬───────────┘    │  │ Minikube    │    AKS Deployer     │  │
               │                │  │ Deployer    │                     │  │
               │                │  └──────┬──────┴──────────┬──────────┘  │
               │                │         │                 │              │
               │                │         ▼                 ▼              │
               │                │  ┌──────────────────────────────────┐   │
               │                │  │      KubernetesClient            │   │
               │                │  │    (kubectl wrapper)             │   │
               │                │  └──────────────────────────────────┘   │
               │                └─────────────────────────────────────────┘
               │                                  │
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Shared Utilities                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │
│  │   Logger    │  │   Shell     │  │   Error     │  │    Config      │  │
│  │             │  │  Executor   │  │  Handler    │  │    Loader      │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
               │                                  │
               ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Project Configuration                             │
│                    projects/{project}/project.yaml                       │
│                    projects/{project}/deployments/                       │
│                    projects/{project}/terraform/                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### CLI Layer

#### terraform-cli
- Parses command-line arguments
- Routes to appropriate command handlers
- Manages Terraform operations (init, plan, apply, destroy)
- Handles state management and recovery
- Validates Azure security configuration

#### kubernetes-cli
- Parses command-line arguments using Yargs
- Routes to minikube or AKS command handlers
- Loads project configuration
- Formats deployment results

### Execution Layer

#### TerraformManager
- Executes Terraform commands
- Manages backend configuration
- Handles state file operations
- Processes Terraform output

#### kubernetes-deployer

##### BaseDeployer (Abstract)
Defines the deployment contract with lifecycle methods:
1. `preDeployChecks()` - Verify prerequisites
2. `buildImages()` - Build container images
3. `pushImages()` - Push to registry
4. `applyManifests()` - Apply Kubernetes manifests
5. `waitForReadiness()` - Wait for pods
6. `runValidation()` - Health checks

##### MinikubeDeployer
- Local development deployment
- Docker environment configuration
- Host database setup
- No registry push (local Docker)

##### AKSDeployer
- Azure cloud deployment
- ACR registry integration
- Multi-environment support
- Azure naming conventions

##### KubernetesClient
- Type-safe kubectl wrapper
- Supports apply, delete, get, logs
- Namespace and context management
- Kustomize support

### Shared Utilities

| Utility | Purpose |
|---------|---------|
| **Logger** | Structured logging with levels and context |
| **ShellExecutor** | Command execution with error handling |
| **ErrorHandler** | Centralized error handling with exit codes |
| **ConfigLoader** | JSON/YAML configuration loading with caching |

## Data Flow

### Terraform Deployment Flow

```
1. User: terraform-cli deploy -p srvthreds dev
                    │
2. CLI:             ▼
   ┌────────────────────────────────────┐
   │ Parse args, load project config    │
   │ Load stacks.json, environments.json│
   └────────────────┬───────────────────┘
                    │
3. Order:           ▼
   ┌────────────────────────────────────┐
   │ Sort stacks by dependencies        │
   │ (networking → keyvault → aks)      │
   └────────────────┬───────────────────┘
                    │
4. For each stack:  ▼
   ┌────────────────────────────────────┐
   │ terraform init                     │
   │ terraform plan                     │
   │ terraform apply (if not dry-run)   │
   └────────────────┬───────────────────┘
                    │
5. Output:          ▼
   ┌────────────────────────────────────┐
   │ Display results, resources created │
   └────────────────────────────────────┘
```

### Kubernetes Deployment Flow

```
1. User: k8s minikube deploy -p srvthreds
                    │
2. CLI:             ▼
   ┌────────────────────────────────────┐
   │ Parse args with Yargs              │
   │ Load project.yaml                  │
   └────────────────┬───────────────────┘
                    │
3. Deployer:        ▼
   ┌────────────────────────────────────┐
   │ Create MinikubeDeployer instance   │
   │ Load deployment configs            │
   └────────────────┬───────────────────┘
                    │
4. Pre-checks:      ▼
   ┌────────────────────────────────────┐
   │ Verify Docker running              │
   │ Verify/start Minikube cluster      │
   │ Set kubectl context                │
   └────────────────┬───────────────────┘
                    │
5. Build:           ▼
   ┌────────────────────────────────────┐
   │ Execute deployment by shortName    │
   │ Run preBuildCommands               │
   │ Run docker compose build/up        │
   │ Run postUpCommands                 │
   └────────────────┬───────────────────┘
                    │
6. Deploy:          ▼
   ┌────────────────────────────────────┐
   │ Apply Kubernetes manifests         │
   │ Wait for pod readiness             │
   │ Run health checks                  │
   └────────────────┬───────────────────┘
                    │
7. Output:          ▼
   ┌────────────────────────────────────┐
   │ Format and display results         │
   │ Show next steps                    │
   └────────────────────────────────────┘
```

## Design Patterns

### 1. Configuration-Driven Architecture

All behavior is driven by configuration files:
- `project.yaml` - Project-level settings
- `deployments/*.json` - Deployment definitions
- `stacks.json` - Infrastructure stack definitions
- `environments.json` - Environment-specific settings

This enables:
- No hardcoded values in code
- Easy addition of new projects
- Environment-specific overrides

### 2. Dependency Graph Processing

Infrastructure stacks declare dependencies:

```json
{
  "stacks": [
    { "name": "networking", "dependencies": [] },
    { "name": "keyvault", "dependencies": ["networking"] },
    { "name": "aks", "dependencies": ["networking", "keyvault"] }
  ]
}
```

The system:
- Topologically sorts stacks for deployment
- Reverse sorts for destruction
- Validates no circular dependencies

### 3. Template Method Pattern

`BaseDeployer` defines the deployment algorithm skeleton:

```typescript
abstract class BaseDeployer {
  async deploy(): Promise<DeploymentResult> {
    await this.preDeployChecks();    // Subclass implements
    await this.buildImages();         // Subclass implements
    await this.pushImages();          // Subclass implements
    await this.applyManifests();      // Subclass implements
    await this.waitForReadiness();    // Subclass implements
    return this.runValidation();      // Subclass implements
  }
}
```

Subclasses (`MinikubeDeployer`, `AKSDeployer`) provide specific implementations.

### 4. Strategy Pattern for Environments

Deployment behavior varies by environment:

```typescript
// In deployment config
{
  "target": {
    "deployCommand": "up",
    "environmentOverrides": {
      "minikube": {
        "preBuildCommands": [/* minikube-specific */]
      },
      "dev": {
        "preBuildCommands": [/* AKS dev-specific */]
      }
    }
  }
}
```

### 5. Centralized Error Handling

All errors flow through specialized error classes:

```typescript
class CLIError extends Error { exitCode = 1; }
class ValidationError extends CLIError { exitCode = 2; }
class ConfigError extends CLIError { exitCode = 3; }
class ExecutionError extends CLIError { exitCode = 4; }
class AzureError extends CLIError { exitCode = 5; }
class TerraformError extends CLIError { exitCode = 6; }
```

This enables:
- Consistent error messages
- Appropriate exit codes for scripting
- Centralized error logging

## State Management

### Terraform State
- Remote state stored in Azure Storage Account
- Per-environment state files
- Backend configuration in `environments.json`
- State backup and recovery commands

### Deployment State
- `DeploymentState` class tracks deployment progress
- Records: status, resources, timestamps, image tags
- Enables rollback to previous deployments

## Security Considerations

### Azure Infrastructure
- Security validation command checks:
  - Resource group locks
  - Network security (VNet, NSG)
  - Private endpoints
  - AKS cluster security
  - RBAC configuration
  - Encryption settings

### CLI Security
- No credentials stored in code
- Uses Azure CLI authentication
- Supports dry-run for all destructive operations
- Confirmation prompts for destructive actions

## Extension Points

### Adding a New Project
1. Create `projects/{project}/project.yaml`
2. Create deployment configs in `projects/{project}/deployments/`
3. Create Terraform stacks in `projects/{project}/terraform/`
4. Create Kubernetes manifests
5. Add npm scripts to `package.json`

### Adding a New Deployer
1. Extend `BaseDeployer`
2. Implement all abstract methods
3. Add to `kubernetes-deployer/src/index.ts` exports
4. Create CLI command in `kubernetes-cli/commands/`

### Adding a New Terraform Command
1. Create command file in `terraform-cli/commands/`
2. Export command function
3. Add to command dispatcher in `cli.ts`
4. Update help text
