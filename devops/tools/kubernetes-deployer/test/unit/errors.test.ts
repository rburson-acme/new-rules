/**
 * Tests for Error classes
 */

import { describe, it, expect } from 'vitest';
import {
  DeploymentError,
  PreDeploymentCheckError,
  ImageBuildError,
  ImagePushError,
  ManifestApplicationError,
  ValidationError,
  RollbackError,
  KubernetesError,
  ResourceNotFoundError,
  NamespaceNotFoundError,
  AzureError,
  TimeoutError,
} from '../../src/utils/errors.js';

describe('Error Classes', () => {
  describe('DeploymentError', () => {
    it('should create error with message', () => {
      const error = new DeploymentError('test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DeploymentError);
      expect(error.message).toBe('test error');
      expect(error.name).toBe('DeploymentError');
    });

    it('should include context', () => {
      const context = { step: 'build', image: 'test' };
      const error = new DeploymentError('test error', context);

      expect(error.context).toEqual(context);
    });

    it('should include cause', () => {
      const cause = new Error('underlying error');
      const error = new DeploymentError('test error', {}, cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe('Specific Error Types', () => {
    it('should create PreDeploymentCheckError', () => {
      const error = new PreDeploymentCheckError('check failed');
      expect(error.name).toBe('PreDeploymentCheckError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create ImageBuildError', () => {
      const error = new ImageBuildError('build failed');
      expect(error.name).toBe('ImageBuildError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create ImagePushError', () => {
      const error = new ImagePushError('push failed');
      expect(error.name).toBe('ImagePushError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create ManifestApplicationError', () => {
      const error = new ManifestApplicationError('apply failed');
      expect(error.name).toBe('ManifestApplicationError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create ValidationError', () => {
      const error = new ValidationError('validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create RollbackError', () => {
      const error = new RollbackError('rollback failed');
      expect(error.name).toBe('RollbackError');
      expect(error).toBeInstanceOf(DeploymentError);
    });
  });

  describe('Kubernetes Errors', () => {
    it('should create KubernetesError', () => {
      const error = new KubernetesError('kubectl failed');
      expect(error.name).toBe('KubernetesError');
      expect(error).toBeInstanceOf(DeploymentError);
    });

    it('should create ResourceNotFoundError', () => {
      const error = new ResourceNotFoundError('pod not found');
      expect(error.name).toBe('ResourceNotFoundError');
      expect(error).toBeInstanceOf(KubernetesError);
    });

    it('should create NamespaceNotFoundError', () => {
      const error = new NamespaceNotFoundError('namespace not found');
      expect(error.name).toBe('NamespaceNotFoundError');
      expect(error).toBeInstanceOf(KubernetesError);
    });
  });

  describe('Azure Errors', () => {
    it('should create AzureError', () => {
      const error = new AzureError('azure operation failed');
      expect(error.name).toBe('AzureError');
      expect(error).toBeInstanceOf(DeploymentError);
    });
  });

  describe('TimeoutError', () => {
    it('should create TimeoutError with timeout value', () => {
      const error = new TimeoutError('operation timed out', 30000);
      expect(error.name).toBe('TimeoutError');
      expect(error.timeoutMs).toBe(30000);
      expect(error.context?.timeoutMs).toBe(30000);
      expect(error).toBeInstanceOf(DeploymentError);
    });
  });

  describe('Error Chaining', () => {
    it('should preserve error chain', () => {
      const rootCause = new Error('root cause');
      const intermediate = new KubernetesError('k8s error', {}, rootCause);
      const final = new DeploymentError('deployment failed', {}, intermediate);

      expect(final.cause).toBe(intermediate);
      expect(intermediate.cause).toBe(rootCause);
    });
  });
});
