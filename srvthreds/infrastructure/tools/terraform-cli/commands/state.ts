/**
 * State command - Manage Terraform state
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError } from '../../shared/error-handler.js';
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

const STATE_COMMANDS = ['backup', 'validate', 'repair', 'clean', 'show'];

export async function stateCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Manage Terraform state

USAGE:
  terraform-cli state <subcommand> <environment> [stacks...]

SUBCOMMANDS:
  backup      Backup state files with timestamp
  validate    Check state consistency and configuration
  repair      Refresh state from Azure
  clean       Remove orphaned resources from state
  show        Display current state

OPTIONS:
  --help      Show this help message

EXAMPLES:
  # Backup state before deployment
  terraform-cli state backup dev

  # Validate state consistency
  terraform-cli state validate dev

  # Repair state from Azure
  terraform-cli state repair dev networking

  # Show state for a stack
  terraform-cli state show dev networking
`);
    return;
  }

  const subcommand = requireString(args[0], 'subcommand');
  const environment = requireString(args[1], 'environment');

  if (!STATE_COMMANDS.includes(subcommand)) {
    throw new ValidationError(
      `Invalid state subcommand: ${subcommand}. Valid options: ${STATE_COMMANDS.join(', ')}`
    );
  }

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'shared', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'state');

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

  const terraformDir = path.join(__dirname, '../../..', 'cloud', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  const requestedStacks = args.slice(2).filter((a) => !a.startsWith('--'));
  const stacksToProcess = requestedStacks.length > 0
    ? deployConfig.stacks.filter((s) => requestedStacks.includes(s.name))
    : deployConfig.stacks;

  switch (subcommand) {
    case 'backup':
      await backupState(stacksToProcess, terraformDir, environment);
      break;

    case 'validate':
      await validateState(stacksToProcess, terraform);
      break;

    case 'repair':
      await repairState(stacksToProcess, terraform);
      break;

    case 'clean':
      await cleanState(stacksToProcess, terraform);
      break;

    case 'show':
      await showState(stacksToProcess, terraform);
      break;
  }
}

async function backupState(stacks: StackConfig[], terraformDir: string, environment: string): Promise<void> {
  logger.section('BACKING UP STATE');

  const backupDir = path.join(terraformDir, '.state-backups', new Date().toISOString().replace(/[:.]/g, '-'));
  fs.mkdirSync(backupDir, { recursive: true });

  for (const stack of stacks) {
    const stateFile = path.join(terraformDir, stack.path, `terraform.${environment}.tfstate`);

    if (fs.existsSync(stateFile)) {
      const backupFile = path.join(backupDir, `${stack.name}.tfstate`);
      fs.copyFileSync(stateFile, backupFile);
      logger.success(`Backed up ${stack.name} state`);
    } else {
      logger.warn(`No state file found for ${stack.name}`, 'backup');
    }
  }

  logger.info(`State backed up to ${backupDir}`, 'backup');
}

async function validateState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('VALIDATING STATE');

  let validCount = 0;
  let errorCount = 0;

  for (const stack of stacks) {
    try {
      await terraform.validate(stack.path);
      logger.success(`${stack.name} state is valid`);
      validCount++;
    } catch (error: any) {
      logger.failure(`${stack.name} state validation failed: ${error.message}`);
      errorCount++;
    }
  }

  logger.info(`Validation complete: ${validCount} valid, ${errorCount} errors`, 'validate');
}

async function repairState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('REPAIRING STATE');

  for (const stack of stacks) {
    try {
      await terraform.refresh(stack.path);
      logger.success(`Refreshed ${stack.name} state from Azure`);
    } catch (error: any) {
      logger.failure(`Failed to refresh ${stack.name} state: ${error.message}`);
    }
  }
}

async function cleanState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('CLEANING STATE');

  for (const stack of stacks) {
    try {
      const state = await terraform.showState(stack.path);
      const resourceCount = state.resources?.length || 0;
      logger.info(`${stack.name} has ${resourceCount} resources in state`, 'clean');
    } catch (error: any) {
      logger.warn(`Could not analyze ${stack.name} state: ${error.message}`, 'clean');
    }
  }

  logger.info('State cleanup analysis complete', 'clean');
}

async function showState(stacks: StackConfig[], terraform: TerraformManager): Promise<void> {
  logger.section('SHOWING STATE');

  for (const stack of stacks) {
    try {
      const state = await terraform.showState(stack.path);
      console.log(`\n${stack.name}:`);
      console.log(`  Version: ${state.version}`);
      console.log(`  Terraform: ${state.terraform_version}`);
      console.log(`  Resources: ${state.resources?.length || 0}`);
      console.log(`  Outputs: ${Object.keys(state.outputs || {}).length}`);
    } catch (error: any) {
      logger.warn(`Could not show ${stack.name} state: ${error.message}`, 'show');
    }
  }
}

