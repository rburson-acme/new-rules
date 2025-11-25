/**
 * AKS (Azure Kubernetes Service) Deployer
 * Handles deployments to Azure AKS clusters for dev/test/prod environments
 */

import { BaseDeployer } from './BaseDeployer.js';
import { KubernetesClient } from '../operations/KubernetesClient.js';
import { ShellExecutor } from '../utils/shell.js';
import { DeployerOptions, ValidationResult, Environment } from '../types/index.js';
import {
  PreDeploymentCheckError,
  ImageBuildError,
  ImagePushError,
  ManifestApplicationError,
  ValidationError,
} from '../utils/errors.js';
import { retry } from '../utils/retry.js';

/**
 * AKS-specific configuration options
 */
export interface AKSDeployerOptions extends DeployerOptions {
  environment: 'dev' | 'test' | 'prod';
  subscriptionId?: string;
  resourceGroup?: string;
  clusterName?: string;
  acrName?: string;
  manifestPath?: string;
  imageTag?: string;
  namespace?: string;
}

/**
 * Azure resource naming following Army NETCOM convention
 */
interface AzureNaming {
  caz: string;
  appName: string;
  envCode: string;
  region: string;
  resourceGroup: string;
  clusterName: string;
  acrName: string;
}

/**
 * Deployer for Azure Kubernetes Service (AKS)
 * Supports dev, test, and prod environments
 */
export class AKSDeployer extends BaseDeployer {
  private shell: ShellExecutor;
  private k8s: KubernetesClient;
  private aksOptions: AKSDeployerOptions & {
    environment: 'dev' | 'test' | 'prod';
    subscriptionId: string;
    resourceGroup: string;
    clusterName: string;
    acrName: string;
    manifestPath: string;
    imageTag: string;
    namespace: string;
  };
  private naming: AzureNaming;

  constructor(options: AKSDeployerOptions) {
    // Map environment to full Environment type
    const fullEnvironment: Environment = `azure-${options.environment}` as Environment;
    super(fullEnvironment, 'aks', options);

    // Generate Azure naming conventions
    this.naming = this.generateNaming(options.environment);

    // Set defaults with naming conventions
    this.aksOptions = {
      ...options,
      environment: options.environment,
      subscriptionId: options.subscriptionId || '',
      resourceGroup: options.resourceGroup || this.naming.resourceGroup,
      clusterName: options.clusterName || this.naming.clusterName,
      acrName: options.acrName || this.naming.acrName,
      manifestPath: options.manifestPath || `kubernetes/srvthreds/${options.environment}/`,
      imageTag: options.imageTag || 'latest',
      namespace: options.namespace || 'srvthreds',
    };

    this.shell = new ShellExecutor('AKSDeployer');

    // KubernetesClient will be initialized after getting AKS credentials
    this.k8s = new KubernetesClient({
      context: this.naming.clusterName,
      verbose: options.verbose
    });

    this.logger.section('AKS Deployer Initialized');
    this.logger.info(`Environment: ${options.environment}`);
    this.logger.info(`Resource Group: ${this.aksOptions.resourceGroup}`);
    this.logger.info(`Cluster: ${this.aksOptions.clusterName}`);
    this.logger.info(`ACR: ${this.aksOptions.acrName}`);
    this.logger.info(`Namespace: ${this.aksOptions.namespace}`);
  }

  /**
   * Generate Azure resource names following Army NETCOM naming convention
   * Format: CAZ-SRVTHREDS-{D|T|P}-E-{ResourceType}
   */
  private generateNaming(environment: 'dev' | 'test' | 'prod'): AzureNaming {
    const caz = 'CAZ';
    const appName = 'SRVTHREDS';
    const envCode = environment === 'dev' ? 'D' : environment === 'test' ? 'T' : 'P';
    const region = 'E'; // East US

    return {
      caz,
      appName,
      envCode,
      region,
      resourceGroup: `${caz}-${appName}-${envCode}-${region}-RG`,
      clusterName: `${caz}-${appName}-${envCode}-${region}-AKS`, // Keep uppercase for kubectl context
      acrName: `${caz}${appName}${envCode}${region}ACR`.toLowerCase().replace(/-/g, ''),
    };
  }

  /**
   * Pre-deployment checks
   */
  protected async preDeployChecks(): Promise<void> {
    this.logger.section('Pre-Deployment Checks');

    // 1. Check Azure CLI is installed
    this.logger.info('Checking Azure CLI...');
    const azExists = await this.shell.commandExists('az');
    if (!azExists) {
      throw new PreDeploymentCheckError(
        'Azure CLI is not installed. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli',
        { step: 'azure-cli-check' }
      );
    }

    // 2. Check Azure login status
    this.logger.info('Checking Azure authentication...');
    try {
      const accountResult = await this.shell.exec('az', ['account', 'show', '--output', 'json'], {
        silent: true,
      });
      const account = JSON.parse(accountResult.stdout);
      this.logger.success(`Logged in as: ${account.user.name}`);
      this.logger.info(`Subscription: ${account.name} (${account.id})`);

      // Set subscription if specified
      if (this.aksOptions.subscriptionId && account.id !== this.aksOptions.subscriptionId) {
        this.logger.info(`Switching to subscription: ${this.aksOptions.subscriptionId}`);
        await this.shell.exec('az', ['account', 'set', '--subscription', this.aksOptions.subscriptionId]);
      }
    } catch (error) {
      throw new PreDeploymentCheckError(
        'Not logged in to Azure. Run: az login',
        { step: 'azure-auth-check' },
        error instanceof Error ? error : undefined
      );
    }

    // 3. Verify AKS cluster exists
    this.logger.info('Verifying AKS cluster...');
    try {
      const aksResult = await this.shell.exec(
        'az',
        [
          'aks',
          'show',
          '--resource-group',
          this.aksOptions.resourceGroup,
          '--name',
          this.aksOptions.clusterName,
          '--output',
          'json',
        ],
        { silent: true }
      );
      const cluster = JSON.parse(aksResult.stdout);
      this.logger.success(`AKS cluster found: ${cluster.name}`);
      this.logger.info(`Kubernetes version: ${cluster.currentKubernetesVersion}`);
      this.logger.info(`Status: ${cluster.powerState.code}`);
    } catch (error) {
      throw new PreDeploymentCheckError(
        `AKS cluster '${this.aksOptions.clusterName}' not found in resource group '${this.aksOptions.resourceGroup}'`,
        { step: 'aks-cluster-check' },
        error instanceof Error ? error : undefined
      );
    }

    // 4. Get AKS credentials and set kubectl context
    this.logger.info('Getting AKS credentials...');
    if (!this.options.dryRun) {
      try {
        await this.shell.exec('az', [
          'aks',
          'get-credentials',
          '--resource-group',
          this.aksOptions.resourceGroup,
          '--name',
          this.aksOptions.clusterName,
          '--overwrite-existing',
        ]);
        this.logger.success('AKS credentials configured');
      } catch (error) {
        throw new PreDeploymentCheckError(
          'Failed to get AKS credentials',
          { step: 'aks-credentials' },
          error instanceof Error ? error : undefined
        );
      }
    } else {
      this.logger.info('[DRY RUN] Would get AKS credentials');
    }

    // 5. Verify kubectl context
    this.logger.info('Verifying kubectl context...');
    await this.k8s.verify();

    const currentContext = await this.k8s.getCurrentContext();
    this.logger.info(`Current context: ${currentContext}`);

    // 6. Verify ACR access
    this.logger.info('Verifying ACR access...');
    try {
      const acrResult = await this.shell.exec(
        'az',
        ['acr', 'show', '--name', this.aksOptions.acrName, '--output', 'json'],
        { silent: true }
      );
      const acr = JSON.parse(acrResult.stdout);
      this.logger.success(`ACR found: ${acr.loginServer}`);
      this.state.addMetadata('acrLoginServer', acr.loginServer);
    } catch (error) {
      throw new PreDeploymentCheckError(
        `ACR '${this.aksOptions.acrName}' not found`,
        { step: 'acr-check' },
        error instanceof Error ? error : undefined
      );
    }

    // 7. Ensure namespace exists
    this.logger.info(`Ensuring namespace '${this.aksOptions.namespace}'...`);
    try {
      if (!this.options.dryRun) {
        await this.k8s.ensureNamespace(this.aksOptions.namespace);
        this.logger.success(`Namespace '${this.aksOptions.namespace}' ready`);
      } else {
        this.logger.info(`[DRY RUN] Would ensure namespace '${this.aksOptions.namespace}'`);
      }
    } catch (error) {
      this.logger.error(`Namespace check failed: ${error instanceof Error ? error.message : error}`);
      throw new PreDeploymentCheckError(
        `Failed to ensure namespace '${this.aksOptions.namespace}': ${error instanceof Error ? error.message : 'Unknown error'}`,
        { step: 'namespace-check' },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Build Docker images
   */
  protected async buildImages(): Promise<void> {
    this.logger.section('Building Docker Images');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would build Docker images');
      return;
    }

    const acrLoginServer = this.state.getMetadata('acrLoginServer') as string;
    const imageTag = this.aksOptions.imageTag;

    try {
      this.logger.info('Building server images...');

      // Run pre-build commands (config generation and validation)
      // Note: These tools are now in devops/tools/shared/config/
      this.logger.info('Generating configurations...');
      await this.shell.exec('npm', ['run', 'config:generate']);

      this.logger.info('Validating configuration consistency...');
      await this.shell.exec('npm', ['run', 'config:validate']);

      // Build all service images using docker compose
      // IMPORTANT: Build for linux/amd64 since AKS nodes run on x86_64, not arm64
      this.logger.info('Building all service images for linux/amd64 platform...');
      this.logger.info('This may take several minutes...');

      // Set DOCKER_DEFAULT_PLATFORM for the build
      const buildEnv = {
        ...process.env,
        DOCKER_DEFAULT_PLATFORM: 'linux/amd64',
      };

      // Step 1: Build the builder image first (other images depend on it)
      this.logger.info('Step 1: Building srvthreds-builder image...');
      await this.shell.exec(
        'docker',
        [
          'compose',
          '--progress=plain',
          '-f',
          '../srvthreds/infrastructure/local/docker/compose/docker-compose-services.yml',
          'build',
          '--no-cache',
          '--build-arg',
          'BUILDPLATFORM=linux/amd64',
          'srvthreds-builder',
        ],
        {
          timeout: 600000, // 10 minute timeout for build
          streamOutput: true, // Enable real-time output for Docker builds
          env: buildEnv
        }
      );

      // Step 2: Build all services that depend on builder
      this.logger.info('Step 2: Building service images (bootstrap, engine, session-agent, persistence-agent)...');
      await this.shell.exec(
        'docker',
        [
          'compose',
          '--progress=plain',
          '-f',
          '../srvthreds/infrastructure/local/docker/compose/docker-compose-services.yml',
          'build',
          '--no-cache',
          '--build-arg',
          'BUILDPLATFORM=linux/amd64',
          'srvthreds-bootstrap',
          'srvthreds-engine',
          'srvthreds-session-agent',
          'srvthreds-persistence-agent',
        ],
        {
          timeout: 600000, // 10 minute timeout for build
          streamOutput: true, // Enable real-time output for Docker builds
          env: buildEnv
        }
      );

      // Tag images for ACR
      const images = [
        'srvthreds/bootstrap',
        'srvthreds/engine',
        'srvthreds/session-agent',
        'srvthreds/persistence-agent',
      ];

      const acrImages: string[] = [];
      for (const imageName of images) {
        const acrImage = `${acrLoginServer}/${imageName}:${imageTag}`;
        this.logger.info(`Tagging ${imageName}:latest → ${acrImage}`);
        await this.shell.exec('docker', ['tag', `${imageName}:latest`, acrImage]);
        acrImages.push(acrImage);
      }

      this.state.addMetadata('acrImages', acrImages);

      // Note: Docker build assets cleanup removed - docker compose files remain in srvthreds

      this.logger.success(`Images built and tagged successfully (${acrImages.length} images)`);
    } catch (error) {
      throw new ImageBuildError(
        'Failed to build Docker images',
        { environment: this.aksOptions.environment },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Push images to Azure Container Registry
   */
  protected async pushImages(): Promise<void> {
    this.logger.section('Pushing Images to ACR');

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would push images to ACR');
      return;
    }

    try {
      // Login to ACR
      this.logger.info(`Logging in to ACR: ${this.aksOptions.acrName}`);
      await this.shell.exec('az', ['acr', 'login', '--name', this.aksOptions.acrName]);
      this.logger.success('ACR login successful');

      // Push all images
      const acrImages = this.state.getMetadata('acrImages') as string[];
      this.logger.info(`Pushing ${acrImages.length} images to ACR...`);
      this.logger.info('This may take several minutes for large images...');

      for (let i = 0; i < acrImages.length; i++) {
        const acrImage = acrImages[i];
        const imageName = acrImage.split('/').pop(); // Get just the image name
        this.logger.info(`[${i + 1}/${acrImages.length}] Pushing ${imageName}...`);

        await this.shell.exec('docker', ['push', acrImage], {
          timeout: 1200000, // 20 minute timeout per image
          streamOutput: true // Enable real-time output for Docker push
        });

        this.logger.success(`✓ ${imageName} pushed successfully`);
      }

      this.logger.success(`All ${acrImages.length} images pushed to ACR successfully`);
      this.state.addMetadata('imagePushed', true);
    } catch (error) {
      throw new ImagePushError(
        'Failed to push images to ACR',
        { acr: this.aksOptions.acrName },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Apply Kubernetes manifests
   */
  protected async applyManifests(manifestPath?: string): Promise<void> {
    this.logger.section('Applying Kubernetes Manifests');

    const path = manifestPath || this.aksOptions.manifestPath;

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would apply manifests from: ${path}`);
      return;
    }

    try {
      this.logger.info(`Applying manifests from: ${path}`);
      await this.k8s.apply(path, {
        namespace: this.aksOptions.namespace,
        kustomize: true,
        serverSide: true,
      });

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

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would wait for deployments to be ready');
      return;
    }

    const deploymentNames = ['srvthreds-engine', 'srvthreds-session-agent', 'srvthreds-persistence-agent'];

    try {
      for (const deploymentName of deploymentNames) {
        this.logger.info(`Waiting for ${deploymentName}...`);

        await retry(
          async () => {
            const deployment = await this.k8s.getDeployment(deploymentName, this.aksOptions.namespace);

            if (deployment.replicas.ready !== deployment.replicas.desired) {
              throw new Error(
                `${deploymentName} not ready: ${deployment.replicas.ready}/${deployment.replicas.desired}`
              );
            }

            this.logger.success(
              `${deploymentName} is ready (${deployment.replicas.ready}/${deployment.replicas.desired})`
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
          namespace: this.aksOptions.namespace,
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

    if (this.options.dryRun) {
      this.logger.info('[DRY RUN] Would validate deployed resources');
      return validation;
    }

    // Check pod status
    this.logger.info('Checking pod status...');
    const pods = await this.k8s.getPods(this.aksOptions.namespace);

    const notReady = pods.filter((p) => !p.ready);
    if (notReady.length > 0) {
      validation.healthy = false;
      validation.issues.push({
        severity: 'error',
        message: `${notReady.length} pods are not ready: ${notReady.map((p) => p.name).join(', ')}`,
        resource: 'pods',
      });
    } else {
      this.logger.success(`All ${pods.length} pods are ready`);
    }

    // Check service endpoints
    this.logger.info('Checking services...');
    const services = await this.k8s.getServices(this.aksOptions.namespace);
    this.logger.success(`Found ${services.length} services`);

    if (validation.healthy) {
      this.logger.success('All validation checks passed');
    } else {
      this.logger.warn(`Validation found ${validation.issues.length} issues`);
    }

    return validation;
  }

  /**
   * Perform cleanup (delete namespace)
   */
  protected async performCleanup(): Promise<void> {
    this.logger.section('Cleanup');

    if (this.options.dryRun) {
      this.logger.info(`[DRY RUN] Would delete namespace ${this.aksOptions.namespace}`);
      return;
    }

    try {
      this.logger.info(`Deleting namespace ${this.aksOptions.namespace}...`);
      await this.k8s.deleteNamespace(this.aksOptions.namespace, { timeout: 60 });
      this.logger.success('Namespace deleted successfully');
    } catch (error) {
      this.logger.warn('Failed to delete namespace (may not exist)');
    }

    this.logger.info('AKS deployment cleanup complete');
  }

  protected async rolloutRestart(): Promise<void> {
    this.logger.section('Rollout Restarting Deployments');

   try {
      this.logger.info(`Rolling out restart ${this.aksOptions.clusterName}...`);
      await this.k8s.restartAKS(this.aksOptions.clusterName);
      this.logger.success('Namespace deleted successfully');
    } catch (error) {
      this.logger.warn('Failed to delete namespace (may not exist)');
    }

    this.logger.info('AKS deployment cleanup complete');
  }
}
