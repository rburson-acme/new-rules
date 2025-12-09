/**
 * Destroy command - Destroy infrastructure stacks from Azure
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError, confirmAction } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager } from '../utils/terraform.js';

// Import types from centralized location
import type { StackConfig, DeployConfig, EnvironmentsConfig, EnvironmentConfig } from '../types/index.js';

import { COMMAND_DESCRIPTIONS } from '../types/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get stack destruction order (reverse of deployment order, respecting dependencies)
 */
export function getDestructionOrder(stacks: StackConfig[], requestedStacks?: string[]): StackConfig[] {
  const stackMap = new Map(stacks.map((s) => [s.name, s]));
  const processed = new Set<string>();
  const order: StackConfig[] = [];

  const toProcess = requestedStacks && requestedStacks.length > 0 ? requestedStacks : stacks.map((s) => s.name);

  function addStack(name: string): void {
    if (processed.has(name)) return;

    const stack = stackMap.get(name);
    if (!stack) {
      throw new ValidationError(`Stack not found: ${name}`);
    }

    // Process this stack first (before dependents)
    processed.add(name);
    order.push(stack);

    // Then find and process stacks that depend on this one
    for (const [otherName, otherStack] of stackMap) {
      if (!processed.has(otherName) && otherStack.dependencies.includes(name)) {
        addStack(otherName);
      }
    }
  }

  // Start with requested stacks (or all stacks if none specified)
  for (const stackName of toProcess) {
    addStack(stackName);
  }

  // Reverse the order so dependents are destroyed first
  return order.reverse();
}

/**
 * Load and validate configuration
 */
function loadConfiguration(
  environment: string,
  project: string = 'srvthreds',
): {
  deployConfig: DeployConfig;
  envConfig: EnvironmentConfig;
} {
  const configDir = path.join(__dirname, '../../..', 'projects', project, 'terraform');
  const configLoader = createConfigLoader(configDir, 'destroy');

  let deployConfig: DeployConfig;
  let environmentsConfig: EnvironmentsConfig;

  try {
    deployConfig = configLoader.loadConfig<DeployConfig>('stacks.json');
    environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
  } catch (error: any) {
    throw new ValidationError(`Failed to load configuration: ${error.message}`);
  }

  if (!deployConfig.environments.includes(environment)) {
    throw new ValidationError(
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`,
    );
  }

  const envConfig = environmentsConfig[environment];
  if (!envConfig) {
    throw new ValidationError(`Environment configuration not found for: ${environment}`);
  }

  return { deployConfig, envConfig };
}

/**
 * Display destruction plan
 */
function displayDestructionPlan(destructionOrder: StackConfig[], title: string): void {
  console.log(`\n${title}:`);
  destructionOrder.forEach((stack, idx) => {
    console.log(`  ${idx + 1}. ${stack.name}`);
    if (stack.dependencies.length > 0) {
      console.log(`     Dependents will be destroyed first`);
    }
  });
}

export const DESTROY_COMMAND_DESCRIPTION = COMMAND_DESCRIPTIONS.DESTROY || 'Destroy infrastructure stacks from Azure';

export async function destroyCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Destroy infrastructure stacks from Azure

USAGE:
  terraform-cli destroy <environment> [stacks...]

ARGUMENTS:
  environment     Target environment (dev, test, prod)
  stacks          Specific stacks to destroy (optional, destroys all if not specified)

OPTIONS:
  --dry-run       Preview destruction plan without applying
  --force         Skip confirmations (DANGEROUS - use with extreme caution)
  --help          Show this help message

EXAMPLES:
  # Destroy specific stack from dev
  terraform-cli destroy dev servicebus

  # Destroy multiple stacks
  terraform-cli destroy dev servicebus redis

  # Preview destruction plan
  terraform-cli destroy dev servicebus --dry-run

WARNING:
  This command permanently destroys infrastructure resources.
  Always review the destruction plan carefully before proceeding.
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const requestedStacks = args.filter((a) => !a.startsWith('--') && a !== environment);

  if (requestedStacks.length === 0) {
    throw new ValidationError(
      'You must specify at least one stack to destroy. To destroy all stacks, list them explicitly.',
    );
  }

  // Load and validate configuration
  const { deployConfig, envConfig } = loadConfiguration(environment);

  // Get destruction order (reverse dependency order)
  const destructionOrder = getDestructionOrder(deployConfig.stacks, requestedStacks);

  logger.warn(`Destroying ${destructionOrder.length} stack(s) from ${environment}`, 'destroy');
  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be applied', 'destroy');
  }

  // Show destruction plan
  displayDestructionPlan(destructionOrder, 'Destruction Plan');

  // Confirm destruction
  if (!force && !dryRun) {
    console.log('\n⚠️  WARNING: This will permanently destroy the infrastructure resources listed above.');
    console.log('   This action cannot be undone.\n');

    const confirmed = await confirmAction('Are you absolutely sure you want to proceed?');
    if (!confirmed) {
      logger.info('Destruction cancelled', 'destroy');
      return;
    }

    // Double confirmation for production
    if (environment === 'prod') {
      const doubleConfirmed = await confirmAction(
        `Type "${environment}" to confirm destruction of PRODUCTION resources:`,
      );
      if (!doubleConfirmed) {
        logger.info('Destruction cancelled - confirmation did not match', 'destroy');
        return;
      }
    }
  }

  // Execute destruction
  // TODO: Add --project flag to CLI
  const project = 'srvthreds';
  const terraformDir = path.join(__dirname, '../../..', 'projects', project, 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  for (const stack of destructionOrder) {
    logger.section(`DESTROYING: ${stack.name}`);

    try {
      // Initialize
      await terraform.init(stack.path, { dryRun });

      // Destroy
      if (!dryRun) {
        await terraform.destroy(stack.path);
        logger.success(`Destroyed ${stack.name}`);
      } else {
        logger.info(`[DRY RUN] Would destroy ${stack.name}`, 'destroy');
      }
    } catch (error: any) {
      logger.failure(`Failed to destroy ${stack.name}: ${error.message}`);
      throw error;
    }
  }

  logger.success(`All requested stacks destroyed from ${environment}`);
}
