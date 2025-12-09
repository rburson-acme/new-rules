/**
 * Project Configuration Loader
 *
 * Loads and validates project configurations from projects/{project}/project.yaml
 * Provides a consistent interface for deployers to access project-specific settings.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root of devops project
const DEVOPS_ROOT = path.resolve(__dirname, '..', '..', '..');
const PROJECTS_DIR = path.join(DEVOPS_ROOT, 'projects');
const DEFAULT_PROJECT = 'srvthreds';

/**
 * Docker service definition
 */
export interface DockerService {
  name: string;
  image: string;
}

/**
 * Project configuration schema
 */
export interface ProjectConfig {
  name: string;
  description: string;
  source: {
    /** Absolute path to the project source code */
    path: string;
  };
  docker: {
    /** Absolute path to docker-compose files */
    composePath: string;
    /** Absolute path to dockerfiles */
    dockerfilePath: string;
    /** Absolute path to docker assets */
    assetsPath: string;
    builderImage: string;
    services: DockerService[];
  };
  deployments: {
    /** Absolute path to deployment configs */
    configPath: string;
  };
  terraform: {
    /** Absolute path to terraform stacks */
    stacksPath: string;
    /** Absolute path to terraform config */
    configPath: string;
  };
  kubernetes: {
    namespace: string;
    deployments: string[];
  };
  minikube: {
    /** Absolute path to minikube manifests */
    manifestPath: string;
  };
  aks: {
    /** Absolute path to AKS manifests */
    manifestPath: string;
    environments: string[];
  };
}

/**
 * Raw YAML structure (paths are relative to project directory)
 */
interface RawProjectConfig {
  name: string;
  description: string;
  source: {
    path: string;
  };
  docker: {
    composePath: string;
    dockerfilePath: string;
    assetsPath: string;
    builderImage: string;
    services: DockerService[];
  };
  deployments: {
    configPath: string;
  };
  terraform: {
    stacksPath: string;
    configPath: string;
  };
  kubernetes: {
    namespace: string;
    deployments: string[];
  };
  minikube: {
    manifestPath: string;
  };
  aks: {
    manifestPath: string;
    environments: string[];
  };
}

/**
 * Load a project configuration by name
 *
 * @param projectName - Name of the project (matches directory in projects/)
 * @returns Resolved ProjectConfig with absolute paths
 * @throws Error if project not found or config invalid
 */
export function loadProjectConfig(projectName: string = DEFAULT_PROJECT): ProjectConfig {
  const projectDir = path.join(PROJECTS_DIR, projectName);
  const configFile = path.join(projectDir, 'project.yaml');

  if (!fs.existsSync(configFile)) {
    const available = listProjects();
    throw new Error(`Project '${projectName}' not found. Available projects: ${available.join(', ') || 'none'}`);
  }

  const rawContent = fs.readFileSync(configFile, 'utf-8');
  const raw = yaml.load(rawContent) as RawProjectConfig;

  // Validate required fields
  validateRawConfig(raw, projectName);

  // Resolve relative paths to absolute paths
  // source.path is relative to project directory
  const sourcePath = path.resolve(projectDir, raw.source.path);

  const config: ProjectConfig = {
    name: raw.name,
    description: raw.description,
    source: {
      path: sourcePath,
    },
    docker: {
      // Docker paths are relative to project directory
      composePath: path.resolve(projectDir, raw.docker.composePath),
      dockerfilePath: path.resolve(projectDir, raw.docker.dockerfilePath),
      assetsPath: path.resolve(projectDir, raw.docker.assetsPath),
      builderImage: raw.docker.builderImage,
      services: raw.docker.services,
    },
    deployments: {
      configPath: path.resolve(projectDir, raw.deployments.configPath),
    },
    terraform: {
      stacksPath: path.resolve(projectDir, raw.terraform.stacksPath),
      configPath: path.resolve(projectDir, raw.terraform.configPath),
    },
    kubernetes: {
      namespace: raw.kubernetes.namespace,
      deployments: raw.kubernetes.deployments,
    },
    minikube: {
      // Manifest paths are relative to project directory
      manifestPath: path.resolve(projectDir, raw.minikube.manifestPath),
    },
    aks: {
      manifestPath: path.resolve(projectDir, raw.aks.manifestPath),
      environments: raw.aks.environments,
    },
  };

  return config;
}

/**
 * List all available project names
 */
export function listProjects(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const configFile = path.join(PROJECTS_DIR, entry.name, 'project.yaml');
      return fs.existsSync(configFile);
    })
    .map((entry) => entry.name);
}

/**
 * Get the default project name
 */
export function getDefaultProject(): string {
  return DEFAULT_PROJECT;
}

/**
 * Get the project directory path
 */
export function getProjectDir(projectName: string = DEFAULT_PROJECT): string {
  return path.join(PROJECTS_DIR, projectName);
}

/**
 * Validate raw config has required fields
 */
function validateRawConfig(raw: RawProjectConfig, projectName: string): void {
  const errors: string[] = [];

  if (!raw.name) errors.push('name is required');
  if (!raw.source?.path) errors.push('source.path is required');
  if (!raw.docker?.composePath) errors.push('docker.composePath is required');
  if (!raw.docker?.dockerfilePath) errors.push('docker.dockerfilePath is required');
  if (!raw.docker?.assetsPath) errors.push('docker.assetsPath is required');
  if (!raw.docker?.builderImage) errors.push('docker.builderImage is required');
  if (!raw.docker?.services?.length) errors.push('docker.services must have at least one service');
  if (!raw.deployments?.configPath) errors.push('deployments.configPath is required');
  if (!raw.terraform?.stacksPath) errors.push('terraform.stacksPath is required');
  if (!raw.terraform?.configPath) errors.push('terraform.configPath is required');
  if (!raw.kubernetes?.namespace) errors.push('kubernetes.namespace is required');
  if (!raw.kubernetes?.deployments?.length) errors.push('kubernetes.deployments must have at least one deployment');
  if (!raw.minikube?.manifestPath) errors.push('minikube.manifestPath is required');
  if (!raw.aks?.manifestPath) errors.push('aks.manifestPath is required');
  if (!raw.aks?.environments?.length) errors.push('aks.environments must have at least one environment');

  if (errors.length > 0) {
    throw new Error(`Invalid project config '${projectName}':\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * Validate that a project's source paths exist
 *
 * @param config - Project configuration to validate
 * @returns Object with validation result and any missing paths
 */
export function validateProjectPaths(config: ProjectConfig): {
  valid: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!fs.existsSync(config.source.path)) {
    missing.push(`source.path: ${config.source.path}`);
  }
  if (!fs.existsSync(config.docker.composePath)) {
    missing.push(`docker.composePath: ${config.docker.composePath}`);
  }
  if (!fs.existsSync(config.deployments.configPath)) {
    missing.push(`deployments.configPath: ${config.deployments.configPath}`);
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
