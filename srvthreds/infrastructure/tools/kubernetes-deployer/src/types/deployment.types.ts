/**
 * Core deployment types and interfaces
 */

/**
 * Supported deployment environments
 */
export type Environment = 'minikube' | 'azure-dev' | 'azure-test' | 'azure-prod';

/**
 * Supported deployment targets
 */
export type DeploymentTarget = 'minikube' | 'aks';

/**
 * Deployment status
 */
export type DeploymentStatus = 'pending' | 'deploying' | 'deployed' | 'failed' | 'rolling-back' | 'rolled-back';

/**
 * Validation severity
 */
export type ValidationSeverity = 'info' | 'warning' | 'error';

/**
 * Configuration for creating a deployer
 */
export interface DeployerConfig {
  target: DeploymentTarget;
  environment?: Environment;
  options?: DeployerOptions;
}

/**
 * Options for configuring deployer behavior
 */
export interface DeployerOptions {
  dryRun?: boolean;
  autoRollback?: boolean;
  timeout?: number;
  verbose?: boolean;
  skipValidation?: boolean;
  imageTag?: string;
}

/**
 * Result of a deployment operation
 */
export interface DeploymentResult {
  success: boolean;
  state: DeploymentStateData;
  duration?: number;
  errors?: Error[];
}

/**
 * Snapshot of deployment state
 */
export interface DeploymentStateData {
  environment: Environment;
  target: DeploymentTarget;
  revision: string;
  status: DeploymentStatus;
  timestamp: Date;
  imageTag?: string;
  manifestPath?: string;
  deployedResources?: DeployedResource[];
  metadata?: Record<string, any>; // Additional deployment metadata (e.g., ACR login server, image names)
}

/**
 * A deployed Kubernetes resource
 */
export interface DeployedResource {
  kind: string;
  name: string;
  namespace: string;
  status: string;
}

/**
 * Result of validation checks
 */
export interface ValidationResult {
  healthy: boolean;
  issues: ValidationIssue[];
  timestamp: Date;
}

/**
 * A validation issue found during health checks
 */
export interface ValidationIssue {
  severity: ValidationSeverity;
  message: string;
  resource?: string;
  suggestion?: string;
}

/**
 * Azure-specific configuration
 */
export interface AzureConfig {
  subscriptionId: string;
  tenantId: string;
  resourceGroup: string;
  clusterName: string;
  acrName: string;
  location: string;
}

/**
 * Options for building images
 */
export interface BuildOptions {
  services: string[];
  tag: string;
  platforms?: string[];
  noCache?: boolean;
  buildArgs?: Record<string, string>;
}

/**
 * Options for pushing images
 */
export interface PushOptions {
  registry: string;
  tag: string;
  services: string[];
}

/**
 * Options for applying manifests
 */
export interface ApplyOptions {
  kustomize?: boolean;
  namespace?: string;
  dryRun?: boolean;
  serverSide?: boolean;
}

/**
 * Options for waiting for rollout
 */
export interface WaitForRolloutOptions {
  timeout?: number;
  checkInterval?: number;
}
