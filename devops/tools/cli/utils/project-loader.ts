/**
 * Project Configuration Loader
 *
 * Loads and validates project.yaml (v2 schema) files.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { ProjectConfig, ResolvedProjectConfig, DeployTarget, ProfileConfig } from '../schemas/project-config.js';

const PROJECTS_DIR = path.resolve(import.meta.dirname, '../../../projects');

/**
 * Get the project directory path
 */
export function getProjectDir(projectName: string): string {
  return path.join(PROJECTS_DIR, projectName);
}

/**
 * Load and resolve project configuration
 *
 * @param projectName - Name of the project (directory under projects/)
 * @param configFile - Config file name (default: project.v2.yaml, fallback: project.yaml)
 */
export function loadProjectConfig(projectName: string, configFile?: string): ResolvedProjectConfig {
  const projectDir = getProjectDir(projectName);

  // Try v2 config first, then fallback
  const configFiles = configFile ? [configFile] : ['project.v2.yaml', 'project.yaml'];
  let configPath: string | null = null;

  for (const file of configFiles) {
    const tryPath = path.join(projectDir, file);
    if (fs.existsSync(tryPath)) {
      configPath = tryPath;
      break;
    }
  }

  if (!configPath) {
    throw new Error(`Project configuration not found for '${projectName}'. Tried: ${configFiles.join(', ')}`);
  }

  const content = fs.readFileSync(configPath, 'utf-8');
  const config = yaml.load(content) as ProjectConfig;

  // Validate required fields
  validateProjectConfig(config, projectName);

  // Resolve to absolute paths
  const resolved: ResolvedProjectConfig = {
    ...config,
    projectDir,
    sourcePath: path.resolve(projectDir, config.source.path),
  };

  return resolved;
}

/**
 * Validate project configuration
 */
function validateProjectConfig(config: ProjectConfig, projectName: string): void {
  const errors: string[] = [];

  if (!config.name) {
    errors.push('Missing required field: name');
  }
  if (!config.source?.path) {
    errors.push('Missing required field: source.path');
  }
  if (!config.services || Object.keys(config.services).length === 0) {
    errors.push('Missing required field: services (must have at least one service)');
  }
  if (!config.profiles || Object.keys(config.profiles).length === 0) {
    errors.push('Missing required field: profiles (must define at least one profile)');
  }
  if (!config.environments?.minikube) {
    errors.push('Missing required field: environments.minikube');
  }

  // Validate service references
  for (const [serviceName, service] of Object.entries(config.services || {})) {
    // Check image reference
    if (!service.image) {
      errors.push(`Service '${serviceName}' is missing required field: image`);
    } else if (!service.image.includes(':') && !config.images?.[service.image]) {
      // It's a reference to images section, not an external image
      // External images have ':' like mongo:latest
      errors.push(`Service '${serviceName}' references unknown image: ${service.image}`);
    }

    // Check profiles
    if (!service.profiles || service.profiles.length === 0) {
      errors.push(`Service '${serviceName}' must have at least one profile`);
    }

    // Check deploy targets
    if (!service.deploy || service.deploy.length === 0) {
      errors.push(`Service '${serviceName}' must have at least one deploy target`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid project configuration for '${projectName}':\n  - ${errors.join('\n  - ')}`);
  }
}

/**
 * List all available projects
 */
export function listProjects(): string[] {
  if (!fs.existsSync(PROJECTS_DIR)) {
    return [];
  }

  return fs.readdirSync(PROJECTS_DIR).filter((name) => {
    const projectDir = path.join(PROJECTS_DIR, name);
    if (!fs.statSync(projectDir).isDirectory()) {
      return false;
    }
    // Check for either config file
    return (
      fs.existsSync(path.join(projectDir, 'project.v2.yaml')) || fs.existsSync(path.join(projectDir, 'project.yaml'))
    );
  });
}

/**
 * Get services for a specific deploy target
 */
export function getServicesForTarget(
  config: ProjectConfig,
  target: DeployTarget,
): Record<string, (typeof config.services)[string]> {
  const result: Record<string, (typeof config.services)[string]> = {};

  for (const [name, service] of Object.entries(config.services)) {
    if (service.deploy.includes(target)) {
      result[name] = service;
    }
  }

  return result;
}

/**
 * Get services array from a profile definition
 * Handles both simple array format and object format with runtime config
 */
function getProfileServices(profileDef: string[] | ProfileConfig): string[] {
  if (Array.isArray(profileDef)) {
    return profileDef;
  }
  return profileDef.services;
}

/**
 * Get services for a specific profile
 */
export function getServicesForProfile(
  config: ProjectConfig,
  profileName: string,
): Record<string, (typeof config.services)[string]> {
  const profileDef = config.profiles[profileName];
  if (!profileDef) {
    throw new Error(`Unknown profile: ${profileName}`);
  }

  const result: Record<string, (typeof config.services)[string]> = {};

  // Recursively expand profiles
  const expandProfile = (names: string[]) => {
    for (const name of names) {
      // Check if it's a profile reference
      const nestedProfile = config.profiles[name];
      if (nestedProfile) {
        expandProfile(getProfileServices(nestedProfile));
      } else if (config.services[name]) {
        result[name] = config.services[name];
      }
    }
  };

  expandProfile(getProfileServices(profileDef));
  return result;
}
