/**
 * Init command - Initialize Terraform and pull remote state
 *
 * Use this command to:
 * - Set up a fresh clone of the repo
 * - Pull/sync remote state for an environment
 * - Verify state connectivity without making changes
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager } from '../utils/terraform.js';

import type { StackConfig, DeployConfig } from '../types/index.js';

// Extended environment config that includes all fields from environments.json
interface EnvironmentConfig {
  subscriptionId: string;
  resourceGroupName: string;
  stateBackendResourceGroup: string;
  stateBackendStorageAccount: string;
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const INIT_COMMAND_DESCRIPTION = 'Initialize Terraform and pull remote state for an environment';

const CONTEXT = 'init';

interface InitResult {
  stack: string;
  success: boolean;
  resourceCount?: number;
  error?: string;
}

export async function initCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    if (args.length === 0 && !args.includes('--help')) {
      throw new ValidationError('Missing required argument: <environment>');
    }
    return;
  }

  const environment = requireString(args[0], 'environment');
  const showState = !args.includes('--no-state');
  const requestedStacks = args.slice(1).filter((a) => !a.startsWith('--'));

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, CONTEXT);

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
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`,
    );
  }

  const envConfig: EnvironmentConfig = environmentsConfig[environment];
  if (!envConfig) {
    throw new ValidationError(`Environment configuration not found for: ${environment}`);
  }

  // Determine which stacks to initialize
  const stacksToInit: StackConfig[] =
    requestedStacks.length > 0
      ? deployConfig.stacks.filter((s) => requestedStacks.includes(s.name))
      : deployConfig.stacks;

  if (requestedStacks.length > 0) {
    const invalidStacks = requestedStacks.filter((name) => !deployConfig.stacks.some((s) => s.name === name));
    if (invalidStacks.length > 0) {
      throw new ValidationError(
        `Unknown stacks: ${invalidStacks.join(', ')}. Valid stacks: ${deployConfig.stacks.map((s) => s.name).join(', ')}`,
      );
    }
  }

  await runInit(stacksToInit, environment, envConfig, showState);
}

async function runInit(
  stacks: StackConfig[],
  environment: string,
  envConfig: EnvironmentConfig,
  showState: boolean,
): Promise<void> {
  logger.section(`INITIALIZE: ${environment.toUpperCase()}`);

  logger.info(`Environment: ${environment}`, CONTEXT);
  logger.info(`Resource Group: ${envConfig.resourceGroupName}`, CONTEXT);
  logger.info(`State Backend: ${envConfig.stateBackendStorageAccount}`, CONTEXT);
  logger.info(`Stacks to initialize: ${stacks.length}`, CONTEXT);
  console.log('');

  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  const results: InitResult[] = [];

  for (const stack of stacks) {
    logger.info(`Initializing ${stack.name}...`, CONTEXT);

    try {
      // Initialize - this connects to remote backend and pulls state
      await terraform.init(stack.path, { verbose: false });

      let resourceCount: number | undefined;

      if (showState) {
        // Get state summary
        try {
          const state = await terraform.showState(stack.path);
          resourceCount = state.resources?.length || 0;
        } catch {
          // State might be empty for new stacks
          resourceCount = 0;
        }
      }

      results.push({
        stack: stack.name,
        success: true,
        resourceCount,
      });

      if (showState && resourceCount !== undefined) {
        logger.success(`${stack.name}: initialized (${resourceCount} resources in state)`);
      } else {
        logger.success(`${stack.name}: initialized`);
      }
    } catch (error: any) {
      results.push({
        stack: stack.name,
        success: false,
        error: error.message,
      });
      logger.failure(`${stack.name}: ${error.message}`);
    }
  }

  // Print summary
  console.log('');
  logger.section('SUMMARY');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  logger.info(`Initialized: ${successful.length}/${results.length} stacks`, CONTEXT);

  if (showState) {
    const totalResources = successful.reduce((sum, r) => sum + (r.resourceCount || 0), 0);
    logger.info(`Total resources in state: ${totalResources}`, CONTEXT);
  }

  if (failed.length > 0) {
    console.log('');
    logger.warn('Failed stacks:', CONTEXT);
    for (const result of failed) {
      console.log(`  - ${result.stack}: ${result.error}`);
    }
  }

  console.log('');

  if (failed.length > 0) {
    logger.warn('Some stacks failed to initialize. Check Azure credentials and backend configuration.', CONTEXT);
    logger.info('Common issues:', CONTEXT);
    console.log('  1. Not logged into Azure: az login');
    console.log('  2. Wrong subscription: az account set --subscription <id>');
    console.log('  3. Backend storage account not accessible');
    console.log('  4. State backend not bootstrapped: npm run tf:bootstrap');
  } else {
    logger.success(`All stacks initialized for ${environment}`);
    console.log('');
    logger.info('Next steps:', CONTEXT);
    console.log(`  - View detailed status: npm run tf:status -- ${environment}`);
    console.log(`  - Preview changes: npm run tf:plan -- ${environment}`);
    console.log(`  - Validate security: npm run tf:validate-security -- ${environment}`);
  }
}

function printHelp(): void {
  console.log(`
Initialize Terraform and pull remote state for an environment

USAGE:
  terraform-cli init <environment> [stacks...] [options]

ARGUMENTS:
  environment     Environment name (dev, test, prod)
  stacks          Optional: specific stacks to initialize (default: all)

OPTIONS:
  --no-state      Skip showing resource counts (faster)
  --help          Show this help message

DESCRIPTION:
  This command initializes Terraform for all stacks in an environment,
  connecting to the remote backend and pulling the current state.

  Use this when:
  - Setting up a fresh clone of the repository
  - Syncing with remote state after changes by other team members
  - Verifying backend connectivity without making changes
  - Validating that state is accessible before running plan/apply

  The command will:
  1. Load environment configuration from configs/terraform/
  2. Initialize each stack with the remote backend
  3. Pull current state from Azure Storage
  4. Display resource counts for each stack

EXAMPLES:
  # Initialize all stacks for dev environment
  npm run tf:init -- dev

  # Initialize specific stacks
  npm run tf:init -- dev networking keyvault

  # Initialize without showing state (faster)
  npm run tf:init -- prod --no-state

  # Initialize after fresh clone
  az login
  npm run tf:init -- dev
`);
}
