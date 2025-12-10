/**
 * Deployment Configuration Loader
 *
 * Loads deployment configurations from projects/{project}/deployments/*.json files.
 * These configs define how to build and deploy services for different environments.
 */

import * as fs from 'fs';
import * as path from 'path';
import { type ProjectConfig } from '../../../kubernetes-cli/config/project-loader.js';

/**
 * Command to run before/after deployment steps
 */
export interface DeploymentCommand {
  description: string;
  command: string;
}

/**
 * Environment-specific overrides for a deployment
 */
export interface EnvironmentOverrides {
  preBuildCommands?: DeploymentCommand[];
  postUpCommands?: DeploymentCommand[];
}

/**
 * Configuration for a single compose file in multi-file deployments
 */
export interface ComposeFileConfig {
  composeFile: string;
  defaultArgs?: string;
  preBuildCommands?: DeploymentCommand[];
  postUpCommands?: DeploymentCommand[];
  environmentOverrides?: Record<string, EnvironmentOverrides>;
}

/**
 * Target configuration for a deployment
 */
export interface DeploymentTarget {
  type?: string;
  deployCommand: 'build' | 'up' | 'down';
  composeFile?: string;
  composeFiles?: ComposeFileConfig[];
  defaultArgs?: string;
  preBuildCommands?: DeploymentCommand[];
  postUpCommands?: DeploymentCommand[];
  environmentOverrides?: Record<string, EnvironmentOverrides>;
}

/**
 * A single deployment configuration
 */
export interface DeploymentConfig {
  name: string;
  shortName: string;
  description: string;
  environments: string[];
  target: DeploymentTarget;
}

/**
 * Root structure of a deployment config file
 */
export interface DeploymentConfigFile {
  deployments: DeploymentConfig[];
}

/**
 * Resolved deployment with environment-specific commands merged
 */
export interface ResolvedDeployment {
  name: string;
  shortName: string;
  description: string;
  deployCommand: string;
  composeFile: string;
  composeFilePath: string;
  defaultArgs: string;
  preBuildCommands: DeploymentCommand[];
  postUpCommands: DeploymentCommand[];
}

/**
 * Load all deployment configs for a project
 */
export function loadDeploymentConfigs(projectConfig: ProjectConfig): DeploymentConfig[] {
  const deploymentsDir = projectConfig.deployments.configPath;

  if (!fs.existsSync(deploymentsDir)) {
    throw new Error(`Deployments directory not found: ${deploymentsDir}`);
  }

  const deployments: DeploymentConfig[] = [];
  const files = fs.readdirSync(deploymentsDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(deploymentsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content) as DeploymentConfigFile;
    deployments.push(...config.deployments);
  }

  return deployments;
}

/**
 * Find a deployment by shortName
 */
export function findDeployment(deployments: DeploymentConfig[], shortName: string): DeploymentConfig | undefined {
  return deployments.find((d) => d.shortName === shortName);
}

/**
 * Resolve a deployment config for a specific environment
 * Merges environment-specific overrides into the base config
 */
export function resolveDeployment(
  deployment: DeploymentConfig,
  environment: string,
  projectConfig: ProjectConfig,
): ResolvedDeployment {
  const target = deployment.target;
  const composePath = projectConfig.docker.composePath;

  // Get base commands
  let preBuildCommands = target.preBuildCommands || [];
  let postUpCommands = target.postUpCommands || [];

  // Apply environment-specific overrides
  const envOverrides = target.environmentOverrides?.[environment];
  if (envOverrides) {
    if (envOverrides.preBuildCommands) {
      preBuildCommands = envOverrides.preBuildCommands;
    }
    if (envOverrides.postUpCommands) {
      postUpCommands = envOverrides.postUpCommands;
    }
  }

  const composeFile = target.composeFile || '';
  const composeFilePath = composeFile ? path.join(composePath, composeFile) : '';

  return {
    name: deployment.name,
    shortName: deployment.shortName,
    description: deployment.description,
    deployCommand: target.deployCommand,
    composeFile,
    composeFilePath,
    defaultArgs: target.defaultArgs || '',
    preBuildCommands,
    postUpCommands,
  };
}

/**
 * Resolve all compose files for a multi-file deployment
 */
export function resolveMultiFileDeployment(
  deployment: DeploymentConfig,
  environment: string,
  projectConfig: ProjectConfig,
): ResolvedDeployment[] {
  const target = deployment.target;
  const composePath = projectConfig.docker.composePath;

  if (!target.composeFiles) {
    // Single file deployment, wrap in array
    return [resolveDeployment(deployment, environment, projectConfig)];
  }

  return target.composeFiles.map((fileConfig) => {
    let preBuildCommands = fileConfig.preBuildCommands || [];
    let postUpCommands = fileConfig.postUpCommands || [];

    // Apply environment-specific overrides
    const envOverrides = fileConfig.environmentOverrides?.[environment];
    if (envOverrides) {
      if (envOverrides.preBuildCommands) {
        preBuildCommands = envOverrides.preBuildCommands;
      }
      if (envOverrides.postUpCommands) {
        postUpCommands = envOverrides.postUpCommands;
      }
    }

    const composeFilePath = path.join(composePath, fileConfig.composeFile);

    return {
      name: deployment.name,
      shortName: deployment.shortName,
      description: deployment.description,
      deployCommand: target.deployCommand,
      composeFile: fileConfig.composeFile,
      composeFilePath,
      defaultArgs: fileConfig.defaultArgs || target.defaultArgs || '',
      preBuildCommands,
      postUpCommands,
    };
  });
}
