/**
 * State Backend command - Initialize Terraform state backend infrastructure
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

export const BOOTSTRAP_COMMAND_DESCRIPTION = 'Initialize Terraform state backend infrastructure (storage, resource group)';

export async function bootstrapCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Initialize Terraform State Backend Infrastructure

Creates the foundational infrastructure needed for Terraform remote state management:
- Resource group for Terraform state
- Storage account for state files
- Container for state storage
- Management lock to prevent accidental deletion

Note: This is separate from application data seeding (npm run bootstrap).

USAGE:
  terraform-cli state-backend <environment> [options]

ARGUMENTS:
  environment     Target environment (dev, test, prod)

OPTIONS:
  --dry-run       Preview what will be created
  --force         Skip confirmations
  --help          Show this help message

EXAMPLES:
  # Setup state backend for dev environment
  terraform-cli state-backend dev

  # Preview state backend setup
  terraform-cli state-backend dev --dry-run

  # Setup without confirmation
  terraform-cli state-backend dev --force
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
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

  logger.section('STATE BACKEND SETUP');

  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be made', 'state-backend');
  }

  // Show what will be created
  console.log('\nState Backend Setup Plan:');
  console.log('  1. Create resource group for Terraform state');
  console.log('  2. Create storage account for state files');
  console.log('  3. Create container for state storage');
  console.log('  4. Apply management lock to prevent deletion');

  // Confirm setup
  if (!force && !dryRun) {
    const confirmed = await confirmAction('Proceed with state backend setup?');
    if (!confirmed) {
      logger.info('State backend setup cancelled', 'state-backend');
      return;
    }
  }

  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment);

  try {
    logger.section('INITIALIZING STATE BACKEND');

    const bootstrapPath = 'state-backend';

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
      logger.success('State backend infrastructure created');

      // Get outputs
      logger.section('STATE BACKEND OUTPUTS');
      try {
        const outputs = await terraform.getOutput(bootstrapPath);
        console.log('\nState backend outputs:');
        for (const [key, value] of Object.entries(outputs)) {
          console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
      } catch (error: any) {
        logger.warn(`Failed to retrieve outputs: ${error.message}`, 'state-backend');
      }
    } else {
      logger.info('[DRY RUN] Would create state backend infrastructure', 'state-backend');
    }

    logger.success('State backend setup completed successfully');
  } catch (error: any) {
    logger.failure(`State backend setup failed: ${error.message}`);
    throw error;
  }
}

