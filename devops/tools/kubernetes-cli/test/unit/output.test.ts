/**
 * Unit tests for output.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DeploymentResult } from '../../../kubernetes-deployer/src/types/index.js';
import type { ProjectConfig } from '../../config/project-loader.js';

// Mock the logger
vi.mock('../../../shared/logger.js', () => ({
  logger: {
    info: vi.fn(),
    success: vi.fn(),
    failure: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    section: vi.fn(),
  },
}));

describe('output utilities', () => {
  const mockProjectConfig: ProjectConfig = {
    name: 'test-project',
    description: 'A test project',
    source: {
      path: '/path/to/project',
    },
    docker: {
      composePath: '/path/to/compose',
      dockerfilePath: '/path/to/dockerfiles',
      assetsPath: '/path/to/assets',
      builderImage: 'test/builder',
      services: [{ name: 'api', image: 'test/api' }],
    },
    deployments: {
      configPath: '/path/to/config',
    },
    terraform: {
      stacksPath: '/path/to/terraform/stacks',
      configPath: '/path/to/terraform/config',
    },
    kubernetes: {
      namespace: 'test-ns',
      deployments: ['test-api', 'test-worker'],
    },
    minikube: {
      manifestPath: '/path/to/minikube',
    },
    aks: {
      manifestPath: '/path/to/aks',
      environments: ['dev', 'test', 'prod'],
    },
    azure: {
      prefix: 'CAZ',
      appCode: 'TESTPROJ',
      regionCode: 'E',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatDeploymentResult', () => {
    it('should format successful deployment result', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: true,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'deployed',
          timestamp: new Date(),
          imageTag: 'v1.0.0',
          deployedResources: [{ kind: 'Deployment', name: 'test-api', namespace: 'test-ns', status: 'deployed' }],
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 5000);

      expect(logger.success).toHaveBeenCalledWith('DEPLOYMENT SUCCESSFUL');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test-project'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('minikube'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('5.00s'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('v1.0.0'));
    });

    it('should format failed deployment result', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: false,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'failed',
          timestamp: new Date(),
        },
        errors: [new Error('Connection timeout'), new Error('Pod crashed')],
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 3000);

      expect(logger.failure).toHaveBeenCalledWith('DEPLOYMENT FAILED');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('failed'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Connection timeout'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Pod crashed'));
    });

    it('should show deployed resources when present', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: true,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'deployed',
          timestamp: new Date(),
          deployedResources: [
            { kind: 'Deployment', name: 'api', namespace: 'test-ns', status: 'deployed' },
            { kind: 'Service', name: 'api-svc', namespace: 'test-ns', status: 'deployed' },
          ],
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 5000);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('2 deployed'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Deployment/api'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Service/api-svc'));
    });

    it('should show minikube-specific next steps', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: true,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'deployed',
          timestamp: new Date(),
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 5000);

      expect(logger.info).toHaveBeenCalledWith('Next Steps:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('minikube dashboard'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('port-forward'));
    });

    it('should show AKS-specific next steps', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: true,
        state: {
          environment: 'azure-dev',
          target: 'aks',
          revision: '1',
          status: 'deployed',
          timestamp: new Date(),
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'aks-dev', 5000);

      expect(logger.info).toHaveBeenCalledWith('Next Steps:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('kubectl get pods'));
      // Should NOT contain minikube-specific commands
      const calls = vi.mocked(logger.info).mock.calls.flat();
      expect(calls.some((c) => String(c).includes('minikube dashboard'))).toBe(false);
    });

    it('should show minikube troubleshooting tips on failure', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: false,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'failed',
          timestamp: new Date(),
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 3000);

      expect(logger.info).toHaveBeenCalledWith('Troubleshooting:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('minikube status'));
    });

    it('should show AKS troubleshooting tips on failure', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: false,
        state: {
          environment: 'azure-dev',
          target: 'aks',
          revision: '1',
          status: 'failed',
          timestamp: new Date(),
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'aks-dev', 3000);

      expect(logger.info).toHaveBeenCalledWith('Troubleshooting:');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('az account show'));
    });

    it('should use default image tag when not provided', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatDeploymentResult } = await import('../../utils/output.js');

      const result: DeploymentResult = {
        success: true,
        state: {
          environment: 'minikube',
          target: 'minikube',
          revision: '1',
          status: 'deployed',
          timestamp: new Date(),
          // No imageTag
        },
      };

      formatDeploymentResult(result, mockProjectConfig, 'minikube', 5000);

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('latest'));
    });
  });

  describe('formatKeyValueTable', () => {
    it('should format key-value pairs with aligned columns', async () => {
      const { logger } = await import('../../../shared/logger.js');
      const { formatKeyValueTable } = await import('../../utils/output.js');

      formatKeyValueTable({
        name: 'test',
        version: '1.0.0',
        enabled: true,
        count: 42,
      });

      expect(logger.info).toHaveBeenCalledTimes(4);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('name'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('test'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('version'));
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('1.0.0'));
    });
  });
});
