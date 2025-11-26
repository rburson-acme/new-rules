/**
 * Deployment state management
 */

import {
  Environment,
  DeploymentTarget,
  DeploymentStatus,
  DeploymentStateData,
  DeployedResource
} from '../types/index.js';
import { ContextLogger as Logger } from '../../../shared/logger.js';

/**
 * Manages the state of a deployment
 */
export class DeploymentState {
  private data: DeploymentStateData;
  private logger: Logger;

  constructor(environment: Environment, target: DeploymentTarget = 'minikube') {
    this.data = {
      environment,
      target,
      revision: this.generateRevision(),
      status: 'pending',
      timestamp: new Date(),
      deployedResources: []
    };
    this.logger = new Logger('DeploymentState');
  }

  /**
   * Mark deployment as started
   */
  start(): void {
    this.data.status = 'deploying';
    this.data.timestamp = new Date();
  }

  /**
   * Mark deployment as complete
   */
  markComplete(): void {
    this.data.status = 'deployed';
  }

  /**
   * Mark deployment as failed
   */
  markFailed(error: Error): void {
    this.data.status = 'failed';
    this.logger.warn(`Deployment State potential false/positive issue: ${error.message}`);
  }

  /**
   * Mark deployment as rolling back
   */
  markRollingBack(): void {
    this.data.status = 'rolling-back';
  }

  /**
   * Mark rollback as complete
   */
  markRolledBack(): void {
    this.data.status = 'rolled-back';
  }

  /**
   * Set the image tag used in this deployment
   */
  setImageTag(tag: string): void {
    this.data.imageTag = tag;
  }

  /**
   * Get the image tag
   */
  getImageTag(): string | undefined {
    return this.data.imageTag;
  }

  /**
   * Set the manifest path used
   */
  setManifestPath(path: string): void {
    this.data.manifestPath = path;
  }

  /**
   * Get the manifest path
   */
  getManifestPath(): string | undefined {
    return this.data.manifestPath;
  }

  /**
   * Add a deployed resource
   */
  addDeployedResource(resource: DeployedResource): void {
    this.data.deployedResources?.push(resource);
  }

  /**
   * Get all deployed resources
   */
  getDeployedResources(): DeployedResource[] {
    return this.data.deployedResources || [];
  }

  /**
   * Add metadata key-value pair
   */
  addMetadata(key: string, value: any): void {
    if (!this.data.metadata) {
      this.data.metadata = {};
    }
    this.data.metadata[key] = value;
  }

  /**
   * Get metadata value by key
   */
  getMetadata(key: string): any {
    return this.data.metadata?.[key];
  }

  /**
   * Get all metadata
   */
  getAllMetadata(): Record<string, any> {
    return this.data.metadata || {};
  }

  /**
   * Get current status
   */
  getStatus(): DeploymentStatus {
    return this.data.status;
  }

  /**
   * Get revision number
   */
  getRevision(): string {
    return this.data.revision;
  }

  /**
   * Get snapshot of current state
   */
  getSnapshot(): DeploymentStateData {
    return { ...this.data };
  }

  /**
   * Get previous deployment state (placeholder for future implementation)
   */
  async getPreviousRevision(): Promise<DeploymentStateData | null> {
    // TODO: Implement state persistence and retrieval
    // This would read from a state store (file, database, etc.)
    return null;
  }

  /**
   * Generate a unique revision identifier
   */
  private generateRevision(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `rev-${timestamp}-${random}`;
  }
}
