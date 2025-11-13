# Kubernetes Deployer Framework

TypeScript-based Kubernetes deployment framework for SrvThreds. Provides type-safe, testable deployment automation for Minikube and Azure AKS environments.

## 🎯 Purpose

Replace shell script-based deployments with TypeScript classes that provide:
- **Type Safety** - Compile-time validation of deployment configurations
- **Testability** - Comprehensive unit and integration testing
- **Maintainability** - Clear, documented code structure
- **Reusability** - Shared components across deployment targets
- **Error Handling** - Sophisticated error handling and rollback capabilities

## 📁 Structure

```
kubernetes-deployer/
├── src/
│   ├── deployers/         # Deployment implementations (BaseDeployer, MinikubeDeployer, AKSDeployer)
│   ├── operations/        # Kubernetes operations (KubernetesClient, ImageBuilder, etc.)
│   ├── state/            # Deployment state management
│   ├── config/           # Configuration loading and resolution
│   ├── utils/            # Utilities (Logger, ShellExecutor, retry logic)
│   └── types/            # TypeScript type definitions
├── test/
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test data and mocks
└── README.md
```

## 🚀 Usage

### Basic Example

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({
  dryRun: false,
  verbose: true
});

const result = await deployer.deploy();

if (result.success) {
  console.log('Deployment successful!');
} else {
  console.error('Deployment failed:', result.errors);
}
```

### With Rollback

```typescript
import { AKSDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new AKSDeployer('azure-dev', azureConfig, {
  autoRollback: true  // Automatically rollback on failure
});

try {
  await deployer.deploy();
} catch (error) {
  // Rollback already happened automatically
  console.error('Deployment failed and rolled back');
}
```

## 🧪 Testing

Uses the project's existing Vitest testing framework. Run from the root directory:

```bash
# Run all tests
npm test

# Run tests for changed files only
npm run test-changed

# Type check
npm run check
```

## 🏗️ Development

This tool is integrated into the main SrvThreds build pipeline:

```bash
# Type check (from root)
npm run check

# Build production bundle (from root)
npm run build

# Format code (from root)
npm run format
```

## 📚 Documentation

See [KUBERNETES-DEPLOYMENT-REFACTOR.md](../../docs/KUBERNETES-DEPLOYMENT-REFACTOR.md) for the full refactor plan and architecture details.

## ✅ Phase 0 Status - COMPLETE ✨

- [x] Directory structure created
- [x] Base types and interfaces defined
- [x] Utility classes implemented (Logger, ShellExecutor, Retry, Errors)
- [x] BaseDeployer abstract class created
- [x] DeploymentState management implemented
- [x] KubernetesClient wrapper implemented (full kubectl operations)
- [x] Integrated with existing infrastructure tooling (using Vitest, root tsconfig)
- [x] Test infrastructure setup with Vitest
- [x] **49 passing tests** (unit + integration)
- [x] Utility consolidation documented for Phase 5

### Test Coverage
- ✅ Logger utility (9 tests)
- ✅ Retry utility with exponential backoff (8 tests)
- ✅ Error classes and hierarchy (15 tests)
- ✅ KubernetesClient operations (17 tests)

## ✅ Phase 1 Status - COMPLETE ✨

**MinikubeDeployer Implementation**

- [x] MinikubeDeployer class extending BaseDeployer
- [x] Pre-deployment checks (Docker, Minikube, kubectl)
- [x] Minikube cluster startup and configuration
- [x] Docker image building in Minikube environment
- [x] Host database setup (MongoDB, Redis, RabbitMQ)
- [x] Kubernetes manifest application with kustomize
- [x] Deployment readiness checks with retry logic
- [x] Validation and health checks
- [x] MongoDB replica set health verification
- [x] Port forwarding support

### Usage Example

```typescript
import { MinikubeDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new MinikubeDeployer({
  verbose: true,
  manifestPath: 'infrastructure/local/minikube/manifests/minikube/',
});

// Deploy to minikube
const result = await deployer.deploy();

if (result.success) {
  console.log('Deployment completed!');
  console.log(`Duration: ${result.duration}ms`);
}

// Setup port forwarding
await deployer.setupPortForwarding(3000);
```

## ✅ Phase 2 Status - COMPLETE ✨

**AKSDeployer Implementation**

- [x] AKSDeployer class extending BaseDeployer
- [x] Azure CLI authentication and subscription management
- [x] Army NETCOM naming convention support (CAZ-SRVTHREDS-{D|T|P}-E-*)
- [x] AKS cluster connection and kubectl context setup
- [x] ACR (Azure Container Registry) login and authentication
- [x] Docker image building and tagging for ACR
- [x] Image push to ACR with retry logic
- [x] Kubernetes manifest application for dev/test/prod
- [x] Deployment readiness checks with retry logic
- [x] Pod and service validation
- [x] Namespace cleanup functionality

### Supported Environments

- **dev** - Development environment (CAZ-SRVTHREDS-D-E-RG)
- **test** - Test environment (CAZ-SRVTHREDS-T-E-RG)
- **prod** - Production environment (CAZ-SRVTHREDS-P-E-RG)

### Usage Example

```typescript
import { AKSDeployer } from '@srvthreds/kubernetes-deployer';

const deployer = new AKSDeployer({
  environment: 'dev', // or 'test', 'prod'
  verbose: true,
  imageTag: 'v1.2.3',
});

// Deploy to AKS
const result = await deployer.deploy();

if (result.success) {
  console.log(`Deployed to ${deployer.environment}`);
}
```

### Command Line Usage

```bash
# Deploy to dev environment
npm run aks-deploy-ts dev

# Deploy to prod with specific tag
npm run aks-deploy-ts prod -- --tag=v1.2.3

# Dry run to test environment
npm run aks-deploy-ts test -- --dry-run --verbose
```

## 🔄 Next Steps

**Phase 3:** Enhanced Features & Testing

1. Comprehensive integration tests for AKSDeployer
2. Blue-green deployment support
3. Rollback functionality
4. Azure Key Vault integration for secrets
5. Monitoring and alerting hooks

---

**Status:** Phase 2 - AKSDeployer ✅ COMPLETE
**Last Updated:** 2025-01-12
