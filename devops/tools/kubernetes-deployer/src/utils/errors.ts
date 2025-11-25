/**
 * Custom error classes for deployment operations
 */

/**
 * Base error for all deployment-related errors
 */
export class DeploymentError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'DeploymentError';
    Object.setPrototypeOf(this, DeploymentError.prototype);
  }
}

/**
 * Error thrown when pre-deployment checks fail
 */
export class PreDeploymentCheckError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'PreDeploymentCheckError';
    Object.setPrototypeOf(this, PreDeploymentCheckError.prototype);
  }
}

/**
 * Error thrown when image building fails
 */
export class ImageBuildError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'ImageBuildError';
    Object.setPrototypeOf(this, ImageBuildError.prototype);
  }
}

/**
 * Error thrown when image push fails
 */
export class ImagePushError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'ImagePushError';
    Object.setPrototypeOf(this, ImagePushError.prototype);
  }
}

/**
 * Error thrown when manifest application fails
 */
export class ManifestApplicationError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'ManifestApplicationError';
    Object.setPrototypeOf(this, ManifestApplicationError.prototype);
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when rollback fails
 */
export class RollbackError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'RollbackError';
    Object.setPrototypeOf(this, RollbackError.prototype);
  }
}

/**
 * Error thrown when Kubernetes operations fail
 */
export class KubernetesError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'KubernetesError';
    Object.setPrototypeOf(this, KubernetesError.prototype);
  }
}

/**
 * Error thrown when Azure operations fail
 */
export class AzureError extends DeploymentError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'AzureError';
    Object.setPrototypeOf(this, AzureError.prototype);
  }
}

/**
 * Error thrown when timeout occurs
 */
export class TimeoutError extends DeploymentError {
  constructor(message: string, public readonly timeoutMs: number, context?: Record<string, any>) {
    super(message, { ...context, timeoutMs });
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown when a Kubernetes resource is not found
 */
export class ResourceNotFoundError extends KubernetesError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'ResourceNotFoundError';
    Object.setPrototypeOf(this, ResourceNotFoundError.prototype);
  }
}

/**
 * Error thrown when a namespace is not found
 */
export class NamespaceNotFoundError extends KubernetesError {
  constructor(message: string, context?: Record<string, any>, cause?: Error) {
    super(message, context, cause);
    this.name = 'NamespaceNotFoundError';
    Object.setPrototypeOf(this, NamespaceNotFoundError.prototype);
  }
}
