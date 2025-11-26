/**
 * Integration tests for KubernetesClient
 * These tests use mocked kubectl commands
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KubernetesClient } from '../../src/operations/KubernetesClient.js';
import { ResourceNotFoundError, NamespaceNotFoundError } from '../../src/utils/errors.js';

// Mock the ShellExecutor
vi.mock('../../src/utils/shell.js', () => ({
  ShellExecutor: vi.fn().mockImplementation(() => ({
    exec: vi.fn(),
    execSync: vi.fn(),
    commandExists: vi.fn().mockResolvedValue(true),
    getVersion: vi.fn().mockResolvedValue('v1.28.0'),
  })),
}));

describe('KubernetesClient Integration Tests', () => {
  let client: KubernetesClient;
  let mockShell: any;

  beforeEach(async () => {
    // const { ShellExecutor } = await import('../../src/utils/shell.js');
    client = new KubernetesClient({ verbose: false });
    mockShell = (client as any).shell;
  });

  describe('verify', () => {
    it('should verify kubectl is available', async () => {
      await expect(client.verify()).resolves.not.toThrow();
      expect(mockShell.commandExists).toHaveBeenCalledWith('kubectl');
    });

    it('should throw if kubectl not found', async () => {
      mockShell.commandExists.mockResolvedValueOnce(false);

      await expect(client.verify()).rejects.toThrow('kubectl command not found');
    });
  });

  describe('context management', () => {
    it('should get current context', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'minikube\n',
        stderr: '',
        exitCode: 0,
      });

      const context = await client.getCurrentContext();

      expect(context).toBe('minikube');
      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['config', 'current-context'],
        expect.any(Object)
      );
    });

    it('should set context', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'Switched to context "test-context"\n',
        stderr: '',
        exitCode: 0,
      });

      await client.setContext('test-context');

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['config', 'use-context', 'test-context'],
        expect.any(Object)
      );
    });
  });

  describe('namespace operations', () => {
    it('should get namespace', async () => {
      const namespaceJSON = {
        metadata: { name: 'test-ns', labels: { env: 'test' } },
        status: { phase: 'Active' },
      };

      mockShell.exec.mockResolvedValueOnce({
        stdout: JSON.stringify(namespaceJSON),
        stderr: '',
        exitCode: 0,
      });

      const namespace = await client.getNamespace('test-ns');

      expect(namespace.name).toBe('test-ns');
      expect(namespace.status).toBe('Active');
      expect(namespace.labels?.env).toBe('test');
    });

    it('should throw NamespaceNotFoundError if namespace does not exist', async () => {
      mockShell.exec.mockRejectedValueOnce(new Error('namespace not found'));

      await expect(client.getNamespace('missing-ns')).rejects.toThrow(NamespaceNotFoundError);
    });

    it('should create namespace', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'namespace/test-ns created',
        stderr: '',
        exitCode: 0,
      });

      await client.createNamespace('test-ns');

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['create', 'namespace', 'test-ns'],
        expect.any(Object)
      );
    });

    it('should ensure namespace exists', async () => {
      // First call checks if namespace exists (fails)
      mockShell.exec.mockRejectedValueOnce(new Error('not found'));
      // Second call creates namespace
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'namespace/test-ns created',
        stderr: '',
        exitCode: 0,
      });

      await client.ensureNamespace('test-ns');

      expect(mockShell.exec).toHaveBeenCalledTimes(2);
    });
  });

  describe('pod operations', () => {
    it('should get pods', async () => {
      const podsJSON = {
        items: [
          {
            metadata: { name: 'pod-1', namespace: 'default', creationTimestamp: '2024-01-01T00:00:00Z' },
            status: {
              phase: 'Running',
              containerStatuses: [
                { name: 'app', image: 'app:v1', ready: true, restartCount: 0 },
              ],
            },
          },
        ],
      };

      mockShell.exec.mockResolvedValueOnce({
        stdout: JSON.stringify(podsJSON),
        stderr: '',
        exitCode: 0,
      });

      const pods = await client.getPods('default');

      expect(pods).toHaveLength(1);
      expect(pods[0]?.name).toBe('pod-1');
      expect(pods[0]?.status).toBe('Running');
      expect(pods[0]?.ready).toBe(true);
    });

    it('should get pod by name', async () => {
      const podJSON = {
        metadata: { name: 'pod-1', namespace: 'default', creationTimestamp: '2024-01-01T00:00:00Z' },
        status: {
          phase: 'Running',
          containerStatuses: [
            { name: 'app', image: 'app:v1', ready: true, restartCount: 0 },
          ],
        },
      };

      mockShell.exec.mockResolvedValueOnce({
        stdout: JSON.stringify(podJSON),
        stderr: '',
        exitCode: 0,
      });

      const pod = await client.getPod('pod-1', 'default');

      expect(pod.name).toBe('pod-1');
      expect(pod.status).toBe('Running');
    });

    it('should throw ResourceNotFoundError if pod not found', async () => {
      mockShell.exec.mockRejectedValueOnce(new Error('pod not found'));

      await expect(client.getPod('missing-pod', 'default')).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe('deployment operations', () => {
    it('should get deployments', async () => {
      const deploymentsJSON = {
        items: [
          {
            metadata: { name: 'app', namespace: 'default' },
            spec: { replicas: 3 },
            status: {
              replicas: 3,
              readyReplicas: 3,
              availableReplicas: 3,
              conditions: [],
            },
          },
        ],
      };

      mockShell.exec.mockResolvedValueOnce({
        stdout: JSON.stringify(deploymentsJSON),
        stderr: '',
        exitCode: 0,
      });

      const deployments = await client.getDeployments('default');

      expect(deployments).toHaveLength(1);
      expect(deployments[0]?.name).toBe('app');
      expect(deployments[0]?.replicas.desired).toBe(3);
      expect(deployments[0]?.replicas.ready).toBe(3);
    });
  });

  describe('apply operations', () => {
    it('should apply manifests', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'deployment.apps/app configured',
        stderr: '',
        exitCode: 0,
      });

      await client.apply('/path/to/manifest.yaml', { namespace: 'default' });

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['apply', '-f', '/path/to/manifest.yaml', '-n', 'default'],
        expect.any(Object)
      );
    });

    it('should support dry-run', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'deployment.apps/app configured (dry run)',
        stderr: '',
        exitCode: 0,
      });

      await client.apply('/path/to/manifest.yaml', { dryRun: true });

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        expect.arrayContaining(['--dry-run=client']),
        expect.any(Object)
      );
    });
  });

  describe('delete operations', () => {
    it('should delete resource', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'deployment.apps "app" deleted',
        stderr: '',
        exitCode: 0,
      });

      await client.delete('deployment', 'app', { namespace: 'default' });

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['delete', 'deployment', 'app', '-n', 'default'],
        expect.any(Object)
      );
    });

    it('should support force delete', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'deployment.apps "app" deleted',
        stderr: '',
        exitCode: 0,
      });

      await client.delete('deployment', 'app', { force: true, gracePeriod: 0 });

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        expect.arrayContaining(['--force', '--grace-period=0']),
        expect.any(Object)
      );
    });
  });

  describe('scale operations', () => {
    it('should scale deployment', async () => {
      mockShell.exec.mockResolvedValueOnce({
        stdout: 'deployment.apps/app scaled',
        stderr: '',
        exitCode: 0,
      });

      await client.scale('app', 5, 'default');

      expect(mockShell.exec).toHaveBeenCalledWith(
        'kubectl',
        ['scale', 'deployment', 'app', '--replicas=5', '-n', 'default'],
        expect.any(Object)
      );
    });
  });
});
