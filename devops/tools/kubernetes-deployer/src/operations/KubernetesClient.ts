/**
 * Kubernetes Client
 * Type-safe wrapper around kubectl operations
 */

import { ShellExecutor, type ExecResult } from '../utils/shell.js';
import { Logger } from '../utils/logger.js';
import { retry } from '../utils/retry.js';
import {
  type Pod,
  type Deployment,
  type Service,
  type Namespace,
  type PodStatus,
} from '../types/kubernetes.types.js';
import {
  KubernetesError,
  ResourceNotFoundError,
  NamespaceNotFoundError,
} from '../utils/errors.js';

export interface KubernetesClientOptions {
  context?: string;
  namespace?: string;
  kubeconfig?: string;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface KubectlApplyOptions {
  namespace?: string;
  dryRun?: boolean;
  validate?: boolean;
  force?: boolean;
  serverSide?: boolean;
  kustomize?: boolean; // Use -k instead of -f for kustomize directories
}

export interface DeleteOptions {
  namespace?: string;
  gracePeriod?: number;
  force?: boolean;
  cascade?: 'background' | 'orphan' | 'foreground';
}

export interface WaitOptions {
  timeout?: number;
  condition?: string;
}

/**
 * KubernetesClient - Type-safe wrapper around kubectl
 */
export class KubernetesClient {
  private shell: ShellExecutor;
  private logger: Logger;
  private options: KubernetesClientOptions;

  constructor(options: KubernetesClientOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      ...options,
    };

    this.shell = new ShellExecutor();
    this.logger = new Logger('KubernetesClient');
  }

  /**
   * Verify kubectl is available
   */
  async verify(): Promise<void> {
    const exists = await this.shell.commandExists('kubectl');
    if (!exists) {
      throw new KubernetesError('kubectl command not found. Please install kubectl.');
    }

    try {
      const result = await this.shell.exec('kubectl', ['version', '--client'], { silent: true });
      const version = result.stdout.split('\n')[0];
      this.logger.info(`Using kubectl ${version}`);
    } catch (error) {
      throw new KubernetesError(`Failed to get kubectl version: ${error}`);
    }
  }

  /**
   * Get current context
   */
  async getCurrentContext(): Promise<string> {
    const result = await this.exec(['config', 'current-context']);
    return result.stdout.trim();
  }

  /**
   * Set current context
   */
  async setContext(context: string): Promise<void> {
    await this.exec(['config', 'use-context', context]);
    this.logger.info(`Switched to context: ${context}`);
  }

  /**
   * Create namespace if it doesn't exist
   */
  async ensureNamespace(namespace: string): Promise<void> {
    try {
      await this.getNamespace(namespace);
      this.logger.debug(`Namespace ${namespace} already exists`);
    } catch (error) {
      if (error instanceof NamespaceNotFoundError) {
        await this.createNamespace(namespace);
      } else {
        throw error;
      }
    }
  }

  /**
   * Create namespace
   */
  async createNamespace(namespace: string): Promise<void> {
    await this.exec(['create', 'namespace', namespace]);
    this.logger.info(`Created namespace: ${namespace}`);
  }

  /**
   * Delete namespace
   */
  async deleteNamespace(namespace: string, options: { timeout?: number } = {}): Promise<void> {
    const args = ['delete', 'namespace', namespace, '--ignore-not-found=true'];

    if (options.timeout) {
      args.push(`--timeout=${options.timeout}s`);
    }

    await this.exec(args);

    // Wait for namespace to be fully deleted
    if (options.timeout) {
      try {
        await this.exec(['wait', '--for=delete', `namespace/${namespace}`, `--timeout=${options.timeout}s`]);
      } catch (error) {
        // Ignore timeout errors - namespace may have been deleted already
      }
    }

    this.logger.info(`Deleted namespace: ${namespace}`);
  }

  /**
   * Get namespace
   */
  async getNamespace(namespace: string): Promise<Namespace> {
    try {
      // Suppress error logging - namespace not found is an expected condition
      const result = await this.exec(['get', 'namespace', namespace, '-o', 'json'], { logErrors: false });
      const data = JSON.parse(result.stdout);
      return {
        name: data.metadata.name,
        status: data.status?.phase || 'Active',
        labels: data.metadata.labels || {},
      };
    } catch (error) {
      throw new NamespaceNotFoundError(`Namespace ${namespace} not found`);
    }
  }

  /**
   * Apply manifest from file or directory
   * Automatically handles Job immutability by deleting and re-applying
   */
  async apply(manifestPath: string, options: KubectlApplyOptions = {}): Promise<void> {
    // Use -k for kustomize directories, -f for regular files/directories
    const fileFlag = options.kustomize ? '-k' : '-f';
    const args = ['apply', fileFlag, manifestPath];

    if (options.namespace) {
      args.push('-n', options.namespace);
    }

    if (options.validate === false) {
      args.push('--validate=false');
    }

    if (options.force) {
      args.push('--force');
    }

    if (options.serverSide) {
      args.push('--server-side', '--force-conflicts');
    }

    if (this.options.dryRun || options.dryRun) {
      args.push('--dry-run=client');
    }

    try {
      await this.exec(args);
      this.logger.info(`Applied manifests from: ${manifestPath}`);
    } catch (error) {
      // Check if this is a Job immutability error
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.isJobImmutabilityError(errorMessage)) {
        // Extract job name from error message
        const jobName = this.extractJobNameFromError(errorMessage);

        if (jobName) {
          this.logger.warn('Detected Job immutability error - attempting to delete and re-apply');
          this.logger.info(`Deleting existing Job: ${jobName}`);

          try {
            await this.delete('job', jobName, {
              namespace: options.namespace,
              cascade: 'foreground',
            });

            this.logger.info('Retrying manifest apply...');
            await this.exec(args);
            this.logger.success(`Successfully re-applied manifests after deleting Job: ${jobName}`);
            return; // Success after retry
          } catch (retryError) {
            this.logger.error('Failed to delete and re-apply Job');
            throw retryError;
          }
        } else {
          this.logger.warn('Detected Job immutability error but could not extract job name');
          this.logger.debug(`Error message: ${errorMessage.substring(0, 500)}`);
          throw error;
        }
      } else {
        // Not a Job immutability error, re-throw
        throw error;
      }
    }
  }

  /**
   * Check if error message indicates Job immutability issue
   */
  private isJobImmutabilityError(errorMessage: string): boolean {
    return (
      errorMessage.includes('field is immutable') &&
      (errorMessage.includes('Job') || errorMessage.includes('spec.template'))
    );
  }

  /**
   * Extract Job name from error message
   * Example: 'The Job "srvthreds-bootstrap" is invalid: spec.template: Invalid value...'
   */
  private extractJobNameFromError(errorMessage: string): string | null {
    const match = errorMessage.match(/Job\s+"([^"]+)"/);
    return match ? match[1] : null;
  }

  /**
   * Delete resources
   */
  async delete(
    resourceType: string,
    name: string,
    options: DeleteOptions = {}
  ): Promise<void> {
    const args = ['delete', resourceType, name];

    if (options.namespace) {
      args.push('-n', options.namespace);
    }

    if (options.gracePeriod !== undefined) {
      args.push(`--grace-period=${options.gracePeriod}`);
    }

    if (options.force) {
      args.push('--force');
    }

    if (options.cascade) {
      args.push(`--cascade=${options.cascade}`);
    }

    await this.exec(args);
    this.logger.info(`Deleted ${resourceType}/${name}`);
  }

  /**
   * Get pods in namespace
   */
  async getPods(namespace?: string): Promise<Pod[]> {
    const args = ['get', 'pods', '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    }

    const result = await this.exec(args);
    const data = JSON.parse(result.stdout);

    return data.items.map((item: any) => this.parsePod(item));
  }

  /**
   * Get pod by name
   */
  async getPod(name: string, namespace?: string): Promise<Pod> {
    const args = ['get', 'pod', name, '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    }

    try {
      const result = await this.exec(args);
      const data = JSON.parse(result.stdout);
      return this.parsePod(data);
    } catch (error) {
      throw new ResourceNotFoundError(`Pod ${name} not found in namespace ${namespace}`);
    }
  }

  /**
   * Get deployments
   */
  async getDeployments(namespace?: string): Promise<Deployment[]> {
    const args = ['get', 'deployments', '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    }

    const result = await this.exec(args);
    const data = JSON.parse(result.stdout);

    return data.items.map((item: any) => this.parseDeployment(item));
  }

  /**
   * Get deployment by name
   */
  async getDeployment(name: string, namespace?: string): Promise<Deployment> {
    const args = ['get', 'deployment', name, '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    }

    try {
      const result = await this.exec(args);
      const data = JSON.parse(result.stdout);
      return this.parseDeployment(data);
    } catch (error) {
      throw new ResourceNotFoundError(
        `Deployment ${name} not found in namespace ${namespace}`
      );
    }
  }

  /**
   * Get services
   */
  async getServices(namespace?: string): Promise<Service[]> {
    const args = ['get', 'services', '-o', 'json'];
    if (namespace) {
      args.push('-n', namespace);
    }

    const result = await this.exec(args);
    const data = JSON.parse(result.stdout);

    return data.items.map((item: any) => this.parseService(item));
  }

  /**
   * Wait for resource condition
   */
  async waitFor(
    resourceType: string,
    name: string,
    condition: string,
    options: WaitOptions = {}
  ): Promise<void> {
    const timeout = options.timeout || 300;
    const args = [
      'wait',
      `${resourceType}/${name}`,
      `--for=${condition}`,
      `--timeout=${timeout}s`,
    ];

    if (this.options.namespace) {
      args.push('-n', this.options.namespace);
    }

    await this.exec(args);
    this.logger.info(`Resource ${resourceType}/${name} reached condition: ${condition}`);
  }

  /**
   * Wait for deployment to be ready
   */
  async waitForDeployment(name: string, namespace?: string, timeout = 300): Promise<void> {
    await retry(
      async () => {
        const deployment = await this.getDeployment(name, namespace);

        if (deployment.replicas.ready === deployment.replicas.desired) {
          this.logger.success(
            `Deployment ${name} is ready (${deployment.replicas.ready}/${deployment.replicas.desired})`
          );
          return;
        }

        throw new Error(
          `Deployment ${name} not ready: ${deployment.replicas.ready}/${deployment.replicas.desired}`
        );
      },
      {
        maxAttempts: Math.floor(timeout / 5),
        delay: 5000,
        backoff: 1,
      }
    );
  }

  /**
   * Wait for all pods in namespace to be ready
   */
  async waitForPodsReady(namespace?: string, timeout = 300): Promise<void> {
    await retry(
      async () => {
        const pods = await this.getPods(namespace);
        const notReady = pods.filter((p) => !p.ready);

        if (notReady.length === 0) {
          this.logger.success(`All pods are ready in namespace ${namespace || 'default'}`);
          return;
        }

        const notReadyNames = notReady.map((p) => p.name).join(', ');
        throw new Error(`Pods not ready: ${notReadyNames}`);
      },
      {
        maxAttempts: Math.floor(timeout / 5),
        delay: 5000,
        backoff: 1,
      }
    );
  }

  /**
   * Get pod logs
   */
  async getLogs(
    podName: string,
    namespace?: string,
    options: { container?: string; tail?: number; follow?: boolean } = {}
  ): Promise<string> {
    const args = ['logs', podName];

    if (namespace) {
      args.push('-n', namespace);
    }

    if (options.container) {
      args.push('-c', options.container);
    }

    if (options.tail) {
      args.push(`--tail=${options.tail}`);
    }

    if (options.follow) {
      args.push('-f');
    }

    const result = await this.exec(args);
    return result.stdout;
  }

  /**
   * Rollout restart deployment
   */
  async restartDeployment(name: string, namespace?: string): Promise<void> {
    const args = ['rollout', 'restart', 'deployment', name];
    if (namespace) {
      args.push('-n', namespace);
    }

    await this.exec(args);
    this.logger.info(`Restarted deployment: ${name}`);
  }

  /**
   * Rollout status
   */
  async rolloutStatus(name: string, namespace?: string): Promise<string> {
    const args = ['rollout', 'status', 'deployment', name];
    if (namespace) {
      args.push('-n', namespace);
    }

    const result = await this.exec(args);
    return result.stdout;
  }

  /**
   * Scale deployment
   */
  async scale(name: string, replicas: number, namespace?: string): Promise<void> {
    const args = ['scale', 'deployment', name, `--replicas=${replicas}`];
    if (namespace) {
      args.push('-n', namespace);
    }

    await this.exec(args);
    this.logger.info(`Scaled deployment ${name} to ${replicas} replicas`);
  }

  /**
   * Execute kubectl command
   */
  private async exec(args: string[], options: { logErrors?: boolean } = {}): Promise<ExecResult> {
    const kubectlArgs = [...this.buildGlobalArgs(), ...args];

    if (this.options.verbose) {
      this.logger.debug(`Executing: kubectl ${kubectlArgs.join(' ')}`);
    }

    const result = await this.shell.exec('kubectl', kubectlArgs, {
      throwOnError: true,
      logErrors: options.logErrors,
    });

    return result;
  }

  /**
   * Build global kubectl arguments (context, kubeconfig, etc.)
   */
  private buildGlobalArgs(): string[] {
    const args: string[] = [];

    if (this.options.context) {
      args.push('--context', this.options.context);
    }

    if (this.options.kubeconfig) {
      args.push('--kubeconfig', this.options.kubeconfig);
    }

    if (this.options.namespace) {
      args.push('-n', this.options.namespace);
    }

    return args;
  }

  /**
   * Parse pod from kubectl JSON output
   */
  private parsePod(data: any): Pod {
    const status: PodStatus = data.status?.phase || 'Unknown';
    const containerStatuses = data.status?.containerStatuses || [];

    // A pod is considered "ready" if:
    // 1. All containers are ready (for running pods), OR
    // 2. The pod has Succeeded (completed jobs like bootstrap)
    const isSucceeded = status === 'Succeeded';
    const allContainersReady = containerStatuses.every((c: any) => c.ready);
    const ready = isSucceeded || allContainersReady;

    const restarts = containerStatuses.reduce(
      (sum: number, c: any) => sum + (c.restartCount || 0),
      0
    );

    return {
      name: data.metadata.name,
      namespace: data.metadata.namespace,
      status,
      ready,
      restarts,
      age: this.calculateAge(data.metadata.creationTimestamp),
      containers: containerStatuses.map((c: any) => ({
        name: c.name,
        image: c.image,
        ready: c.ready,
        restartCount: c.restartCount || 0,
      })),
    };
  }

  /**
   * Parse deployment from kubectl JSON output
   */
  private parseDeployment(data: any): Deployment {
    const spec = data.spec || {};
    const status = data.status || {};

    return {
      name: data.metadata.name,
      namespace: data.metadata.namespace,
      replicas: {
        desired: spec.replicas || 0,
        current: status.replicas || 0,
        ready: status.readyReplicas || 0,
        available: status.availableReplicas || 0,
      },
      conditions: status.conditions || [],
    };
  }

  /**
   * Parse service from kubectl JSON output
   */
  private parseService(data: any): Service {
    const spec = data.spec || {};

    return {
      name: data.metadata.name,
      namespace: data.metadata.namespace,
      type: spec.type || 'ClusterIP',
      clusterIP: spec.clusterIP,
      ports: spec.ports || [],
      selector: spec.selector || {},
    };
  }

  /**
   * Calculate age from timestamp
   */
  private calculateAge(timestamp: string): string {
    const created = new Date(timestamp);
    const now = new Date();
    const ageMs = now.getTime() - created.getTime();

    const seconds = Math.floor(ageMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  async restartAKS(deployedService: string = ''): Promise<void> {
    const args = ['rollout', 'restart'];

    if (deployedService) {
      args.push('-f', `deployment.apps/${deployedService}`);
    }
    else {
      args.push('deployment');
    }
    
    if (this.options.namespace) {
      args.push('-n', 'srvthreds');
    }

    try {
      await this.exec(args);
      this.logger.info(`Executed with args: ${args.join(' ')}`);
    } catch (error) {
      // Check if this is a Job immutability error
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Not a Job immutability error, re-throw
      throw errorMessage;
    }
  }
}
