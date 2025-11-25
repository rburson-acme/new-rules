/**
 * Configuration-related type definitions
 */

/**
 * Stack configuration defining an infrastructure component
 */
export interface TerraformStackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

/**
 * Alias for TerraformStackConfig used in deploy commands
 */
export interface StackConfig extends TerraformStackConfig {}

/**
 * Environment-specific configuration for backend state storage
 */
export interface EnvironmentConfig {
  stateBackendResourceGroup: string;
  stateBackendStorageAccount: string;
}

/**
 * Deploy configuration containing available stacks and environments
 */
export interface DeployConfig {
  stacks: StackConfig[];
  environments: string[];
}

/**
 * Map of environment names to their configurations
 */
export interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}
