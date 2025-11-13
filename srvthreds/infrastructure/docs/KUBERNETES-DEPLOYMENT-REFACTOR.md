# Kubernetes Deployment Refactor Plan

**Status:** Planning Phase
**Created:** 2025-01-12
**Target Completion:** Q1 2025

## 📋 Executive Summary

This document outlines the plan to refactor Kubernetes deployment automation from shell scripts to a TypeScript-based framework. This refactor will provide better testability, type safety, error handling, and maintainability for deploying SrvThreds to Minikube and Azure AKS environments.

## 🎯 Goals

1. **Replace shell scripts** with TypeScript deployment classes
2. **Enable comprehensive testing** through dependency injection and mocking
3. **Improve error handling** and rollback capabilities
4. **Centralize deployment logic** in reusable, composable classes
5. **Support both local and CI/CD** deployment workflows
6. **Maintain backward compatibility** during transition period

## 🔍 Current State Analysis

### Current Implementation

**Location:** `infrastructure/local/minikube/scripts/`

**Scripts:**
- `setup-minikube.sh` - Full Minikube cluster setup and deployment
- `validate-minikube.sh` - Post-deployment validation
- `reset-minikube.sh` - Reset deployment (keep cluster)
- `cleanup-minikube.sh` - Complete cleanup
- `switch-to-minikube.sh` - Context switching

**Configuration:**
- `infrastructure/shared/configs/deployments/kubernetes.json` - Deployment definitions
- `infrastructure/config-registry.yaml` - Service definitions (SSOT)
- `infrastructure/local/minikube/manifests/` - Kubernetes manifests with Kustomize overlays

### Pain Points

1. **Limited Error Handling**
   - Shell scripts lack sophisticated try-catch mechanisms
   - Difficult to implement conditional rollback logic
   - Hard to track deployment state across operations

2. **No Type Safety**
   - Easy to pass wrong parameters
   - No compile-time validation
   - Typos discovered at runtime

3. **Testing Challenges**
   - Unit testing bash scripts is difficult and brittle
   - Integration tests require full cluster setup
   - Mocking external dependencies is complex

4. **Code Duplication**
   - Similar logic across multiple scripts
   - Hard to extract reusable functions
   - Maintenance burden increases over time

5. **Poor Observability**
   - Limited structured logging
   - Hard to instrument for monitoring
   - Difficult to track progress through deployment stages

6. **State Management**
   - Manual tracking of what's deployed
   - No automated rollback to previous state
   - Difficult to implement blue-green or canary deployments

## 🏗️ Proposed Architecture

### Directory Structure

```
infrastructure/tools/
├── deployment-cli/              # EXISTING CLI (keep, wire to new deployers)
│   ├── cli.ts
│   ├── deployment.ts
│   └── README.md
│
├── kubernetes-deployer/         # NEW: Deployment framework
│   ├── src/
│   │   ├── deployers/
│   │   │   ├── BaseDeployer.ts           # Abstract base class
│   │   │   ├── MinikubeDeployer.ts       # Local K8s deployment
│   │   │   ├── AKSDeployer.ts            # Azure AKS deployment
│   │   │   └── DeployerFactory.ts        # Factory pattern for creating deployers
│   │   │
│   │   ├── operations/
│   │   │   ├── ImageBuilder.ts           # Docker image building
│   │   │   ├── RegistryManager.ts        # ACR/Docker Hub operations
│   │   │   ├── KubernetesClient.ts       # kubectl wrapper with type safety
│   │   │   ├── ContextManager.ts         # Kubernetes context switching
│   │   │   ├── ValidationRunner.ts       # Post-deployment validation
│   │   │   └── ResourceWatcher.ts        # Watch K8s resources for readiness
│   │   │
│   │   ├── state/
│   │   │   ├── DeploymentState.ts        # Track current deployment state
│   │   │   ├── StateStore.ts             # Persist state (for rollback)
│   │   │   └── RevisionHistory.ts        # Track deployment history
│   │   │
│   │   ├── config/
│   │   │   ├── ConfigLoader.ts           # Load config-registry.yaml
│   │   │   ├── EnvironmentResolver.ts    # Resolve env-specific configs
│   │   │   ├── SecretManager.ts          # Handle secrets/credentials
│   │   │   └── ManifestGenerator.ts      # Generate K8s manifests
│   │   │
│   │   ├── utils/
│   │   │   ├── logger.ts                 # Structured logging
│   │   │   ├── shell.ts                  # Shell command wrapper
│   │   │   ├── retry.ts                  # Retry logic with backoff
│   │   │   ├── errors.ts                 # Custom error classes
│   │   │   └── validators.ts             # Input validation
│   │   │
│   │   └── types/
│   │       ├── deployment.types.ts       # Deployment-related types
│   │       ├── kubernetes.types.ts       # K8s resource types
│   │       └── config.types.ts           # Configuration types
│   │
│   ├── test/
│   │   ├── unit/
│   │   │   ├── deployers/
│   │   │   ├── operations/
│   │   │   └── state/
│   │   ├── integration/
│   │   │   ├── minikube.test.ts
│   │   │   └── aks.test.ts
│   │   └── fixtures/
│   │       ├── mock-configs.ts
│   │       └── mock-manifests.ts
│   │
│   ├── cli.ts                            # CLI entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
```

### Core Classes

#### 1. BaseDeployer (Abstract Class)

```typescript
/**
 * Abstract base class for all Kubernetes deployers.
 * Defines the contract and common functionality for deployments.
 */
export abstract class BaseDeployer {
  protected logger: Logger;
  protected config: DeploymentConfig;
  protected state: DeploymentState;

  constructor(
    protected environment: Environment,
    protected options: DeployerOptions = {}
  ) {
    this.logger = new Logger(`${this.constructor.name}`);
    this.state = new DeploymentState(environment);
  }

  /**
   * Main deployment workflow
   */
  async deploy(): Promise<DeploymentResult> {
    try {
      this.state.start();

      await this.preDeployChecks();
      await this.buildImages();
      await this.pushImages();
      await this.applyManifests();
      await this.waitForReadiness();
      await this.runValidation();

      this.state.markComplete();
      return { success: true, state: this.state };

    } catch (error) {
      this.state.markFailed(error);
      await this.handleDeploymentFailure(error);
      throw error;
    }
  }

  /**
   * Rollback to previous deployment
   */
  async rollback(): Promise<void> {
    const previousState = await this.state.getPreviousRevision();
    if (!previousState) {
      throw new Error('No previous deployment to rollback to');
    }

    this.logger.info(`Rolling back to revision ${previousState.revision}`);
    await this.applyManifests(previousState.manifestPath);
    await this.waitForReadiness();
  }

  // Abstract methods that subclasses must implement
  protected abstract preDeployChecks(): Promise<void>;
  protected abstract buildImages(): Promise<void>;
  protected abstract pushImages(): Promise<void>;
  protected abstract applyManifests(manifestPath?: string): Promise<void>;
  protected abstract waitForReadiness(): Promise<void>;
  protected abstract runValidation(): Promise<ValidationResult>;

  // Optional hook for handling failures
  protected async handleDeploymentFailure(error: Error): Promise<void> {
    this.logger.error('Deployment failed', error);

    if (this.options.autoRollback) {
      this.logger.info('Auto-rollback enabled, attempting rollback...');
      await this.rollback();
    }
  }
}
```

#### 2. MinikubeDeployer

```typescript
/**
 * Deployer for local Minikube environment.
 * Handles Minikube-specific setup and configuration.
 */
export class MinikubeDeployer extends BaseDeployer {
  private minikube: MinikubeManager;
  private imageBuilder: ImageBuilder;
  private k8s: KubernetesClient;

  constructor(options: DeployerOptions = {}) {
    super('minikube', options);
    this.minikube = new MinikubeManager();
    this.imageBuilder = new ImageBuilder({ buildForMinikube: true });
    this.k8s = new KubernetesClient('minikube');
  }

  protected async preDeployChecks(): Promise<void> {
    // Check if Minikube is installed
    await this.minikube.checkInstalled();

    // Start Minikube if not running
    if (!await this.minikube.isRunning()) {
      await this.minikube.start({
        cpus: 4,
        memory: 7836,
        diskSize: '20g'
      });
    }

    // Switch context to Minikube
    await this.k8s.switchContext('minikube');

    // Start host databases (MongoDB, Redis, RabbitMQ)
    await this.startHostDatabases();
  }

  protected async buildImages(): Promise<void> {
    this.logger.info('Building images in Minikube Docker environment');

    // Set Docker environment to Minikube
    await this.minikube.setDockerEnv();

    // Build images using the builder pattern
    await this.imageBuilder.build({
      services: ['builder', 'engine', 'session-agent', 'persistence-agent'],
      tag: 'dev'
    });

    // Tag images for Kubernetes
    await this.imageBuilder.tag('srvthreds/builder:latest', 'srvthreds:dev');
  }

  protected async pushImages(): Promise<void> {
    // No-op for Minikube - images are already in Minikube's Docker
    this.logger.info('Skipping image push (using Minikube Docker)');
  }

  protected async applyManifests(manifestPath?: string): Promise<void> {
    const path = manifestPath || 'infrastructure/local/minikube/manifests/minikube';

    this.logger.info(`Applying manifests from ${path}`);
    await this.k8s.apply(path, { kustomize: true });
  }

  protected async waitForReadiness(): Promise<void> {
    this.logger.info('Waiting for pods to be ready...');

    const deployments = [
      'srvthreds-engine',
      'srvthreds-session-agent',
      'srvthreds-persistence-agent'
    ];

    for (const deployment of deployments) {
      await this.k8s.waitForRollout(deployment, 'srvthreds', { timeout: 300 });
    }
  }

  protected async runValidation(): Promise<ValidationResult> {
    const validator = new ValidationRunner(this.k8s, 'minikube');
    return await validator.validate();
  }

  private async startHostDatabases(): Promise<void> {
    // Reset Docker environment to host
    await this.minikube.unsetDockerEnv();

    // Start databases using deployment-cli
    const dbDeployer = new DockerComposeDeployer('databases', 'minikube');
    await dbDeployer.up({ detached: true, wait: true });
  }
}
```

#### 3. AKSDeployer

```typescript
/**
 * Deployer for Azure Kubernetes Service.
 * Handles ACR authentication, AKS-specific configuration, and multi-environment deployments.
 */
export class AKSDeployer extends BaseDeployer {
  private azure: AzureManager;
  private acr: RegistryManager;
  private imageBuilder: ImageBuilder;
  private k8s: KubernetesClient;

  constructor(
    environment: 'dev' | 'test' | 'prod',
    private azureConfig: AzureConfig,
    options: DeployerOptions = {}
  ) {
    super(environment, options);
    this.azure = new AzureManager(azureConfig);
    this.acr = new RegistryManager(azureConfig.acrName);
    this.imageBuilder = new ImageBuilder({ multiPlatform: true });
    this.k8s = new KubernetesClient(`aks-${environment}`);
  }

  protected async preDeployChecks(): Promise<void> {
    // Verify Azure CLI is authenticated
    await this.azure.checkAuthentication();

    // Get AKS credentials and switch context
    await this.azure.getAKSCredentials(
      this.azureConfig.resourceGroup,
      this.azureConfig.clusterName
    );

    await this.k8s.switchContext(`aks-${this.environment}`);

    // Verify ACR access
    await this.acr.checkAccess();
  }

  protected async buildImages(): Promise<void> {
    this.logger.info('Building multi-platform images for Azure');

    const gitSha = await this.getGitSha();
    const tag = `${this.environment}-${gitSha}`;

    await this.imageBuilder.build({
      services: ['engine', 'session-agent', 'persistence-agent', 'bootstrap'],
      tag,
      platforms: ['linux/amd64', 'linux/arm64']
    });

    this.state.setImageTag(tag);
  }

  protected async pushImages(): Promise<void> {
    this.logger.info(`Pushing images to ACR: ${this.azureConfig.acrName}`);

    // Login to ACR
    await this.acr.login();

    // Push all service images
    const tag = this.state.getImageTag();
    const registry = `${this.azureConfig.acrName}.azurecr.io`;

    await this.imageBuilder.push({
      registry,
      tag,
      services: ['engine', 'session-agent', 'persistence-agent', 'bootstrap']
    });
  }

  protected async applyManifests(manifestPath?: string): Promise<void> {
    const path = manifestPath ||
      `infrastructure/cloud/aks/manifests/${this.environment}`;

    // Create ACR pull secret if it doesn't exist
    await this.createACRPullSecret();

    // Create Azure connection string secrets
    await this.createAzureSecrets();

    this.logger.info(`Applying manifests from ${path}`);
    await this.k8s.apply(path, { kustomize: true });
  }

  protected async waitForReadiness(): Promise<void> {
    this.logger.info('Waiting for AKS deployment to be ready...');

    const deployments = [
      'srvthreds-engine',
      'srvthreds-session-agent',
      'srvthreds-persistence-agent'
    ];

    for (const deployment of deployments) {
      await this.k8s.waitForRollout(deployment, 'srvthreds', {
        timeout: 600 // Longer timeout for AKS
      });
    }
  }

  protected async runValidation(): Promise<ValidationResult> {
    const validator = new ValidationRunner(this.k8s, `aks-${this.environment}`);

    // Run AKS-specific validations
    const results = await validator.validate({
      checkIngress: true,
      checkApplicationGateway: true,
      checkDatabaseConnectivity: true,
      runIntegrationTests: this.environment !== 'prod'
    });

    return results;
  }

  private async createACRPullSecret(): Promise<void> {
    const secretName = 'acr-pull-secret';

    if (await this.k8s.secretExists(secretName, 'srvthreds')) {
      this.logger.info('ACR pull secret already exists');
      return;
    }

    this.logger.info('Creating ACR pull secret');

    const credentials = await this.acr.getCredentials();
    await this.k8s.createDockerRegistrySecret(
      secretName,
      'srvthreds',
      `${this.azureConfig.acrName}.azurecr.io`,
      credentials.username,
      credentials.password
    );
  }

  private async createAzureSecrets(): Promise<void> {
    const secretName = 'azure-connection-strings';

    this.logger.info('Creating Azure connection string secrets');

    await this.k8s.createSecret(
      secretName,
      'srvthreds',
      {
        'cosmosdb-connection-string': await this.azure.getCosmosDBConnectionString(),
        'redis-host': await this.azure.getRedisHost(),
        'redis-password': await this.azure.getRedisPassword(),
        'servicebus-connection-string': await this.azure.getServiceBusConnectionString()
      }
    );
  }

  private async getGitSha(): Promise<string> {
    const { stdout } = await execAsync('git rev-parse --short HEAD');
    return stdout.trim();
  }
}
```

#### 4. KubernetesClient (Operations Layer)

```typescript
/**
 * Type-safe wrapper around kubectl operations.
 * Provides a consistent interface for all Kubernetes interactions.
 */
export class KubernetesClient {
  private logger: Logger;
  private shell: ShellExecutor;

  constructor(private contextName: string) {
    this.logger = new Logger('KubernetesClient');
    this.shell = new ShellExecutor();
  }

  /**
   * Apply Kubernetes manifests
   */
  async apply(
    path: string,
    options: { kustomize?: boolean; namespace?: string } = {}
  ): Promise<void> {
    const args = ['apply'];

    if (options.kustomize) {
      args.push('-k', path);
    } else {
      args.push('-f', path);
    }

    if (options.namespace) {
      args.push('-n', options.namespace);
    }

    await this.exec('kubectl', args);
  }

  /**
   * Delete Kubernetes resources
   */
  async delete(
    resource: string,
    name: string,
    namespace: string
  ): Promise<void> {
    await this.exec('kubectl', ['delete', resource, name, '-n', namespace]);
  }

  /**
   * Get pods in a namespace
   */
  async getPods(namespace: string): Promise<Pod[]> {
    const result = await this.exec('kubectl', [
      'get', 'pods',
      '-n', namespace,
      '-o', 'json'
    ]);

    const data = JSON.parse(result.stdout);
    return data.items.map((item: any) => this.parsePod(item));
  }

  /**
   * Get logs from a pod
   */
  async getLogs(
    pod: string,
    namespace: string,
    options: { tail?: number; follow?: boolean } = {}
  ): Promise<string> {
    const args = ['logs', pod, '-n', namespace];

    if (options.tail) {
      args.push('--tail', String(options.tail));
    }

    if (options.follow) {
      args.push('-f');
    }

    const result = await this.exec('kubectl', args);
    return result.stdout;
  }

  /**
   * Wait for deployment rollout to complete
   */
  async waitForRollout(
    deployment: string,
    namespace: string,
    options: { timeout?: number } = {}
  ): Promise<void> {
    const timeout = options.timeout || 300;

    this.logger.info(`Waiting for ${deployment} rollout (timeout: ${timeout}s)`);

    await this.exec('kubectl', [
      'rollout', 'status',
      'deployment', deployment,
      '-n', namespace,
      '--timeout', `${timeout}s`
    ]);
  }

  /**
   * Switch Kubernetes context
   */
  async switchContext(context: string): Promise<void> {
    this.logger.info(`Switching to context: ${context}`);
    await this.exec('kubectl', ['config', 'use-context', context]);
    this.contextName = context;
  }

  /**
   * Check if a secret exists
   */
  async secretExists(name: string, namespace: string): Promise<boolean> {
    try {
      await this.exec('kubectl', [
        'get', 'secret', name,
        '-n', namespace
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a Docker registry secret
   */
  async createDockerRegistrySecret(
    name: string,
    namespace: string,
    server: string,
    username: string,
    password: string
  ): Promise<void> {
    await this.exec('kubectl', [
      'create', 'secret', 'docker-registry', name,
      `-n`, namespace,
      `--docker-server=${server}`,
      `--docker-username=${username}`,
      `--docker-password=${password}`
    ]);
  }

  /**
   * Create a generic secret
   */
  async createSecret(
    name: string,
    namespace: string,
    data: Record<string, string>
  ): Promise<void> {
    const args = ['create', 'secret', 'generic', name, '-n', namespace];

    for (const [key, value] of Object.entries(data)) {
      args.push(`--from-literal=${key}=${value}`);
    }

    await this.exec('kubectl', args);
  }

  private async exec(command: string, args: string[]): Promise<ExecResult> {
    return await this.shell.exec(command, args);
  }

  private parsePod(item: any): Pod {
    return {
      name: item.metadata.name,
      namespace: item.metadata.namespace,
      status: item.status.phase,
      ready: item.status.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True'
    };
  }
}
```

#### 5. DeployerFactory

```typescript
/**
 * Factory for creating appropriate deployer instances.
 * Handles dependency injection and configuration.
 */
export class DeployerFactory {
  /**
   * Create a deployer based on target and environment
   */
  static create(config: DeployerConfig): BaseDeployer {
    switch (config.target) {
      case 'minikube':
        return new MinikubeDeployer(config.options);

      case 'aks':
        if (!config.environment) {
          throw new Error('Environment required for AKS deployment');
        }

        const azureConfig = this.loadAzureConfig(config.environment);
        return new AKSDeployer(
          config.environment as 'dev' | 'test' | 'prod',
          azureConfig,
          config.options
        );

      default:
        throw new Error(`Unknown deployment target: ${config.target}`);
    }
  }

  private static loadAzureConfig(environment: string): AzureConfig {
    // Load from config-registry.yaml and environment-specific overrides
    const configLoader = new ConfigLoader();
    return configLoader.loadAzureConfig(environment);
  }
}
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// test/unit/deployers/AKSDeployer.test.ts
describe('AKSDeployer', () => {
  let deployer: AKSDeployer;
  let mockAzure: jest.Mocked<AzureManager>;
  let mockK8s: jest.Mocked<KubernetesClient>;

  beforeEach(() => {
    mockAzure = createMockAzureManager();
    mockK8s = createMockK8sClient();

    deployer = new AKSDeployer('dev', mockAzureConfig, {
      azure: mockAzure,
      k8s: mockK8s
    });
  });

  describe('preDeployChecks', () => {
    it('should verify Azure authentication', async () => {
      await deployer['preDeployChecks']();
      expect(mockAzure.checkAuthentication).toHaveBeenCalled();
    });

    it('should get AKS credentials', async () => {
      await deployer['preDeployChecks']();
      expect(mockAzure.getAKSCredentials).toHaveBeenCalledWith(
        mockAzureConfig.resourceGroup,
        mockAzureConfig.clusterName
      );
    });

    it('should switch to correct AKS context', async () => {
      await deployer['preDeployChecks']();
      expect(mockK8s.switchContext).toHaveBeenCalledWith('aks-dev');
    });
  });

  describe('deploy', () => {
    it('should execute full deployment workflow', async () => {
      const result = await deployer.deploy();

      expect(result.success).toBe(true);
      expect(mockK8s.apply).toHaveBeenCalled();
      expect(mockK8s.waitForRollout).toHaveBeenCalledTimes(3);
    });

    it('should rollback on deployment failure', async () => {
      mockK8s.apply.mockRejectedValue(new Error('Apply failed'));

      const deployerWithRollback = new AKSDeployer('dev', mockAzureConfig, {
        autoRollback: true,
        azure: mockAzure,
        k8s: mockK8s
      });

      await expect(deployerWithRollback.deploy()).rejects.toThrow();
      expect(deployerWithRollback.rollback).toHaveBeenCalled();
    });
  });

  describe('createACRPullSecret', () => {
    it('should skip if secret already exists', async () => {
      mockK8s.secretExists.mockResolvedValue(true);

      await deployer['createACRPullSecret']();

      expect(mockK8s.createDockerRegistrySecret).not.toHaveBeenCalled();
    });

    it('should create secret if it does not exist', async () => {
      mockK8s.secretExists.mockResolvedValue(false);

      await deployer['createACRPullSecret']();

      expect(mockK8s.createDockerRegistrySecret).toHaveBeenCalledWith(
        'acr-pull-secret',
        'srvthreds',
        expect.stringContaining('.azurecr.io'),
        expect.any(String),
        expect.any(String)
      );
    });
  });
});
```

### Integration Tests

```typescript
// test/integration/minikube.test.ts
describe('Minikube Integration', () => {
  let deployer: MinikubeDeployer;

  beforeAll(async () => {
    deployer = new MinikubeDeployer({ dryRun: false });
  });

  it('should deploy to Minikube successfully', async () => {
    const result = await deployer.deploy();

    expect(result.success).toBe(true);
    expect(result.state.status).toBe('deployed');
  }, 600000); // 10 minute timeout

  it('should validate deployment health', async () => {
    const validation = await deployer['runValidation']();

    expect(validation.healthy).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  afterAll(async () => {
    // Cleanup
    await deployer.cleanup();
  });
});
```

## 📅 Implementation Timeline

### Phase 0: Foundation (Week 1, 3-4 days)

**Goal:** Create base infrastructure and shared utilities

**Tasks:**
- [ ] Create `infrastructure/tools/kubernetes-deployer/` directory structure
- [ ] Implement `BaseDeployer` abstract class
- [ ] Implement `KubernetesClient` wrapper
- [ ] Create `Logger`, `ShellExecutor`, and error handling utilities
- [ ] Set up test infrastructure with Jest
- [ ] Write unit tests for base classes

**Deliverable:** Base framework that can be extended by specific deployers

### Phase 1: Minikube Refactor (Week 1-2, 2-3 days)

**Goal:** Migrate Minikube deployment from scripts to TypeScript

**Tasks:**
- [ ] Implement `MinikubeDeployer` class
- [ ] Port logic from `setup-minikube.sh` to TypeScript
- [ ] Implement `MinikubeManager` for Minikube-specific operations
- [ ] Create unit tests for MinikubeDeployer
- [ ] Create integration tests (requires actual Minikube)
- [ ] Update `kubernetes.json` to support new deployer

**Deliverable:** Minikube deployment works via TypeScript deployer

**Validation:**
```bash
npm run deploymentCli -- minikube k8s_deploy_ts  # New TypeScript-based deployment
# Compare with:
npm run deploymentCli -- minikube k8s_minikube    # Old script-based deployment
```

### Phase 2: AKS Foundation (Week 2, 3-4 days)

**Goal:** Build Azure-specific infrastructure and AKS deployer

**Tasks:**
- [ ] Create Azure manifest overlays (dev/test/prod)
- [ ] Implement `AKSDeployer` class
- [ ] Implement `AzureManager` for Azure CLI operations
- [ ] Implement `RegistryManager` for ACR operations
- [ ] Create ACR authentication and secret management
- [ ] Write unit tests for AKSDeployer
- [ ] Create mock-based integration tests

**Deliverable:** AKS deployer ready for testing

### Phase 3: AKS Deployment Testing (Week 3, 3-4 days)

**Goal:** Test and validate AKS deployment to dev environment

**Tasks:**
- [ ] Deploy to AKS dev using new deployer
- [ ] Validate all services are running
- [ ] Test rollback functionality
- [ ] Test error handling and recovery
- [ ] Document deployment process
- [ ] Create runbook for operations

**Deliverable:** Working AKS deployment to dev environment

### Phase 4: CI/CD Integration (Week 3-4, 2-3 days)

**Goal:** Integrate TypeScript deployers into GitHub Actions

**Tasks:**
- [ ] Create GitHub Actions workflow for AKS dev
- [ ] Create GitHub Actions workflow for AKS test (with approval)
- [ ] Create GitHub Actions workflow for AKS prod (with approval)
- [ ] Set up Azure credentials as GitHub secrets
- [ ] Implement deployment notifications (Slack/email)
- [ ] Test full CI/CD pipeline

**Deliverable:** Automated deployments via GitHub Actions

### Phase 5: Migration and Cleanup (Week 4, 2 days)

**Goal:** Complete migration and deprecate old scripts

**Tasks:**
- [ ] **Consolidate shared utilities** - Refactor kubernetes-deployer to use shared shell.ts, logger.ts, error-handler.ts from `infrastructure/tools/shared/`
- [ ] Update all npm scripts to use new deployers
- [ ] Update documentation
- [ ] Mark old scripts as deprecated
- [ ] Create migration guide for team
- [ ] Final testing and validation
- [ ] Remove old scripts (after proven stable)

**Deliverable:** Full migration complete, old scripts removed

## 🔄 Migration Strategy

### Parallel Implementation

1. **Keep existing scripts working** - Don't break current workflows
2. **Build TypeScript deployers alongside** - New code doesn't touch old code
3. **Add new npm scripts** - `npm run minikube-deploy-ts` vs `npm run minikube-deploy`
4. **Test extensively** - Ensure feature parity before switching
5. **Gradual cutover** - Move one environment at a time
6. **Deprecation period** - Keep scripts for 1-2 sprints before removal

### Rollback Plan

If TypeScript deployers have critical issues:
1. Revert npm scripts to use old shell scripts
2. Keep TypeScript code for debugging
3. Fix issues in TypeScript deployers
4. Resume migration when stable

## 🎯 Success Criteria

### Must Have
- [ ] All Minikube deployment functionality ported to TypeScript
- [ ] AKS deployment to dev/test/prod working
- [ ] Comprehensive unit test coverage (>80%)
- [ ] Integration tests passing
- [ ] CI/CD pipelines working
- [ ] Documentation updated
- [ ] Zero downtime during migration

### Nice to Have
- [ ] Blue-green deployment support
- [ ] Canary deployment support
- [ ] Automated rollback on failure
- [ ] Deployment metrics and monitoring
- [ ] Interactive CLI mode
- [ ] Web dashboard for deployment status

## 📚 Documentation Plan

### Files to Create/Update

1. **New Documentation**
   - `infrastructure/tools/kubernetes-deployer/README.md` - Framework overview
   - `infrastructure/docs/KUBERNETES-DEPLOYMENT-GUIDE.md` - How to use deployers
   - `infrastructure/docs/KUBERNETES-DEPLOYMENT-ARCHITECTURE.md` - Architecture deep-dive

2. **Updated Documentation**
   - `infrastructure/README.md` - Update deployment commands
   - `infrastructure/docs/DEPLOYMENT.md` - Add TypeScript deployer section
   - `infrastructure/docs/DEVELOPER-DEPLOYMENT-PATTERNS.md` - Update patterns

3. **Runbooks**
   - `infrastructure/docs/runbooks/AKS-DEPLOYMENT.md` - AKS deployment procedures
   - `infrastructure/docs/runbooks/ROLLBACK.md` - Rollback procedures
   - `infrastructure/docs/runbooks/TROUBLESHOOTING-DEPLOYMENTS.md` - Common issues

## 🔐 Security Considerations

1. **Secrets Management**
   - Never commit secrets to repository
   - Use Azure Key Vault for production secrets
   - Rotate ACR credentials regularly
   - Use managed identities where possible

2. **Access Control**
   - Limit who can deploy to production
   - Implement approval gates in CI/CD
   - Audit all deployment actions
   - Use RBAC for Kubernetes access

3. **Image Security**
   - Scan images for vulnerabilities
   - Sign images with Docker Content Trust
   - Use minimal base images
   - Regular security updates

## 🤔 Open Questions

1. **ACR Authentication**
   - Use service principal or managed identity?
   - **Recommendation:** Managed identity for CI/CD, service principal for local dev

2. **Secrets Management**
   - Kubernetes secrets or Azure Key Vault CSI?
   - **Recommendation:** Azure Key Vault CSI for production, K8s secrets for dev

3. **Image Tagging Strategy**
   - Git SHA, semantic versioning, or both?
   - **Recommendation:** `{environment}-{gitSha}-{timestamp}` for traceability

4. **Rollback Strategy**
   - Automatic or manual rollback?
   - **Recommendation:** Manual for prod, automatic for dev/test

5. **Monitoring**
   - Application Insights, Prometheus, or both?
   - **Recommendation:** Both - App Insights for Azure integration, Prometheus for K8s metrics

## 📊 Progress Tracking

Use this checklist to track overall progress:

### Foundation
- [ ] Directory structure created
- [ ] BaseDeployer implemented
- [ ] KubernetesClient implemented
- [ ] Test infrastructure set up

### Minikube
- [ ] MinikubeDeployer implemented
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Deployment CLI integration complete

### AKS
- [ ] Manifest overlays created
- [ ] AKSDeployer implemented
- [ ] AzureManager implemented
- [ ] Deployed to AKS dev successfully

### CI/CD
- [ ] GitHub Actions workflows created
- [ ] Azure credentials configured
- [ ] Deployments tested via CI/CD
- [ ] Approval gates working

### Migration
- [ ] npm scripts updated
- [ ] Documentation updated
- [ ] Old scripts deprecated
- [ ] Migration complete

## 🎉 Benefits Summary

After completing this refactor, we will have:

1. **Better Developer Experience**
   - Type-safe deployments
   - Clear error messages
   - Fast feedback loops

2. **Higher Quality**
   - Comprehensive test coverage
   - Validated before merge
   - Fewer production issues

3. **Easier Maintenance**
   - Centralized deployment logic
   - Reusable components
   - Clear code structure

4. **Better Operations**
   - Sophisticated rollback
   - State tracking
   - Deployment observability

5. **Faster Iteration**
   - Quick to add new features
   - Easy to modify behavior
   - Safe to refactor

---

**Last Updated:** 2025-01-12
**Document Owner:** Platform Team
**Status:** Ready for Implementation
