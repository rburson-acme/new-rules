/**
 * Abstract base class for all deployers
 */

import {
  Environment,
  DeploymentTarget,
  DeployerOptions,
  DeploymentResult,
  ValidationResult
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { DeploymentState } from '../state/index.js';
import { DeploymentError } from '../utils/errors.js';

/**
 * Abstract base class defining the deployment contract
 */
export abstract class BaseDeployer {
  protected logger: Logger;
  protected state: DeploymentState;
  protected startTime?: number;

  constructor(
    protected environment: Environment,
    protected target: DeploymentTarget,
    protected options: DeployerOptions = {}
  ) {
    this.logger = new Logger(`${this.constructor.name}`);
    this.state = new DeploymentState(environment, target);

    if (options.verbose) {
      Logger.setLevel(0); // DEBUG level
    }
  }

  /**
   * Main deployment workflow
   * This orchestrates the entire deployment process
   */
  async deploy(): Promise<DeploymentResult> {
    this.startTime = Date.now();

    try {
      this.logger.section(`DEPLOYING TO ${this.target.toUpperCase()} (${this.environment})`);

      this.state.start();

      if (this.options.dryRun) {
        this.logger.info('🔍 DRY RUN MODE - No changes will be applied');
      }

      // Execute deployment steps
      await this.preDeployChecks();
      await this.buildImages();
      await this.pushImages();
      await this.applyManifests();
      await this.waitForReadiness();

      if (!this.options.skipValidation) {
        await this.runValidation();
      }

      this.state.markComplete();
      const duration = Date.now() - this.startTime;

      this.logger.success(`Deployment completed in ${(duration / 1000).toFixed(2)}s`);

      return {
        success: true,
        state: this.state.getSnapshot(),
        duration
      };
    } catch (error: any) {
      this.state.markFailed(error);

      this.logger.error('Deployment failed', error);

      await this.handleDeploymentFailure(error);

      return {
        success: false,
        state: this.state.getSnapshot(),
        duration: Date.now() - this.startTime!,
        errors: [error]
      };
    }
  }

  /**
   * Rollback to previous deployment
   */
  async rollback(): Promise<void> {
    this.logger.section('ROLLING BACK DEPLOYMENT');

    this.state.markRollingBack();

    try {
      const previousState = await this.state.getPreviousRevision();

      if (!previousState) {
        throw new DeploymentError('No previous deployment found to rollback to');
      }

      this.logger.info(`Rolling back to revision ${previousState.revision}`);

      // Apply previous manifest
      if (previousState.manifestPath) {
        await this.applyManifests(previousState.manifestPath);
      }

      await this.waitForReadiness();

      this.state.markRolledBack();

      this.logger.success('Rollback completed successfully');
    } catch (error: any) {
      this.logger.error('Rollback failed', error);
      throw error;
    }
  }

  /**
   * Clean up deployment resources
   */
  async cleanup(): Promise<void> {
    this.logger.section('CLEANING UP DEPLOYMENT');

    try {
      await this.performCleanup();
      this.logger.success('Cleanup completed');
    } catch (error: any) {
      this.logger.error('Cleanup failed', error);
      throw error;
    }
  }

  // ========================================================================
  // Abstract methods that subclasses must implement
  // ========================================================================

  /**
   * Perform pre-deployment validation and setup
   */
  protected abstract preDeployChecks(): Promise<void>;

  /**
   * Build container images
   */
  protected abstract buildImages(): Promise<void>;

  /**
   * Push images to registry
   */
  protected abstract pushImages(): Promise<void>;

  /**
   * Apply Kubernetes manifests
   */
  protected abstract applyManifests(manifestPath?: string): Promise<void>;

  /**
   * Wait for deployment to be ready
   */
  protected abstract waitForReadiness(): Promise<void>;

  /**
   * Run post-deployment validation
   */
  protected abstract runValidation(): Promise<ValidationResult>;

  /**
   * Perform cleanup operations
   */
  protected abstract performCleanup(): Promise<void>;

  // ========================================================================
  // Optional hook methods that subclasses can override
  // ========================================================================

  /**
   * Handle deployment failure
   * Can be overridden to implement custom failure handling
   */
  protected async handleDeploymentFailure(error: Error): Promise<void> {
    this.logger.error('Handling deployment failure', error);

    if (this.options.autoRollback) {
      this.logger.info('Auto-rollback enabled, attempting rollback...');

      try {
        await this.rollback();
      } catch (rollbackError: any) {
        this.logger.error('Auto-rollback failed', rollbackError);
        throw rollbackError;
      }
    }
  }

  /**
   * Get environment name
   */
  protected getEnvironment(): Environment {
    return this.environment;
  }

  /**
   * Get deployment target
   */
  protected getTarget(): DeploymentTarget {
    return this.target;
  }

  /**
   * Check if running in dry-run mode
   */
  protected isDryRun(): boolean {
    return this.options.dryRun || false;
  }
}
