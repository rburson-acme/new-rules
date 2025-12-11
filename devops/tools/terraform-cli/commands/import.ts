/**
 * Import command - Import existing Azure resources into Terraform state
 *
 * Migrated from: terraform/scripts/import-resource.sh
 *
 * Supports two modes:
 * 1. Simple: Auto-constructs Azure resource ID from config (subscription, resource group)
 * 2. Full: Pass complete Azure resource ID for complex cases
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { execCommand } from '../../shared/shell.js';
import { ValidationError, ExecutionError, confirmAction } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const IMPORT_COMMAND_DESCRIPTION = 'Import existing Azure resource into Terraform state';

const CONTEXT = 'import';

interface EnvironmentConfig {
  subscriptionId: string;
  resourceGroupName: string;
  stateBackendResourceGroup: string;
  stateBackendStorageAccount: string;
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}

// Map Terraform resource types to Azure provider paths
const AZURE_PROVIDER_MAP: Record<string, string> = {
  azurerm_cosmosdb_account: 'Microsoft.DocumentDB/databaseAccounts',
  azurerm_key_vault: 'Microsoft.KeyVault/vaults',
  azurerm_container_registry: 'Microsoft.ContainerRegistry/registries',
  azurerm_redis_cache: 'Microsoft.Cache/redis',
  azurerm_kubernetes_cluster: 'Microsoft.ContainerService/managedClusters',
  azurerm_storage_account: 'Microsoft.Storage/storageAccounts',
  azurerm_servicebus_namespace: 'Microsoft.ServiceBus/namespaces',
  azurerm_application_gateway: 'Microsoft.Network/applicationGateways',
  azurerm_log_analytics_workspace: 'Microsoft.OperationalInsights/workspaces',
  azurerm_resource_group: 'Microsoft.Resources/resourceGroups',
  azurerm_virtual_network: 'Microsoft.Network/virtualNetworks',
  azurerm_subnet: 'Microsoft.Network/virtualNetworks/subnets',
  azurerm_network_security_group: 'Microsoft.Network/networkSecurityGroups',
  azurerm_public_ip: 'Microsoft.Network/publicIPAddresses',
};

const COMMON_RESOURCE_TYPES = Object.keys(AZURE_PROVIDER_MAP);

export async function importCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    if (args.length === 0 && !args.includes('--help')) {
      throw new ValidationError('Missing required arguments: <stack> <resource-type> <terraform-name> <azure-name>');
    }
    return;
  }

  const dryRun = args.includes('--dry-run');
  const useFullId = args.includes('--full-id');
  const filteredArgs = args.filter((a) => !a.startsWith('--'));

  if (filteredArgs.length < 4) {
    throw new ValidationError(
      'Missing required arguments: <stack> <resource-type> <terraform-name> <azure-name|azure-resource-id>',
    );
  }

  const [stack, resourceType, terraformName, azureNameOrId] = filteredArgs;
  const environment = process.env.ENVIRONMENT || 'dev';

  // Load environment config
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, CONTEXT);
  const environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
  const envConfig = environmentsConfig[environment];

  if (!envConfig) {
    throw new ValidationError(
      `Environment '${environment}' not found in config. Valid: ${Object.keys(environmentsConfig).join(', ')}`,
    );
  }

  await runImport(stack, resourceType, terraformName, azureNameOrId, environment, envConfig, dryRun, useFullId);
}

async function runImport(
  stack: string,
  resourceType: string,
  terraformName: string,
  azureNameOrId: string,
  environment: string,
  envConfig: EnvironmentConfig,
  dryRun: boolean,
  useFullId: boolean,
): Promise<void> {
  logger.section(`IMPORT RESOURCE: ${stack}`);

  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const stacksDir = path.join(terraformDir, 'stacks');
  const stackDir = path.join(stacksDir, stack);

  // Validate stack exists
  if (!fs.existsSync(stackDir)) {
    throw new ValidationError(`Stack '${stack}' not found in ${stacksDir}`);
  }

  // Ensure resource type has azurerm_ prefix
  const fullResourceType = resourceType.startsWith('azurerm_') ? resourceType : `azurerm_${resourceType}`;

  // Determine Azure resource ID
  let resourceId: string;
  if (useFullId || azureNameOrId.startsWith('/subscriptions/')) {
    // Full Azure resource ID provided
    resourceId = azureNameOrId;
    logger.info('Using provided Azure resource ID', CONTEXT);
  } else {
    // Construct resource ID from config
    resourceId = constructAzureResourceId(
      fullResourceType,
      azureNameOrId,
      envConfig.subscriptionId,
      envConfig.resourceGroupName,
    );
    logger.info('Constructed Azure resource ID from config', CONTEXT);
  }

  // Determine Terraform resource address
  const terraformAddress = determineTerraformAddress(stackDir, stack, fullResourceType, terraformName);

  // Display import details
  logger.info(`Stack: ${stack}`, CONTEXT);
  logger.info(`Resource Type: ${fullResourceType}`, CONTEXT);
  logger.info(`Terraform Name: ${terraformName}`, CONTEXT);
  logger.info(`Azure Resource ID: ${resourceId}`, CONTEXT);
  logger.info(`Terraform Address: ${terraformAddress}`, CONTEXT);
  logger.info(`Environment: ${environment}`, CONTEXT);
  console.log('');

  // Check for tfvars file
  const tfvarsFile = path.join(stackDir, `${environment}.tfvars`);
  if (!fs.existsSync(tfvarsFile)) {
    throw new ValidationError(`Variables file not found: ${tfvarsFile}`);
  }

  if (dryRun) {
    logger.warn('[DRY RUN] No changes will be made', CONTEXT);
    console.log('');
    logger.info('Would execute:', CONTEXT);
    console.log(`  cd ${stackDir}`);
    console.log(`  terraform import -var-file="${environment}.tfvars" "${terraformAddress}" "${resourceId}"`);
    console.log('');
    return;
  }

  // Confirm before import
  console.log('');
  const confirmed = await confirmAction('Proceed with import?');
  if (!confirmed) {
    logger.warn('Import cancelled', CONTEXT);
    return;
  }

  // Perform import
  logger.info('Importing resource...', CONTEXT);

  const importResult = execCommand(
    `terraform import -var-file="${environment}.tfvars" "${terraformAddress}" "${resourceId}"`,
    { cwd: stackDir, context: CONTEXT, verbose: true },
  );

  if (!importResult.success) {
    throw new ExecutionError(`Import failed: ${importResult.stderr}`);
  }

  logger.success('Resource imported successfully', CONTEXT);

  // Verify import
  logger.info('Verifying import...', CONTEXT);

  const verifyResult = execCommand(`terraform state show "${terraformAddress}"`, { cwd: stackDir, context: CONTEXT });

  if (verifyResult.success) {
    logger.success('Resource is now in Terraform state', CONTEXT);
    console.log('');
    logger.info('Next steps:', CONTEXT);
    console.log(`  1. Review the imported resource:`);
    console.log(`     terraform state show ${terraformAddress}`);
    console.log(`  2. Update Terraform configuration to match Azure resource`);
    console.log(`  3. Run: terraform plan to verify no changes needed`);
    console.log(`  4. Commit changes to version control`);
  } else {
    logger.warn('Could not verify imported resource', CONTEXT);
  }

  console.log('');
  logger.success('Import complete');
}

/**
 * Constructs an Azure resource ID from components using the provider map
 */
function constructAzureResourceId(
  resourceType: string,
  azureName: string,
  subscriptionId: string,
  resourceGroup: string,
): string {
  const providerPath = AZURE_PROVIDER_MAP[resourceType];

  if (!providerPath) {
    throw new ValidationError(
      `Unknown resource type: ${resourceType}. Use --full-id flag to provide complete Azure resource ID.\n` +
        `Supported types: ${Object.keys(AZURE_PROVIDER_MAP).join(', ')}`,
    );
  }

  // Special case: resource groups don't have a resource group in their path
  if (resourceType === 'azurerm_resource_group') {
    return `/subscriptions/${subscriptionId}/resourceGroups/${azureName}`;
  }

  return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/${providerPath}/${azureName}`;
}

function determineTerraformAddress(
  stackDir: string,
  stack: string,
  resourceType: string,
  resourceName: string,
): string {
  const mainTfPath = path.join(stackDir, 'main.tf');

  if (fs.existsSync(mainTfPath)) {
    const mainTfContent = fs.readFileSync(mainTfPath, 'utf-8');

    // Check if this is a module reference
    if (mainTfContent.includes(`module "${resourceName}"`)) {
      return `module.${resourceName}.${resourceType}.main`;
    }

    // Check for direct resource definition
    if (mainTfContent.includes(`resource "${resourceType}" "${resourceName}"`)) {
      return `${resourceType}.${resourceName}`;
    }

    // Check if there's a module with the stack name
    if (mainTfContent.includes(`module "${stack}"`)) {
      return `module.${stack}.${resourceType}.main`;
    }
  }

  // Default: assume module-based structure with "main" as resource name
  return `module.${stack}.${resourceType}.main`;
}

function printHelp(): void {
  console.log(`
Import existing Azure resource into Terraform state

USAGE:
  terraform-cli import <stack> <resource-type> <terraform-name> <azure-name> [options]

ARGUMENTS:
  stack           Terraform stack name (e.g., cosmosdb, keyvault, aks)
  resource-type   Azure resource type (with or without azurerm_ prefix)
  terraform-name  Terraform resource name or module name
  azure-name      Azure resource name (subscription/RG auto-resolved from config)

OPTIONS:
  --dry-run       Show what would be imported without making changes
  --full-id       Treat <azure-name> as a complete Azure resource ID
  --help          Show this help message

ENVIRONMENT VARIABLES:
  ENVIRONMENT     Target environment (default: dev)

DESCRIPTION:
  This command imports an existing Azure resource into Terraform state.

  Subscription ID and resource group are automatically resolved from
  configs/terraform/environments.json based on the ENVIRONMENT variable.

  Use this when:
  - Azure resources were created outside of Terraform
  - Terraform state was lost or corrupted
  - Migrating from manual resource management to IaC

  The command will:
  1. Validate the stack exists
  2. Construct the Azure resource ID from config (or use provided full ID)
  3. Determine the correct Terraform resource address
  4. Execute terraform import
  5. Verify the import was successful

SUPPORTED RESOURCE TYPES:
${COMMON_RESOURCE_TYPES.map((t) => `  - ${t}`).join('\n')}

EXAMPLES:
  # Import a Cosmos DB account (simple - subscription/RG from config)
  npm run tf:import -- cosmosdb cosmosdb_account main mycosmosdb-dev

  # Import a Key Vault (dry run)
  npm run tf:import -- keyvault key_vault main mykv-dev --dry-run

  # Import to prod environment
  ENVIRONMENT=prod npm run tf:import -- aks kubernetes_cluster main myaks-prod

  # Import with full Azure resource ID (for unsupported types or custom RGs)
  npm run tf:import -- cosmosdb cosmosdb_account main \\
    "/subscriptions/xxx/resourceGroups/custom-rg/providers/Microsoft.DocumentDB/databaseAccounts/mydb" \\
    --full-id

NOTES:
  - If <azure-name> starts with "/subscriptions/", it's automatically treated as a full ID
  - Use --full-id flag for resource types not in the supported list
  - The resource group used is from environments.json for the target environment
`);
}
