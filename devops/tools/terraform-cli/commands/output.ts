/**
 * Output Command
 *
 * Retrieves and displays Terraform outputs from deployed stacks
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { CLIError, ValidationError } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager, EnvironmentConfig } from '../utils/terraform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface StackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

interface DeployConfig {
  stacks: StackConfig[];
  environments: string[];
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}

export const OUTPUT_COMMAND_DESCRIPTION = 'Get outputs from deployed stacks';

/**
 * Display outputs for one or more stacks
 *
 * Usage:
 *   terraform-cli output <environment> [stack-name] [output-name]
 *
 * Examples:
 *   terraform-cli output dev                    # Show all outputs from all stacks
 *   terraform-cli output dev networking         # Show all outputs from networking stack
 *   terraform-cli output dev aks aks_name       # Show specific output from aks stack
 */
export async function outputCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new CLIError(
      'Missing environment argument.\n' +
      'Usage: terraform-cli output <environment> [stack-name] [output-name]'
    );
  }

  const environment = args[0];
  const stackName = args[1];
  const outputName = args[2];

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'output');

  let deployConfig: DeployConfig;
  let environmentsConfig: EnvironmentsConfig;

  try {
    deployConfig = configLoader.loadConfig<DeployConfig>('stacks.json');
    environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
  } catch (error: any) {
    throw new ValidationError(`Failed to load configuration: ${error.message}`);
  }

  // Validate environment
  if (!deployConfig.environments.includes(environment)) {
    throw new ValidationError(
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`
    );
  }

  // Get environment config
  const envConfig = environmentsConfig[environment];
  if (!envConfig) {
    throw new ValidationError(`Environment configuration not found for: ${environment}`);
  }

  // Determine terraform directory (2 levels up from commands dir)
  const terraformDir = path.join(__dirname, '../../..', 'terraform');

  // If stack name provided, show outputs for that stack
  if (stackName) {
    const stack = deployConfig.stacks.find((s: StackConfig) => s.name === stackName);
    if (!stack) {
      throw new CLIError(
        `Unknown stack: ${stackName}\n` +
        `Available stacks: ${deployConfig.stacks.map((s: StackConfig) => s.name).join(', ')}`
      );
    }

    await showStackOutputs(
      terraformDir,
      environment,
      envConfig,
      stack.name,
      stack.path,
      outputName
    );
  } else {
    // Show outputs for all stacks
    logger.info(`Retrieving outputs from all stacks in ${environment}`, 'output');

    for (const stack of deployConfig.stacks) {
      try {
        await showStackOutputs(
          terraformDir,
          environment,
          envConfig,
          stack.name,
          stack.path
        );
      } catch (error: any) {
        // Skip stacks that haven't been deployed yet
        if (error.message?.includes('No state file')) {
          logger.warn(`Stack ${stack.name} has not been deployed yet`, 'output');
        } else {
          logger.error(`Failed to get outputs for ${stack.name}: ${error.message}`, 'output');
        }
      }
    }
  }
}

async function showStackOutputs(
  terraformDir: string,
  environment: string,
  envConfig: any,
  stackName: string,
  stackPath: string,
  specificOutput?: string
): Promise<void> {
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  try {
    const outputs = await terraform.getOutput(stackPath, specificOutput);

    if (specificOutput) {
      // Show single output
      logger.section(`${stackName} > ${specificOutput}`);
      if (typeof outputs === 'object' && 'value' in outputs) {
        logger.info(JSON.stringify(outputs.value, null, 2), stackName);
      } else {
        logger.info(JSON.stringify(outputs, null, 2), stackName);
      }
    } else {
      // Show all outputs for this stack
      logger.section(`Stack: ${stackName}`);

      if (typeof outputs === 'object' && outputs !== null) {
        const outputEntries = Object.entries(outputs);

        if (outputEntries.length === 0) {
          logger.info('No outputs defined', stackName);
        } else {
          for (const [key, value] of outputEntries) {
            const outputValue = typeof value === 'object' && value !== null && 'value' in value
              ? (value as any).value
              : value;

            const sensitive = typeof value === 'object' && value !== null && 'sensitive' in value
              ? (value as any).sensitive
              : false;

            if (sensitive) {
              logger.info(`${key}: <sensitive>`, stackName);
            } else if (typeof outputValue === 'object') {
              logger.info(`${key}: ${JSON.stringify(outputValue, null, 2)}`, stackName);
            } else {
              logger.info(`${key}: ${outputValue}`, stackName);
            }
          }
        }
      }
    }
  } catch (error: any) {
    if (error.message?.includes('Failed to get Terraform output')) {
      throw new CLIError(`No outputs available for stack ${stackName}. Stack may not be deployed.`);
    }
    throw error;
  }
}
