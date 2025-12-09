/**
 * Unit tests for project-loader.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs');

// Mock js-yaml
vi.mock('js-yaml', () => ({
  load: vi.fn(),
}));

const mockFs = vi.mocked(fs);

describe('project-loader', () => {
  const validProjectYaml = {
    name: 'test-project',
    description: 'A test project',
    source: {
      path: '../test-project',
      composePath: 'docker/compose',
      configPath: 'configs/deployments',
    },
    docker: {
      builderImage: 'test/builder',
      services: [
        { name: 'api', image: 'test/api' },
        { name: 'worker', image: 'test/worker' },
      ],
    },
    kubernetes: {
      namespace: 'test-ns',
      deployments: ['test-api', 'test-worker'],
    },
    minikube: {
      manifestPath: 'minikube/test/manifests/minikube/',
    },
    aks: {
      manifestPath: 'kubernetes/test/',
      environments: ['dev', 'test', 'prod'],
    },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadProjectConfig', () => {
    it('should load and parse a valid project config', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue(validProjectYaml);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');
      const config = loadProjectConfig('test-project');

      expect(config.name).toBe('test-project');
      expect(config.description).toBe('A test project');
      expect(config.docker.builderImage).toBe('test/builder');
      expect(config.docker.services).toHaveLength(2);
      expect(config.kubernetes.namespace).toBe('test-ns');
      expect(config.kubernetes.deployments).toEqual(['test-api', 'test-worker']);
      expect(config.aks.environments).toEqual(['dev', 'test', 'prod']);
    });

    it('should throw error when project does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      const { loadProjectConfig } = await import('../../config/project-loader.js');

      expect(() => loadProjectConfig('nonexistent')).toThrow("Project 'nonexistent' not found");
    });

    it('should use default project when no name provided', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        ...validProjectYaml,
        name: 'srvthreds',
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');
      const config = loadProjectConfig();

      expect(config.name).toBe('srvthreds');
    });

    it('should resolve relative paths to absolute paths', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue(validProjectYaml);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');
      const config = loadProjectConfig('test-project');

      // Paths should be absolute (start with /)
      expect(config.source.path).toMatch(/^\//);
      expect(config.source.composePath).toMatch(/^\//);
      expect(config.source.configPath).toMatch(/^\//);
      expect(config.minikube.manifestPath).toMatch(/^\//);
      expect(config.aks.manifestPath).toMatch(/^\//);
    });

    it('should throw error when required fields are missing', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        name: 'incomplete',
        // Missing other required fields
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');

      expect(() => loadProjectConfig('incomplete')).toThrow("Invalid project config 'incomplete'");
    });

    it('should throw error when services array is empty', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        ...validProjectYaml,
        docker: {
          builderImage: 'test/builder',
          services: [], // Empty services
        },
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');

      expect(() => loadProjectConfig('test-project')).toThrow('docker.services must have at least one service');
    });

    it('should throw error when deployments array is empty', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        ...validProjectYaml,
        kubernetes: {
          namespace: 'test-ns',
          deployments: [], // Empty deployments
        },
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');

      expect(() => loadProjectConfig('test-project')).toThrow(
        'kubernetes.deployments must have at least one deployment',
      );
    });

    it('should throw error when environments array is empty', async () => {
      const yaml = await import('js-yaml');
      vi.mocked(yaml.load).mockReturnValue({
        ...validProjectYaml,
        aks: {
          manifestPath: 'kubernetes/test/',
          environments: [], // Empty environments
        },
      });
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('yaml content');

      const { loadProjectConfig } = await import('../../config/project-loader.js');

      expect(() => loadProjectConfig('test-project')).toThrow('aks.environments must have at least one environment');
    });
  });

  describe('listProjects', () => {
    it('should return empty array when projects directory does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const { listProjects } = await import('../../config/project-loader.js');
      const projects = listProjects();

      expect(projects).toEqual([]);
    });

    it('should return list of valid project directories', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // Projects dir exists
        if (pathStr.endsWith('projects')) return true;
        // project.yaml exists for valid projects
        if (pathStr.includes('valid-project') && pathStr.endsWith('project.yaml')) return true;
        if (pathStr.includes('another-project') && pathStr.endsWith('project.yaml')) return true;
        // No project.yaml for invalid directory
        if (pathStr.includes('not-a-project') && pathStr.endsWith('project.yaml')) return false;
        return false;
      });

      mockFs.readdirSync.mockReturnValue([
        { name: 'valid-project', isDirectory: () => true },
        { name: 'another-project', isDirectory: () => true },
        { name: 'not-a-project', isDirectory: () => true },
        { name: 'some-file.txt', isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const { listProjects } = await import('../../config/project-loader.js');
      const projects = listProjects();

      expect(projects).toContain('valid-project');
      expect(projects).toContain('another-project');
      expect(projects).not.toContain('not-a-project');
      expect(projects).not.toContain('some-file.txt');
    });
  });

  describe('getDefaultProject', () => {
    it('should return srvthreds as default project', async () => {
      const { getDefaultProject } = await import('../../config/project-loader.js');
      expect(getDefaultProject()).toBe('srvthreds');
    });
  });

  describe('validateProjectPaths', () => {
    it('should return valid when all paths exist', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const { validateProjectPaths } = await import('../../config/project-loader.js');
      const result = validateProjectPaths({
        name: 'test',
        description: 'test',
        source: {
          path: '/some/path',
          composePath: '/some/compose',
          configPath: '/some/config',
        },
        docker: { builderImage: '', services: [] },
        kubernetes: { namespace: '', deployments: [] },
        minikube: { manifestPath: '' },
        aks: { manifestPath: '', environments: [] },
      });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing paths when they do not exist', async () => {
      mockFs.existsSync.mockImplementation((p) => {
        const pathStr = String(p);
        return !pathStr.includes('missing');
      });

      const { validateProjectPaths } = await import('../../config/project-loader.js');
      const result = validateProjectPaths({
        name: 'test',
        description: 'test',
        source: {
          path: '/exists/path',
          composePath: '/missing/compose',
          configPath: '/exists/config',
        },
        docker: { builderImage: '', services: [] },
        kubernetes: { namespace: '', deployments: [] },
        minikube: { manifestPath: '' },
        aks: { manifestPath: '', environments: [] },
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]).toContain('composePath');
    });
  });
});
