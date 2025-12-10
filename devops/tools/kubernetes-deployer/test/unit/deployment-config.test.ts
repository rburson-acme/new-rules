/**
 * Tests for deployment configuration loading and resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadDeploymentConfigs,
  findDeployment,
  resolveDeployment,
  resolveMultiFileDeployment,
  type DeploymentConfig,
  type DeploymentConfigFile,
} from '../../src/config/deployment-config.js';
import type { ProjectConfig } from '../../../kubernetes-cli/config/project-loader.js';

// Mock fs module
vi.mock('fs');

describe('deployment-config', () => {
  const mockProjectConfig: ProjectConfig = {
    name: 'test-project',
    description: 'Test project',
    source: { path: '/source' },
    docker: {
      composePath: '/compose',
      dockerfilePath: '/dockerfiles',
      assetsPath: '/assets',
      builderImage: 'builder:latest',
      services: [],
    },
    deployments: { configPath: '/deployments' },
    terraform: { stacksPath: '/terraform/stacks', configPath: '/terraform' },
    kubernetes: { namespace: 'test-ns', deployments: [] },
    minikube: { manifestPath: '/minikube' },
    aks: { manifestPath: '/aks', environments: ['dev', 'test', 'prod'] },
    azure: { prefix: 'TST', appCode: 'TEST', regionCode: 'E' },
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadDeploymentConfigs', () => {
    it('should preserve deployment order within each file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['services.json'] as unknown as string[]);

      const fileContent: DeploymentConfigFile = {
        deployments: [
          { name: 'First', shortName: 'first', description: '', environments: [], target: { deployCommand: 'up' } },
          { name: 'Second', shortName: 'second', description: '', environments: [], target: { deployCommand: 'up' } },
          { name: 'Third', shortName: 'third', description: '', environments: [], target: { deployCommand: 'up' } },
        ],
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fileContent));

      const deployments = loadDeploymentConfigs(mockProjectConfig);

      // Order within file must be preserved
      expect(deployments).toHaveLength(3);
      expect(deployments[0].shortName).toBe('first');
      expect(deployments[1].shortName).toBe('second');
      expect(deployments[2].shortName).toBe('third');
    });
  });

  describe('findDeployment', () => {
    it('should find deployment by shortName', () => {
      const deployments: DeploymentConfig[] = [
        { name: 'Build', shortName: 'build', description: '', environments: [], target: { deployCommand: 'build' } },
        { name: 'Services', shortName: 'svc', description: '', environments: [], target: { deployCommand: 'up' } },
      ];

      const found = findDeployment(deployments, 'svc');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Services');
    });

    it('should return undefined for non-existent shortName', () => {
      const deployments: DeploymentConfig[] = [
        { name: 'Build', shortName: 'build', description: '', environments: [], target: { deployCommand: 'build' } },
      ];

      const found = findDeployment(deployments, 'nonexistent');
      expect(found).toBeUndefined();
    });
  });

  describe('resolveMultiFileDeployment', () => {
    it('should preserve composeFiles array order - CRITICAL for orchestration', () => {
      const deployment: DeploymentConfig = {
        name: 'Start All',
        shortName: 's_a_dbs_s',
        description: 'Start databases then services',
        environments: ['minikube'],
        target: {
          deployCommand: 'up',
          composeFiles: [
            {
              composeFile: 'docker-compose-db.yml',
              defaultArgs: '-d --wait',
              postUpCommands: [{ description: 'Init DB', command: 'init-db.sh' }],
            },
            {
              composeFile: 'docker-compose-services.yml',
              defaultArgs: '-d --wait',
              preBuildCommands: [{ description: 'Build', command: 'build.sh' }],
            },
          ],
        },
      };

      const resolved = resolveMultiFileDeployment(deployment, 'minikube', mockProjectConfig);

      // Order MUST be preserved - databases first, then services
      expect(resolved).toHaveLength(2);
      expect(resolved[0].composeFile).toBe('docker-compose-db.yml');
      expect(resolved[0].postUpCommands).toHaveLength(1);
      expect(resolved[0].postUpCommands[0].description).toBe('Init DB');

      expect(resolved[1].composeFile).toBe('docker-compose-services.yml');
      expect(resolved[1].preBuildCommands).toHaveLength(1);
      expect(resolved[1].preBuildCommands[0].description).toBe('Build');
    });

    it('should handle single composeFile (non-array) deployment', () => {
      const deployment: DeploymentConfig = {
        name: 'Single File',
        shortName: 'single',
        description: 'Single file deployment',
        environments: ['minikube'],
        target: {
          deployCommand: 'up',
          composeFile: 'docker-compose.yml',
          defaultArgs: '-d',
        },
      };

      const resolved = resolveMultiFileDeployment(deployment, 'minikube', mockProjectConfig);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].composeFile).toBe('docker-compose.yml');
    });

    it('should apply environment-specific overrides per compose file', () => {
      const deployment: DeploymentConfig = {
        name: 'With Overrides',
        shortName: 'overrides',
        description: 'Test overrides',
        environments: ['minikube', 'development'],
        target: {
          deployCommand: 'up',
          composeFiles: [
            {
              composeFile: 'docker-compose.yml',
              preBuildCommands: [{ description: 'Default Build', command: 'default-build.sh' }],
              environmentOverrides: {
                minikube: {
                  preBuildCommands: [{ description: 'Minikube Build', command: 'minikube-build.sh' }],
                },
              },
            },
          ],
        },
      };

      // Test minikube environment gets override
      const minikubeResolved = resolveMultiFileDeployment(deployment, 'minikube', mockProjectConfig);
      expect(minikubeResolved[0].preBuildCommands[0].description).toBe('Minikube Build');

      // Test development environment gets default
      const devResolved = resolveMultiFileDeployment(deployment, 'development', mockProjectConfig);
      expect(devResolved[0].preBuildCommands[0].description).toBe('Default Build');
    });
  });

  describe('resolveDeployment', () => {
    it('should resolve single file deployment with environment overrides', () => {
      const deployment: DeploymentConfig = {
        name: 'Test',
        shortName: 'test',
        description: 'Test deployment',
        environments: ['minikube'],
        target: {
          deployCommand: 'up',
          composeFile: 'docker-compose.yml',
          defaultArgs: '-d',
          preBuildCommands: [{ description: 'Default', command: 'default.sh' }],
          environmentOverrides: {
            minikube: {
              preBuildCommands: [{ description: 'Minikube', command: 'minikube.sh' }],
            },
          },
        },
      };

      const resolved = resolveDeployment(deployment, 'minikube', mockProjectConfig);

      expect(resolved.composeFile).toBe('docker-compose.yml');
      expect(resolved.composeFilePath).toBe('/compose/docker-compose.yml');
      expect(resolved.preBuildCommands[0].description).toBe('Minikube');
    });
  });
});
