/**
 * Minikube Deployer
 * Handles deployment to local Minikube cluster
 */

import { BaseDeployer } from './BaseDeployer.js';
import { KubernetesClient } from '../operations/KubernetesClient.js';
import { ShellExecutor } from '../utils/shell.js';
import { retry } from '../utils/retry.js';
import {
  PreDeploymentCheckError,
  ImageBuildError,
  ManifestApplicationError,
  ValidationError,
} from '../utils/errors.js';
import type {
  DeployerOptions,
  ValidationResult,
} from '../types/index.js';

export interface MinikubeDeployerOptions extends DeployerOptions {
  manifestPath?: string;
  skipDatabaseSetup?: boolean;
  cpus?: number;
  memory?: number;
  diskSize?: string;
  /** Path to srvthreds project root (relative to devops or absolute) */
  srvthredsPath?: string;
}

/**
 * Deployer for Minikube (local development) environment
 */
export class MinikubeDeployer extends BaseDeployer {
  private shell: ShellExecutor;
  private k8s: KubernetesClient;
  private manifestPath: string;
  private skipDatabaseSetup: boolean;
  private srvthredsPath: string;
  private minikubeConfig: {
    cpus: number;
    memory: number;
    diskSize: string;
  };

  constructor(options: MinikubeDeployerOptions = {}) {
    super('minikube', 'minikube', options);

    this.shell = new ShellExecutor('MinikubeDeployer');
    this.k8s = new KubernetesClient({ context: 'minikube', verbose: options.verbose });
    this.manifestPath = options.manifestPath || 'minikube/srvthreds/';
    this.skipDatabaseSetup = options.skipDatabaseSetup || false;
    this.srvthredsPath = options.srvthredsPath || '../srvthreds';

    this.minikubeConfig = {
      cpus: options.cpus || 4,
      memory: options.memory || 7836,
      diskSize: options.diskSize || '20g',
    };

    this.logger.section('Minikube Deployer Initialized');
    this.logger.info(`Manifest path: ${this.manifestPath}`);
    this.logger.info(`Srvthreds path: ${this.srvthredsPath}`);
  }

  /**
   * Pre-deployment checks for Minikube
   */
  protected async preDeployChecks(): Promise<void> {
    this.logger.section('Pre-Deployment Checks');

    // 1. Verify Docker is running
    this.logger.info('Checking Docker daemon...');
    const dockerCheck = await this.shell.exec('docker', ['info'], { silent: true });
    if (dockerCheck.exitCode !== 0) {
      throw new PreDeploymentCheckError(
        'Docker daemon is not running. Please start Docker Desktop.',
        { step: 'docker-check' }
      );
    }
    this.logger.success('Docker daemon is running');

    // 2. Verify Minikube is installed
    this.logger.info('Checking Minikube installation...');
    const minikubeExists = await this.shell.commandExists('minikube');
    if (!minikubeExists) {
      throw new PreDeploymentCheckError(
        'Minikube is not installed. Install from: https://minikube.sigs.k8s.io/',
        { step: 'minikube-check' }
      );
    }

    // 3. Check if Minikube cluster exists and is running
    this.logger.info('Checking Minikube cluster status...');

    let minikubeStatus = '';
    try {
      const statusResult = await this.shell.exec(
        'minikube',
        ['status', '--format', '{{.Host}}'],
        { silent: true, logErrors: false }
      );
      minikubeStatus = statusResult.stdout.trim();
    } catch (error) {
      // minikube status exits with 85 when profile doesn't exist
      // This is expected for first-time setup
      this.logger.debug('Minikube cluster not found (expected for first-time setup)');
    }

    if (minikubeStatus !== 'Running') {
      if (minikubeStatus) {
        this.logger.warn(`Minikube is not running (status: ${minikubeStatus})`);
      }
      this.logger.info('Starting Minikube cluster...');

      await this.startMinikube();
    } else {
      this.logger.success('Minikube cluster is running');
    }

    // 4. Verify kubectl context (skip in dry-run if cluster doesn't exist)
    if (this.options.dryRun && minikubeStatus !== 'Running') {
      this.logger.info('[DRY RUN] Would verify kubectl context and namespace');
      return;
    }

    this.logger.info('Verifying kubectl context...');
    await this.k8s.verify();

    const currentContext = await this.k8s.getCurrentContext();
    if (currentContext !== 'minikube') {
      this.logger.info(`Switching context from ${currentContext} to minikube`);
      await this.k8s.setContext('minikube');
    }
    this.logger.success('kubectl context set to minikube');

    // 5. Ensure namespace exists
    await this.k8s.ensureNamespace('srvthreds');
    this.logger.success('Namespace srvthreds ready');
  }

  /**
   * Start Minikube cluster with configured resources
   */
  private async startMinikube(): Promise<void> {
    this.logger.info('Starting Minikube with configured resources...');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would start Minikube');
      return;
    }

    const args = [
      'start',
      '--driver=docker',
      `--cpus=${this.minikubeConfig.cpus}`,
      `--memory=${this.minikubeConfig.memory}`,
      `--disk-size=${this.minikubeConfig.diskSize}`,
    ];

    await this.shell.exec('minikube', args, { timeout: 180000 });

    // Configure Minikube container to restart with Docker
    this.logger.info('Configuring Minikube container restart policy...');
    await this.shell.exec('docker', ['update', '--restart=unless-stopped', 'minikube']);

    // Enable addons
    this.logger.info('Enabling Minikube addons...');
    await this.shell.exec('minikube', ['addons', 'enable', 'ingress'], { silent: true });
    await this.shell.exec('minikube', ['addons', 'enable', 'metrics-server'], { silent: true });
    await this.shell.exec('minikube', ['addons', 'enable', 'dashboard'], { silent: true });

    this.logger.success('Minikube started successfully');
  }

  /**
   * Parse Minikube docker-env output and return environment variables
   */
  private async getMinikubeDockerEnv(): Promise<Record<string, string>> {
    const dockerEnvResult = await this.shell.exec('minikube', ['docker-env', '--shell', 'bash']);
    const envVars: Record<string, string> = {};

    dockerEnvResult.stdout.split('\n').forEach((line) => {
      const exportMatch = line.match(/export (.+)="(.+)"/);
      if (exportMatch) {
        const [, key, value] = exportMatch;
        if (key && value) {
          envVars[key] = value;
        }
      }
    });

    return envVars;
  }

  /**
   * Build Docker images in Minikube environment
   *
   * Uses srvthreds' deploymentCli to build images. This ensures:
   * - Dynamic docker-compose files are generated correctly
   * - thredlib symlink dependency is resolved
   * - Pre/post build commands from deployment configs are executed
   */
  protected async buildImages(): Promise<void> {
    this.logger.section('Building Docker Images');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would build images via srvthreds deploymentCli');
      return;
    }

    try {
      // Set Docker environment to Minikube
      this.logger.info('Configuring Docker to use Minikube environment...');
      const envVars = await this.getMinikubeDockerEnv();

      // Build server images using srvthreds' deploymentCli
      // This runs from srvthreds directory to ensure correct paths for:
      // - thredlib symlink (additional_contexts in docker-compose)
      // - Dynamic docker-compose file generation
      // - Deployment config pre/post commands
      this.logger.info('Building server images via deploymentCli...');
      await this.shell.exec(
        'npm',
        ['run', 'deploymentCli', '--', 'minikube', 'build_server'],
        {
          env: envVars,
          timeout: 300000,
          cwd: this.srvthredsPath,
        }
      );

      // Tag builder image as srvthreds:dev for convenience
      this.logger.info('Tagging builder image...');
      await this.shell.exec(
        'docker',
        ['tag', 'srvthreds/builder:latest', 'srvthreds:dev'],
        { env: envVars }
      );

      const imageTag = this.options.imageTag || 'dev';
      this.state.setImageTag(imageTag);

      this.logger.success('Images built successfully');
    } catch (error) {
      throw new ImageBuildError(
        `Failed to build images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'build-images' },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Push/load images to Minikube (images are already built in Minikube Docker)
   */
  protected async pushImages(): Promise<void> {
    this.logger.section('Loading Images');

    // For Minikube, images are built directly in Minikube's Docker daemon
    // so no push is needed - they're already available
    this.logger.info('Images are built in Minikube Docker environment');
    this.logger.success('Images ready for deployment');
  }

  /**
   * Setup host databases (MongoDB, Redis) for Minikube
   *
   * Uses srvthreds' deploymentCli to start databases. For Minikube,
   * this starts mongo-repl-1 and redis on the host Docker (not Minikube's Docker).
   */
  private async setupHostDatabases(): Promise<void> {
    if (this.skipDatabaseSetup) {
      this.logger.info('Skipping database setup (skipDatabaseSetup=true)');
      return;
    }

    this.logger.section('Setting Up Host Databases');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would set up host databases via srvthreds deploymentCli');
      return;
    }

    try {
      // Reset Docker environment to host (not Minikube)
      // This ensures databases run on host Docker, accessible via host.minikube.internal
      this.logger.info('Resetting Docker environment to host...');
      await this.shell.exec('minikube', ['docker-env', '--unset']);

      // Start databases on host Docker using srvthreds' deploymentCli
      // This runs from srvthreds directory to use the correct deployment configs
      this.logger.info('Starting host databases via deploymentCli...');
      await this.shell.exec(
        'npm',
        ['run', 'deploymentCli', '--', 'minikube', 's_a_dbs'],
        {
          timeout: 120000,
          cwd: this.srvthredsPath,
        }
      );

      // Verify MongoDB replica set health
      await this.verifyMongoDBReplicaSet();

      this.logger.success('Host databases are ready');
    } catch (error) {
      throw new PreDeploymentCheckError(
        `Failed to set up host databases: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'database-setup' },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Verify MongoDB replica set is healthy
   */
  private async verifyMongoDBReplicaSet(): Promise<void> {
    this.logger.info('Verifying MongoDB replica set health...');

    const checkScript = `
      try {
        const status = rs.status();
        if (status.ok === 1) {
          const primaryCount = status.members.filter(m => m.stateStr === 'PRIMARY').length;
          print(primaryCount);
        } else {
          print('0');
        }
      } catch(e) {
        print('0');
      }
    `;

    const result = await this.shell.exec(
      'docker',
      ['exec', 'mongo-repl-1', 'mongosh', '--quiet', '--eval', checkScript],
      { silent: true }
    );

    const primaryCount = result.stdout.trim();

    if (primaryCount !== '1') {
      this.logger.warn('MongoDB replica set needs initialization');
      this.logger.info('Running replica set setup...');

      await this.shell.exec(
        'bash',
        [`${this.srvthredsPath}/infrastructure/local/docker/scripts/setup-repl.sh`],
        { timeout: 60000 }
      );

      // Verify again
      const retryResult = await this.shell.exec(
        'docker',
        ['exec', 'mongo-repl-1', 'mongosh', '--quiet', '--eval', checkScript],
        { silent: true }
      );

      if (retryResult.stdout.trim() !== '1') {
        throw new PreDeploymentCheckError(
          'MongoDB replica set is not healthy after initialization',
          { step: 'mongodb-health' }
        );
      }
    }

    this.logger.success('MongoDB replica set is healthy');
  }

  /**
   * Apply Kubernetes manifests using kubectl + kustomize
   */
  protected async applyManifests(manifestPath?: string): Promise<void> {
    this.logger.section('Applying Kubernetes Manifests');

    const path = manifestPath || this.manifestPath;

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would apply manifests from: ${path}`);
      return;
    }

    try {
      // First, setup host databases
      await this.setupHostDatabases();

      // Apply Kubernetes manifests with kustomize
      this.logger.info(`Applying manifests from: ${path}`);
      await this.k8s.apply(path, { namespace: 'srvthreds', kustomize: true });

      this.logger.success('Manifests applied successfully');
    } catch (error) {
      throw new ManifestApplicationError(
        `Failed to apply manifests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { manifestPath: path },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Wait for deployments to be ready
   */
  protected async waitForReadiness(): Promise<void> {
    this.logger.section('Waiting for Deployments');

    const deployments = [
      'srvthreds-engine',
      'srvthreds-session-agent',
      'srvthreds-persistence-agent',
    ];

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would wait for deployments to be ready');
      return;
    }

    try {
      for (const deploymentName of deployments) {
        this.logger.info(`Waiting for ${deploymentName}...`);

        await retry(
          async () => {
            const deployment = await this.k8s.getDeployment(deploymentName, 'srvthreds');

            if (deployment.replicas.ready === deployment.replicas.desired) {
              this.logger.success(
                `${deploymentName} is ready (${deployment.replicas.ready}/${deployment.replicas.desired})`
              );
              return;
            }

            throw new Error(
              `${deploymentName} not ready: ${deployment.replicas.ready}/${deployment.replicas.desired}`
            );
          },
          {
            maxAttempts: 60,
            delay: 5000,
            backoff: 1,
          }
        );

        this.state.addDeployedResource({
          kind: 'Deployment',
          name: deploymentName,
          namespace: 'srvthreds',
          status: 'deployed',
        });
      }

      this.logger.success('All deployments are ready');
    } catch (error) {
      throw new ValidationError(
        `Deployments failed to become ready: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'wait-for-readiness' },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Run validation checks
   */
  protected async runValidation(): Promise<ValidationResult> {
    this.logger.section('Running Validation');

    const validation: ValidationResult = {
      healthy: true,
      issues: [],
      timestamp: new Date(),
    };

    // In dry-run mode, skip actual validation queries
    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would validate deployed resources');
      return validation;
    }

    // Check pod status
    this.logger.info('Checking pod status...');
    const pods = await this.k8s.getPods('srvthreds');

    const notReady = pods.filter((p) => !p.ready);
    if (notReady.length > 0) {
      validation.healthy = false;
      const podDetails = notReady.map((p) => `${p.name} (${p.status})`).join(', ');
      validation.issues.push({
        severity: 'error',
        message: `${notReady.length} pods are not ready: ${podDetails}`,
        resource: 'pods',
      });
      this.logger.warn(`Pods not ready: ${podDetails}`);
    } else {
      this.logger.success(`All ${pods.length} pods are ready`);
    }

    // Check service endpoints
    this.logger.info('Checking services...');
    const services = await this.k8s.getServices('srvthreds');
    this.logger.success(`Found ${services.length} services`);

    if (validation.healthy) {
      this.logger.success('All validation checks passed');
    } else {
      this.logger.warn(`Validation found ${validation.issues.length} issues`);
    }

    return validation;
  }

  /**
   * Rollout restart deployments
   */
  protected async rolloutRestart(): Promise<void> {
    this.logger.section('Rollout Restarting Deployments');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would rollout restart deployments');
      return;
    }

    const deployments = [
      'srvthreds-engine',
      'srvthreds-session-agent',
      'srvthreds-persistence-agent',
    ];

    for (const deploymentName of deployments) {
      this.logger.info(`Restarting ${deploymentName}...`);
      await this.k8s.restartDeployment(deploymentName, 'srvthreds');
    }

    this.logger.success('Rollout restart complete');
  }

  /**
   * Perform cleanup (implementation of abstract method)
   * Deletes namespace but keeps cluster running
   */
  protected async performCleanup(): Promise<void> {
    this.logger.section('Cleanup');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would delete namespace srvthreds');
      return;
    }

    try {
      // Delete the namespace (removes all resources)
      this.logger.info('Deleting srvthreds namespace...');
      await this.k8s.deleteNamespace('srvthreds', { timeout: 60 });
      this.logger.success('Namespace deleted successfully');
    } catch (error) {
      this.logger.warn('Failed to delete namespace (may not exist)');
    }

    this.logger.info('Minikube deployment cleanup complete');
  }

  /**
   * Full cleanup - deletes Minikube cluster entirely
   */
  async destroyCluster(options: { deleteDatabases?: boolean } = {}): Promise<void> {
    this.logger.section('DESTROYING MINIKUBE CLUSTER');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would destroy Minikube cluster');
      if (options.deleteDatabases) {
        this.logger.info('[DRY RUN] Would delete host databases');
      }
      return;
    }

    try {
      // 1. Delete namespace first
      this.logger.info('Deleting Kubernetes resources...');
      try {
        await this.k8s.deleteNamespace('srvthreds', { timeout: 60 });
      } catch (error) {
        this.logger.warn('Namespace deletion skipped (may not exist)');
      }

      // 2. Stop Minikube
      this.logger.info('Stopping Minikube cluster...');
      try {
        await this.shell.exec('minikube', ['stop'], { silent: true });
      } catch (error) {
        this.logger.warn('Minikube was not running');
      }

      // 3. Delete Minikube cluster
      this.logger.info('Deleting Minikube cluster...');
      await this.shell.exec('minikube', ['delete']);
      this.logger.success('Minikube cluster deleted');

      // 4. Optionally delete host databases
      if (options.deleteDatabases) {
        this.logger.info('Stopping host databases...');
        try {
          await this.shell.exec('npm', ['run', 'deploy-local-down-databases'], {
            silent: true,
          });
          this.logger.success('Host databases stopped');
        } catch (error) {
          this.logger.warn('Failed to stop databases, may need manual cleanup');
        }
      } else {
        this.logger.warn('Host databases left running');
        this.logger.info('To stop databases: npm run deploy-local-down-databases');
      }

      this.logger.success('Cluster destruction complete!');
    } catch (error) {
      throw new Error(`Failed to destroy cluster: ${error}`);
    }
  }

  /**
   * Reset deployment - faster than full cleanup, keeps cluster running
   */
  async resetDeployment(): Promise<void> {
    this.logger.section('RESETTING MINIKUBE DEPLOYMENT');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would reset deployment');
      return;
    }

    try {
      // Switch to minikube context
      const currentContext = await this.k8s.getCurrentContext();
      if (currentContext !== 'minikube') {
        this.logger.info(`Switching context from ${currentContext} to minikube`);
        await this.k8s.setContext('minikube');
      }

      // Delete namespace only
      this.logger.info('Deleting srvthreds namespace...');
      await this.k8s.deleteNamespace('srvthreds', { timeout: 60 });

      this.logger.success('Reset complete! Minikube cluster still running.');
      this.logger.info('To redeploy: npm run minikube-deploy-ts');
    } catch (error) {
      throw new Error(`Failed to reset deployment: ${error}`);
    }
  }

  /**
   * Get Minikube dashboard URL
   */
  async getDashboardUrl(): Promise<string> {
    const result = await this.shell.exec('minikube', ['dashboard', '--url'], {
      timeout: 10000,
    });
    return result.stdout.trim();
  }

  /**
   * Setup port forwarding for local access
   */
  async setupPortForwarding(port: number = 3000): Promise<void> {
    this.logger.info(`Setting up port forwarding to session-agent on port ${port}...`);

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would setup port forwarding');
      return;
    }

    // Note: This runs in background, caller should manage the process
    await this.shell.exec(
      'kubectl',
      [
        'port-forward',
        'svc/srvthreds-session-agent-service',
        `${port}:3000`,
        '-n',
        'srvthreds',
      ],
      { timeout: 5000 }
    );

    this.logger.success(`Port forwarding established: http://localhost:${port}`);
  }
}
