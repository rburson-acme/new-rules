/**
 * Minikube Deployer
 * Handles deployment to local Minikube cluster
 */

import * as path from 'path';
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
import type { DeployerOptions, ValidationResult } from '../types/index.js';
import { loadProjectConfig, getProjectDir, type ProjectConfig } from '../../../kubernetes-cli/config/project-loader.js';
import {
  loadDeploymentConfigs,
  findDeployment,
  resolveMultiFileDeployment,
  type DeploymentConfig,
  type DeploymentCommand,
  type ResolvedDeployment,
} from '../config/deployment-config.js';

export interface MinikubeDeployerOptions extends DeployerOptions {
  manifestPath?: string;
  skipDatabaseSetup?: boolean;
  cpus?: number;
  memory?: number;
  diskSize?: string;
  /** Project name to deploy */
  project?: string;
  /** Deployment shortName to execute (from deployments/*.json) */
  deployment?: string;
}

/**
 * Deployer for Minikube (local development) environment
 */
export class MinikubeDeployer extends BaseDeployer {
  private shell: ShellExecutor;
  private k8s: KubernetesClient;
  private manifestPath: string;
  private skipDatabaseSetup: boolean;
  private projectConfig: ProjectConfig;
  private projectDir: string;
  private devopsRoot: string;
  private deploymentConfigs: DeploymentConfig[];
  private minikubeConfig: {
    cpus: number;
    memory: number;
    diskSize: string;
  };

  constructor(options: MinikubeDeployerOptions = {}) {
    super('minikube', 'minikube', options);

    if (!options.project) {
      throw new Error('Project name is required. Use --project flag to specify the project.');
    }
    const projectName = options.project;
    this.projectConfig = loadProjectConfig(projectName);
    this.projectDir = getProjectDir(projectName);
    this.devopsRoot = path.resolve(this.projectDir, '..', '..');

    // Load deployment configurations from project
    this.deploymentConfigs = loadDeploymentConfigs(this.projectConfig);

    this.shell = new ShellExecutor('MinikubeDeployer');
    this.k8s = new KubernetesClient({ context: 'minikube', verbose: options.verbose });
    this.manifestPath = options.manifestPath || this.projectConfig.minikube.manifestPath;
    this.skipDatabaseSetup = options.skipDatabaseSetup || false;

    this.minikubeConfig = {
      cpus: options.cpus || 4,
      memory: options.memory || 7836,
      diskSize: options.diskSize || '20g',
    };

    this.logger.section('Minikube Deployer Initialized');
    this.logger.info(`Project: ${this.projectConfig.name}`);
    this.logger.info(`Manifest path: ${this.manifestPath}`);
    this.logger.info(`Docker compose path: ${this.projectConfig.docker.composePath}`);
    this.logger.info(`Source path: ${this.projectConfig.source.path}`);
    this.logger.info(`Deployment configs loaded: ${this.deploymentConfigs.length}`);
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
      throw new PreDeploymentCheckError('Docker daemon is not running. Please start Docker Desktop.', {
        step: 'docker-check',
      });
    }
    this.logger.success('Docker daemon is running');

    // 2. Verify Minikube is installed
    this.logger.info('Checking Minikube installation...');
    const minikubeExists = await this.shell.commandExists('minikube');
    if (!minikubeExists) {
      throw new PreDeploymentCheckError('Minikube is not installed. Install from: https://minikube.sigs.k8s.io/', {
        step: 'minikube-check',
      });
    }

    // 3. Check if Minikube cluster exists and is running
    this.logger.info('Checking Minikube cluster status...');

    let minikubeStatus = '';
    try {
      const statusResult = await this.shell.exec('minikube', ['status', '--format', '{{.Host}}'], {
        silent: true,
        logErrors: false,
      });
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
    await this.k8s.ensureNamespace(this.projectConfig.kubernetes.namespace);
    this.logger.success(`Namespace ${this.projectConfig.kubernetes.namespace} ready`);
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
   * Execute deployment commands (preBuildCommands or postUpCommands)
   */
  private async executeDeploymentCommands(
    commands: DeploymentCommand[],
    envVars?: Record<string, string>,
  ): Promise<void> {
    for (const cmd of commands) {
      this.logger.info(`  ${cmd.description}`);

      // Parse command - handle shell commands with pipes, etc.
      const args = cmd.command.split(' ');
      const executable = args[0];
      const execArgs = args.slice(1);

      await this.shell.exec(executable, execArgs, {
        env: envVars,
        cwd: this.devopsRoot,
        timeout: 300000,
      });
    }
  }

  /**
   * Execute a single resolved deployment
   */
  private async executeResolvedDeployment(
    resolved: ResolvedDeployment,
    envVars?: Record<string, string>,
  ): Promise<void> {
    this.logger.info(`Executing: ${resolved.name}`);
    this.logger.info(`  Compose file: ${resolved.composeFilePath}`);
    this.logger.info(`  Command: ${resolved.deployCommand}`);
    this.logger.info(`  Args: ${resolved.defaultArgs}`);

    // Execute pre-build commands
    if (resolved.preBuildCommands.length > 0) {
      this.logger.info('Running pre-build commands...');
      await this.executeDeploymentCommands(resolved.preBuildCommands, envVars);
    }

    // Run the compose command
    const composeArgs = resolved.defaultArgs.split(' ').filter((arg) => arg.length > 0);

    await this.shell.exec(
      'docker',
      ['compose', '-f', resolved.composeFilePath, resolved.deployCommand, ...composeArgs],
      {
        env: envVars,
        timeout: 300000,
        cwd: this.devopsRoot,
      },
    );

    // Execute post-up commands
    if (resolved.postUpCommands.length > 0) {
      this.logger.info('Running post-up commands...');
      await this.executeDeploymentCommands(resolved.postUpCommands, envVars);
    }
  }

  /**
   * Execute a deployment by shortName
   *
   * This is the generic deployment execution method. It looks up the deployment
   * configuration by shortName, resolves environment-specific overrides, and
   * executes the configured commands (preBuildCommands, compose command, postUpCommands).
   *
   * @param shortName - The deployment shortName from deployments/*.json
   * @param options - Execution options
   */
  async executeDeployment(shortName: string, options: { useMinikubeDocker?: boolean } = {}): Promise<void> {
    this.logger.section(`Executing Deployment: ${shortName}`);

    // Find deployment config
    const deploymentConfig = findDeployment(this.deploymentConfigs, shortName);
    if (!deploymentConfig) {
      throw new Error(`Deployment configuration not found: ${shortName}`);
    }

    // Verify this deployment supports minikube environment
    if (!deploymentConfig.environments.includes('minikube')) {
      throw new Error(
        `Deployment '${shortName}' does not support minikube environment. ` +
          `Supported: ${deploymentConfig.environments.join(', ')}`,
      );
    }

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would execute deployment: ${shortName}`);
      const resolved = resolveMultiFileDeployment(deploymentConfig, 'minikube', this.projectConfig);
      for (const r of resolved) {
        this.logger.info(`  Compose file: ${r.composeFilePath}`);
        this.logger.info(`  Command: ${r.deployCommand} ${r.defaultArgs}`);
      }
      return;
    }

    // Get environment variables (optionally use Minikube Docker)
    let envVars: Record<string, string> | undefined;
    if (options.useMinikubeDocker) {
      this.logger.info('Configuring Docker to use Minikube environment...');
      envVars = await this.getMinikubeDockerEnv();
    }

    // Resolve deployment for minikube environment (handles single or multi-file)
    const resolvedDeployments = resolveMultiFileDeployment(deploymentConfig, 'minikube', this.projectConfig);

    // Execute each resolved deployment in order
    for (const resolved of resolvedDeployments) {
      await this.executeResolvedDeployment(resolved, envVars);
    }

    this.logger.success(`Deployment '${shortName}' completed successfully`);
  }

  /**
   * Build Docker images in Minikube environment
   *
   * Uses the generic executeDeployment method with the deployment shortName
   * specified in options, or falls back to 'build_server' for backwards compatibility.
   */
  protected async buildImages(): Promise<void> {
    this.logger.section('Building Docker Images');

    // Deployment must be specified - no default assumptions
    const deploymentShortName = (this.options as MinikubeDeployerOptions).deployment;
    if (!deploymentShortName) {
      throw new ImageBuildError(
        'No deployment specified. Use --deployment flag to specify which deployment to execute.',
        { step: 'build-images' },
      );
    }

    try {
      await this.executeDeployment(deploymentShortName, { useMinikubeDocker: true });

      // Tag builder image for convenience (only for build commands)
      const deploymentConfig = findDeployment(this.deploymentConfigs, deploymentShortName);
      if (deploymentConfig?.target.deployCommand === 'build') {
        const envVars = await this.getMinikubeDockerEnv();
        const builderImage = this.projectConfig.docker.builderImage;
        const projectName = this.projectConfig.name.toLowerCase();
        this.logger.info('Tagging builder image...');
        await this.shell.exec('docker', ['tag', builderImage, `${projectName}:dev`], { env: envVars });
      }

      const imageTag = this.options.imageTag || 'dev';
      this.state.setImageTag(imageTag);

      this.logger.success('Images built successfully');
    } catch (error) {
      throw new ImageBuildError(
        `Failed to build images: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'build-images' },
        error instanceof Error ? error : undefined,
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
   * Setup host databases for Minikube
   *
   * Executes the specified database deployment on the host Docker (not Minikube's Docker).
   * Any database-specific initialization (replica sets, etc.) should be configured
   * in the deployment's postUpCommands.
   *
   * @param databaseDeployment - The deployment shortName for starting databases
   */
  async setupHostDatabases(databaseDeployment: string): Promise<void> {
    if (this.skipDatabaseSetup) {
      this.logger.info('Skipping database setup (skipDatabaseSetup=true)');
      return;
    }

    this.logger.section('Setting Up Host Databases');

    try {
      // Reset Docker environment to host (not Minikube)
      // This ensures databases run on host Docker, accessible via host.minikube.internal
      this.logger.info('Resetting Docker environment to host...');
      await this.shell.exec('minikube', ['docker-env', '--unset']);

      // Execute the specified database deployment (without Minikube Docker env)
      // The deployment's postUpCommands handle any initialization (e.g., replica set setup)
      await this.executeDeployment(databaseDeployment, { useMinikubeDocker: false });

      this.logger.success('Host databases are ready');
    } catch (error) {
      throw new PreDeploymentCheckError(
        `Failed to set up host databases: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'database-setup' },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Apply Kubernetes manifests using kubectl + kustomize
   */
  protected async applyManifests(manifestPath?: string): Promise<void> {
    this.logger.section('Applying Kubernetes Manifests');

    const targetPath = manifestPath || this.manifestPath;

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would apply manifests from: ${targetPath}`);
      return;
    }

    try {
      // Apply Kubernetes manifests with kustomize
      this.logger.info(`Applying manifests from: ${targetPath}`);
      await this.k8s.apply(targetPath, { namespace: this.projectConfig.kubernetes.namespace, kustomize: true });

      this.logger.success('Manifests applied successfully');
    } catch (error) {
      throw new ManifestApplicationError(
        `Failed to apply manifests: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { manifestPath: targetPath },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Wait for deployments to be ready
   */
  protected async waitForReadiness(): Promise<void> {
    this.logger.section('Waiting for Deployments');

    const deployments = this.projectConfig.kubernetes.deployments;

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would wait for deployments to be ready');
      return;
    }

    try {
      for (const deploymentName of deployments) {
        this.logger.info(`Waiting for ${deploymentName}...`);

        await retry(
          async () => {
            const deployment = await this.k8s.getDeployment(deploymentName, this.projectConfig.kubernetes.namespace);

            if (deployment.replicas.ready === deployment.replicas.desired) {
              this.logger.success(
                `${deploymentName} is ready (${deployment.replicas.ready}/${deployment.replicas.desired})`,
              );
              return;
            }

            throw new Error(`${deploymentName} not ready: ${deployment.replicas.ready}/${deployment.replicas.desired}`);
          },
          {
            maxAttempts: 60,
            delay: 5000,
            backoff: 1,
          },
        );

        this.state.addDeployedResource({
          kind: 'Deployment',
          name: deploymentName,
          namespace: this.projectConfig.kubernetes.namespace,
          status: 'deployed',
        });
      }

      this.logger.success('All deployments are ready');
    } catch (error) {
      throw new ValidationError(
        `Deployments failed to become ready: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'wait-for-readiness' },
        error instanceof Error ? error : undefined,
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

    const namespace = this.projectConfig.kubernetes.namespace;

    // Check pod status
    this.logger.info('Checking pod status...');
    const pods = await this.k8s.getPods(namespace);

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
    const services = await this.k8s.getServices(namespace);
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

    const namespace = this.projectConfig.kubernetes.namespace;
    const deployments = this.projectConfig.kubernetes.deployments;

    for (const deploymentName of deployments) {
      this.logger.info(`Restarting ${deploymentName}...`);
      await this.k8s.restartDeployment(deploymentName, namespace);
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
      this.logger.info(`[DRY RUN] Would delete namespace ${this.projectConfig.kubernetes.namespace}`);
      return;
    }

    try {
      // Delete the namespace (removes all resources)
      this.logger.info(`Deleting ${this.projectConfig.kubernetes.namespace} namespace...`);
      await this.k8s.deleteNamespace(this.projectConfig.kubernetes.namespace, { timeout: 60 });
      this.logger.success('Namespace deleted successfully');
    } catch (error) {
      this.logger.warn('Failed to delete namespace (may not exist)');
    }

    this.logger.info('Minikube deployment cleanup complete');
  }

  /**
   * Full cleanup - deletes Minikube cluster entirely
   *
   * @param options.deleteDatabases - Whether to stop host databases
   * @param options.databaseStopDeployment - The deployment shortName for stopping databases (required if deleteDatabases is true)
   */
  async destroyCluster(options: { deleteDatabases?: boolean; databaseStopDeployment?: string } = {}): Promise<void> {
    this.logger.section('DESTROYING MINIKUBE CLUSTER');

    if (options.deleteDatabases && !options.databaseStopDeployment) {
      throw new Error('databaseStopDeployment is required when deleteDatabases is true');
    }

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would destroy Minikube cluster');
      if (options.deleteDatabases) {
        this.logger.info(`[DRY RUN] Would delete host databases using deployment: ${options.databaseStopDeployment}`);
      }
      return;
    }

    try {
      // 1. Delete namespace first
      this.logger.info('Deleting Kubernetes resources...');
      try {
        await this.k8s.deleteNamespace(this.projectConfig.kubernetes.namespace, { timeout: 60 });
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
      if (options.deleteDatabases && options.databaseStopDeployment) {
        this.logger.info('Stopping host databases...');
        try {
          await this.executeDeployment(options.databaseStopDeployment, { useMinikubeDocker: false });
          this.logger.success('Host databases stopped');
        } catch (error) {
          this.logger.warn('Failed to stop databases, may need manual cleanup');
        }
      } else {
        this.logger.warn('Host databases left running');
        this.logger.info('To stop databases, use: k8s minikube run <db-stop-deployment> -p <project>');
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
      this.logger.info(`Deleting ${this.projectConfig.kubernetes.namespace} namespace...`);
      await this.k8s.deleteNamespace(this.projectConfig.kubernetes.namespace, { timeout: 60 });

      this.logger.success('Reset complete! Minikube cluster still running.');
      this.logger.info('To redeploy: npm run minikube:deploy');
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
   *
   * @param serviceName - The Kubernetes service name to forward to
   * @param port - Local port to forward to (default 3000)
   * @param targetPort - Target port on the service (default 3000)
   */
  async setupPortForwarding(serviceName: string, port: number = 3000, targetPort: number = 3000): Promise<void> {
    this.logger.info(`Setting up port forwarding to ${serviceName} on port ${port}...`);

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would setup port forwarding');
      return;
    }

    const namespace = this.projectConfig.kubernetes.namespace;

    // Note: This runs in background, caller should manage the process
    await this.shell.exec('kubectl', ['port-forward', `svc/${serviceName}`, `${port}:${targetPort}`, '-n', namespace], {
      timeout: 5000,
    });

    this.logger.success(`Port forwarding established: http://localhost:${port}`);
  }
}
