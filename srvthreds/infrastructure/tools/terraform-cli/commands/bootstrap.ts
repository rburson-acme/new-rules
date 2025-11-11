/**
 * Bootstrap command - Initialize bootstrap infrastructure
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError, confirmAction } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager } from '../utils/terraform.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DeployConfig {
  environments: string[];
}

export const BOOTSTRAP_COMMAND_DESCRIPTION = 'Initialize bootstrap infrastructure (storage, resource group)';

export async function bootstrapCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Initialize bootstrap infrastructure

Bootstrap creates the foundational infrastructure needed for Terraform state management:
- Resource group for Terraform state
- Storage account for state files
- Container for state storage
- Management lock to prevent accidental deletion

USAGE:
  terraform-cli bootstrap <environment> [options]

ARGUMENTS:
  environment     Target environment (dev, test, prod)

OPTIONS:
  --dry-run       Preview what will be created
  --force         Skip confirmations
  --help          Show this help message

EXAMPLES:
  # Bootstrap dev environment
  terraform-cli bootstrap dev

  # Preview bootstrap
  terraform-cli bootstrap dev --dry-run

  # Bootstrap without confirmation
  terraform-cli bootstrap dev --force
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'shared', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'bootstrap');

  let deployConfig: DeployConfig;
  try {
    deployConfig = configLoader.loadConfig<DeployConfig>('stacks.json');
  } catch (error: any) {
    throw new ValidationError(`Failed to load configuration: ${error.message}`);
  }

  // Validate environment
  if (!deployConfig.environments.includes(environment)) {
    throw new ValidationError(
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`
    );
  }

  logger.section('BOOTSTRAP INFRASTRUCTURE');

  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be made', 'bootstrap');
  }

  // Show what will be created
  console.log('\nBootstrap Plan:');
  console.log('  1. Create resource group for Terraform state');
  console.log('  2. Create storage account for state files');
  console.log('  3. Create container for state storage');
  console.log('  4. Apply management lock to prevent deletion');

  // Confirm bootstrap
  if (!force && !dryRun) {
    const confirmed = await confirmAction('Proceed with bootstrap?');
    if (!confirmed) {
      logger.info('Bootstrap cancelled', 'bootstrap');
      return;
    }
  }

  const terraformDir = path.join(__dirname, '../../..', 'cloud', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment);

  try {
    logger.section('INITIALIZING BOOTSTRAP');

    const bootstrapPath = 'bootstrap';

    // Initialize
    await terraform.init(bootstrapPath, { dryRun });

    // Validate
    await terraform.validate(bootstrapPath, { dryRun });

    // Plan
    const planFile = 'bootstrap.tfplan';
    await terraform.plan(bootstrapPath, planFile, { dryRun });

    // Apply
    if (!dryRun) {
      await terraform.apply(bootstrapPath, planFile);
      logger.success('Bootstrap infrastructure created');

      // Get outputs
      logger.section('BOOTSTRAP OUTPUTS');
      try {
        const outputs = await terraform.getOutput(bootstrapPath);
        console.log('\nBootstrap outputs:');
        for (const [key, value] of Object.entries(outputs)) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      } catch (error: any) {
        logger.warn(`Failed to retrieve outputs: ${error.message}`, 'bootstrap');
      }
    } else {
      logger.info('[DRY RUN] Would create bootstrap infrastructure', 'bootstrap');
    }

    logger.success('Bootstrap completed successfully');
  } catch (error: any) {
    logger.failure(`Bootstrap failed: ${error.message}`);
    throw error;
  }
}

