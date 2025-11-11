/**
 * Deploy command - Deploy infrastructure stacks to Azure
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError, confirmAction } from '../../shared/error-handler.js';
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

/**
 * Get stack deployment order respecting dependencies
 */
function getDeploymentOrder(stacks: StackConfig[], requestedStacks?: string[]): StackConfig[] {
  const stackMap = new Map(stacks.map((s) => [s.name, s]));
  const deployed = new Set<string>();
  const order: StackConfig[] = [];

  const toProcess = requestedStacks && requestedStacks.length > 0
    ? requestedStacks
    : stacks.map((s) => s.name);

  function addStack(name: string): void {
    if (deployed.has(name)) return;

    const stack = stackMap.get(name);
    if (!stack) {
      throw new ValidationError(`Stack not found: ${name}`);
    }

    // Add dependencies first
    for (const dep of stack.dependencies) {
      addStack(dep);
    }

    order.push(stack);
    deployed.add(name);
  }

  for (const stackName of toProcess) {
    addStack(stackName);
  }

  return order;
}

export async function deployCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Deploy infrastructure stacks to Azure

USAGE:
  terraform-cli deploy <environment> [stacks...]

ARGUMENTS:
  environment     Target environment (dev, test, prod)
  stacks          Specific stacks to deploy (optional, deploys all if not specified)

OPTIONS:
  --dry-run       Preview changes without applying
  --force         Skip confirmations
  --help          Show this help message

EXAMPLES:
  # Deploy all stacks to dev
  terraform-cli deploy dev

  # Deploy specific stacks
  terraform-cli deploy dev networking keyvault

  # Preview changes
  terraform-cli deploy dev --dry-run
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const requestedStacks = args.filter((a) => !a.startsWith('--'));

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'shared', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'deploy');

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

  // Get deployment order
  const stacksToProcess = requestedStacks.length > 1
    ? requestedStacks.slice(1)
    : undefined;

  const deploymentOrder = getDeploymentOrder(deployConfig.stacks, stacksToProcess);

  logger.info(`Deploying ${deploymentOrder.length} stack(s) to ${environment}`, 'deploy');
  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be applied', 'deploy');
  }

  // Show deployment plan
  console.log('\nDeployment Plan:');
  deploymentOrder.forEach((stack, idx) => {
    console.log(`  ${idx + 1}. ${stack.name}`);
    if (stack.dependencies.length > 0) {
      console.log(`     Dependencies: ${stack.dependencies.join(', ')}`);
    }
  });

  // Confirm deployment
  if (!force && !dryRun) {
    const confirmed = await confirmAction('\nProceed with deployment?');
    if (!confirmed) {
      logger.info('Deployment cancelled', 'deploy');
      return;
    }
  }

  // Execute deployment
  const terraformDir = path.join(__dirname, '../../..', 'cloud', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  for (const stack of deploymentOrder) {
    logger.section(`DEPLOYING: ${stack.name}`);

    try {
      // Initialize
      await terraform.init(stack.path, { dryRun });

      // Validate
      await terraform.validate(stack.path, { dryRun });

      // Plan
      const planFile = `${stack.name}.tfplan`;
      await terraform.plan(stack.path, planFile, { dryRun });

      // Apply
      if (!dryRun) {
        await terraform.apply(stack.path, planFile);
        logger.success(`Deployed ${stack.name}`);
      } else {
        logger.info(`[DRY RUN] Would deploy ${stack.name}`, 'deploy');
      }
    } catch (error: any) {
      logger.failure(`Failed to deploy ${stack.name}: ${error.message}`);
      throw error;
    }
  }

  logger.success(`All stacks deployed to ${environment}`);
}



/**
 * Plan command - Preview infrastructure changes without applying
 */
export async function planCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Preview infrastructure changes without applying

USAGE:
  terraform-cli plan <environment> [stacks...]

ARGUMENTS:
  environment     Target environment (dev, test, prod)
  stacks          Specific stacks to plan (optional, plans all if not specified)

OPTIONS:
  --help          Show this help message

EXAMPLES:
  # Plan all stacks for dev
  terraform-cli plan dev

  # Plan specific stacks
  terraform-cli plan dev networking keyvault
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const requestedStacks = args.filter((a) => !a.startsWith('--'));

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'shared', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'plan');

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

  // Get deployment order
  const stacksToProcess = requestedStacks.length > 1
    ? requestedStacks.slice(1)
    : undefined;

  const deploymentOrder = getDeploymentOrder(deployConfig.stacks, stacksToProcess);

  logger.info(`Planning ${deploymentOrder.length} stack(s) for ${environment}`, 'plan');

  // Show plan order
  console.log('\nPlan Order:');
  deploymentOrder.forEach((stack, idx) => {
    console.log(`  ${idx + 1}. ${stack.name}`);
    if (stack.dependencies.length > 0) {
      console.log(`     Dependencies: ${stack.dependencies.join(', ')}`);
    }
  });

  // Execute plan
  const terraformDir = path.join(__dirname, '../../..', 'cloud', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);

  for (const stack of deploymentOrder) {
    logger.section(`PLANNING: ${stack.name}`);

    try {
      // Initialize
      await terraform.init(stack.path);

      // Validate
      await terraform.validate(stack.path);

      // Plan
      const planFile = `${stack.name}.tfplan`;
      await terraform.plan(stack.path, planFile);
      logger.success(`Planned ${stack.name}`);
    } catch (error: any) {
      logger.failure(`Failed to plan ${stack.name}: ${error.message}`);
      throw error;
    }
  }

  logger.success(`All stacks planned for ${environment}`);
  console.log('\nTo apply these changes, run:');
  console.log(`  terraform-cli deploy ${environment}`);
}
