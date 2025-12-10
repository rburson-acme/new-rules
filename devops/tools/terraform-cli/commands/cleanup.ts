/**
 * Cleanup command - Cleanup infrastructure and state with soft-delete handling
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError, confirmDestructiveAction } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';
import { TerraformManager, EnvironmentConfig } from '../utils/terraform.js';
import { AzureManager } from '../utils/azure.js';

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

interface EnvironmentConfigWithRG extends EnvironmentConfig {
  resourceGroupName: string;
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfigWithRG;
}

export const CLEANUP_COMMAND_DESCRIPTION = 'Cleanup infrastructure and state (with soft-delete handling)';

export async function cleanupCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Cleanup infrastructure and state (with soft-delete handling)

USAGE:
  terraform-cli cleanup <environment> [options]

ARGUMENTS:
  environment     Target environment (dev, test, prod)

OPTIONS:
  --dry-run       Preview what will be deleted
  --force         Skip confirmations (use with caution!)
  --help          Show this help message

EXAMPLES:
  # Preview cleanup
  terraform-cli cleanup dev --dry-run

  # Cleanup with confirmation
  terraform-cli cleanup dev

  # Cleanup without confirmation
  terraform-cli cleanup dev --force
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  // Load configurations
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'cleanup');

  let deployConfig: DeployConfig;
  let envConfig: EnvironmentConfigWithRG;

  try {
    deployConfig = configLoader.loadConfig<DeployConfig>('stacks.json');
    const environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
    envConfig = environmentsConfig[environment];
  } catch (error: any) {
    throw new ValidationError(`Failed to load configuration: ${error.message}`);
  }

  if (!envConfig) {
    throw new ValidationError(`Environment configuration not found for: ${environment}`);
  }

  // Validate environment
  if (!deployConfig.environments.includes(environment)) {
    throw new ValidationError(
      `Invalid environment: ${environment}. Valid options: ${deployConfig.environments.join(', ')}`,
    );
  }

  logger.section('CLEANUP INFRASTRUCTURE');

  if (dryRun) {
    logger.warn('DRY RUN MODE - No changes will be made', 'cleanup');
  }

  // Show what will be deleted
  console.log('\nCleanup Plan:');
  console.log(`  1. Destroy all Terraform stacks (${deployConfig.stacks.length} stacks)`);
  console.log(`  2. Delete Terraform state files`);
  console.log(`  3. Purge soft-deleted Key Vaults (90-day retention)`);
  console.log(`  4. Purge soft-deleted Storage Accounts (7-day retention)`);
  console.log(`  5. Delete resource group: ${envConfig.resourceGroupName}`);
  console.log(`  6. Delete bootstrap infrastructure`);

  // Confirm cleanup
  if (!force && !dryRun) {
    const confirmed = await confirmDestructiveAction(
      'This will DELETE ALL infrastructure and state files!',
      'DELETE EVERYTHING',
    );

    if (!confirmed) {
      logger.info('Cleanup cancelled', 'cleanup');
      return;
    }
  }

  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);
  const azure = new AzureManager();

  try {
    // Step 1: Destroy stacks in reverse order
    logger.section('STEP 1: DESTROYING STACKS');
    const stacksInReverseOrder = [...deployConfig.stacks].reverse();

    for (const stack of stacksInReverseOrder) {
      try {
        await terraform.destroy(stack.path, { dryRun });
        logger.success(`Destroyed ${stack.name}`);
      } catch (error: any) {
        logger.warn(`Failed to destroy ${stack.name}: ${error.message}`, 'cleanup');
      }
    }

    // Step 2: Delete state files
    logger.section('STEP 2: DELETING STATE FILES');
    if (!dryRun) {
      deleteStateFiles(terraformDir, environment);
    } else {
      logger.info('[DRY RUN] Would delete state files', 'cleanup');
    }

    // Step 3: Purge soft-deleted resources
    logger.section('STEP 3: PURGING SOFT-DELETED RESOURCES');
    if (!dryRun) {
      await purgeSoftDeletedResources(azure);
    } else {
      logger.info('[DRY RUN] Would purge soft-deleted resources', 'cleanup');
    }

    // Step 4: Delete resource group
    logger.section('STEP 4: DELETING RESOURCE GROUP');
    if (!dryRun) {
      try {
        await azure.deleteResourceGroup(envConfig.resourceGroupName);
        logger.success(`Deleted resource group ${envConfig.resourceGroupName}`);
      } catch (error: any) {
        logger.warn(`Failed to delete resource group: ${error.message}`, 'cleanup');
      }
    } else {
      logger.info(`[DRY RUN] Would delete resource group ${envConfig.resourceGroupName}`, 'cleanup');
    }

    // Step 5: Cleanup bootstrap
    logger.section('STEP 5: CLEANING UP BOOTSTRAP');
    if (!dryRun) {
      await cleanupBootstrap(terraformDir, terraform, azure, envConfig);
    } else {
      logger.info('[DRY RUN] Would cleanup bootstrap infrastructure', 'cleanup');
    }

    logger.success('Cleanup completed successfully');
  } catch (error: any) {
    logger.failure(`Cleanup failed: ${error.message}`);
    throw error;
  }
}

function deleteStateFiles(terraformDir: string, environment: string): void {
  logger.info('Deleting Terraform state files', 'cleanup');

  const stateDir = terraformDir;
  const pattern = new RegExp(`terraform\\.${environment}\\.tfstate`);

  function deleteRecursive(dir: string): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        deleteRecursive(filePath);
      } else if (pattern.test(file)) {
        fs.unlinkSync(filePath);
        logger.debug(`Deleted ${filePath}`, 'cleanup');
      }
    }
  }

  deleteRecursive(stateDir);
  logger.success('State files deleted');
}

async function purgeSoftDeletedResources(azure: AzureManager): Promise<void> {
  logger.info('Purging soft-deleted resources', 'cleanup');

  // Purge Key Vaults
  const deletedKVs = await azure.listDeletedKeyVaults();
  for (const kv of deletedKVs) {
    try {
      const location = kv.id.split('/')[4]; // Extract location from ID
      await azure.purgeKeyVault(kv.name, location);
      logger.success(`Purged Key Vault ${kv.name}`);
    } catch (error: any) {
      logger.warn(`Failed to purge Key Vault ${kv.name}: ${error.message}`, 'cleanup');
    }
  }

  // Purge Storage Accounts
  const deletedSAs = await azure.listDeletedStorageAccounts();
  for (const sa of deletedSAs) {
    try {
      const resourceGroup = sa.id.split('/')[4]; // Extract RG from ID
      await azure.purgeStorageAccount(sa.name, resourceGroup);
      logger.success(`Purged Storage Account ${sa.name}`);
    } catch (error: any) {
      logger.warn(`Failed to purge Storage Account ${sa.name}: ${error.message}`, 'cleanup');
    }
  }
}

async function cleanupBootstrap(
  _terraformDir: string,
  terraform: TerraformManager,
  azure: AzureManager,
  envConfig: EnvironmentConfig,
): Promise<void> {
  logger.info('Cleaning up state backend infrastructure', 'cleanup');

  try {
    // Remove management lock
    const locks = await azure.listLocks(envConfig.stateBackendResourceGroup);
    for (const lock of locks) {
      try {
        await azure.deleteLock(lock.name, envConfig.stateBackendResourceGroup);
        logger.success(`Removed lock ${lock.name}`);
      } catch (error: any) {
        logger.warn(`Failed to remove lock: ${error.message}`, 'cleanup');
      }
    }

    // Destroy bootstrap
    const bootstrapPath = 'bootstrap';
    await terraform.destroy(bootstrapPath);
    logger.success('Destroyed bootstrap infrastructure');
  } catch (error: any) {
    logger.warn(`Failed to cleanup bootstrap: ${error.message}`, 'cleanup');
  }
}
