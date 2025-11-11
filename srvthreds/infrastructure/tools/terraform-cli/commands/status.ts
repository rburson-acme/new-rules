/**
 * Status command - Check deployment status
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { requireString, ValidationError } from '../../shared/error-handler.js';
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

export async function statusCommand(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Check deployment status

Shows the current state of infrastructure including:
- Deployed stacks and their resources
- Terraform state information
- Azure resource group status

USAGE:
  terraform-cli status <environment> [stacks...]

ARGUMENTS:
  environment     Target environment (dev, test, prod)
  stacks          Specific stacks to check (optional, checks all if not specified)

OPTIONS:
  --help          Show this help message

EXAMPLES:
  # Check status of all stacks
  terraform-cli status dev

  # Check status of specific stacks
  terraform-cli status dev networking keyvault
`);
    return;
  }

  const environment = requireString(args[0], 'environment');
  const requestedStacks = args.slice(1).filter((a) => !a.startsWith('--'));

  // Load configuration
  const configDir = path.join(__dirname, '../../..', 'shared', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'status');

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

  const stacksToCheck = requestedStacks.length > 0
    ? deployConfig.stacks.filter((s) => requestedStacks.includes(s.name))
    : deployConfig.stacks;

  logger.section('DEPLOYMENT STATUS');

  const terraformDir = path.join(__dirname, '../../..', 'cloud', 'terraform');
  const terraform = new TerraformManager(terraformDir, environment, envConfig);
  const azure = new AzureManager();

  try {
    // Check Azure resource group
    logger.section('AZURE RESOURCES');
    let resources: any[] = [];
    try {
      resources = await azure.listResources(envConfig.resourceGroupName);
      console.log(`\nResource Group: ${envConfig.resourceGroupName}`);
      console.log(`Total Resources: ${resources.length}\n`);

      // Group by type
      const byType = new Map<string, number>();
      for (const resource of resources) {
        const type = resource.type;
        byType.set(type, (byType.get(type) || 0) + 1);
      }

      for (const [type, count] of byType) {
        console.log(`  ${type}: ${count}`);
      }
    } catch (error: any) {
      logger.warn(`Failed to list Azure resources: ${error.message}`, 'status');
    }

    // Check Terraform state for each stack
    logger.section('TERRAFORM STATE');
    console.log('');

    let totalStateResources = 0;
    let stacksWithState = 0;
    let stacksWithDrift = 0;

    for (const stack of stacksToCheck) {
      try {
        // Initialize to ensure we're connected to remote backend
        await terraform.init(stack.path, { verbose: false });

        const state = await terraform.showState(stack.path);
        const resourceCount = state.resources?.length || 0;
        const outputCount = Object.keys(state.outputs || {}).length;
        totalStateResources += resourceCount;

        if (resourceCount > 0) {
          stacksWithState++;
        }

        console.log(`${stack.name}:`);
        console.log(`  Resources: ${resourceCount}`);
        console.log(`  Outputs: ${outputCount}`);
        console.log(`  Terraform: ${state.terraform_version}`);
        console.log('');
      } catch (error: any) {
        console.log(`${stack.name}:`);
        console.log(`  Status: Not deployed or state unavailable`);
        console.log(`  Error: ${error.message}`);
        console.log('');
      }
    }

    // Drift detection summary
    logger.section('DRIFT DETECTION');
    const azureResourceCount = resources.length;

    // Critical drift: Azure has resources but Terraform state is empty
    if (azureResourceCount > 0 && totalStateResources === 0) {
      logger.warn('⚠️  CRITICAL DRIFT DETECTED', 'status');
      console.log('');
      console.log(`  Azure Resources:     ${azureResourceCount}`);
      console.log(`  Terraform State:     ${totalStateResources}`);
      console.log('');
      console.log('  🔴 Resources exist in Azure but Terraform state is empty!');
      console.log('');
      console.log('  This indicates:');
      console.log('    - State file may be missing or corrupted');
      console.log('    - Resources were created outside of Terraform');
      console.log('    - State backend configuration issue');
      console.log('');
      console.log('  Recommended actions:');
      console.log('    1. Verify state backend is accessible');
      console.log('    2. Check if state files exist in storage account');
      console.log('    3. Run: terraform-cli state validate dev');
      console.log('    4. Consider: terraform-cli state repair dev [stack]');
      console.log('');
      stacksWithDrift = stacksToCheck.length;
    }
    // Expected: Terraform tracks more resources than Azure Resource Graph shows
    // Azure shows top-level resources, Terraform tracks all including child resources
    else if (totalStateResources > azureResourceCount && stacksWithState > 0) {
      logger.success('✅ No drift detected', 'status');
      console.log('');
      console.log(`  Azure Resources (top-level):  ${azureResourceCount}`);
      console.log(`  Terraform State (all):        ${totalStateResources}`);
      console.log('');
      console.log('  ℹ️  Terraform tracks more resources than Azure Resource Graph');
      console.log('      This is expected - Terraform includes child resources like');
      console.log('      subnets, NSG associations, and DNS records.');
      console.log('');
      console.log('  💡 To check for configuration drift, run:');
      console.log('      terraform-cli plan dev [stack]');
      console.log('');
    }
    // Unexpected: Azure has more resources than Terraform knows about
    else if (azureResourceCount > totalStateResources) {
      logger.warn('⚠️  POTENTIAL DRIFT DETECTED', 'status');
      console.log('');
      console.log(`  Azure Resources:     ${azureResourceCount}`);
      console.log(`  Terraform State:     ${totalStateResources}`);
      console.log(`  Difference:          ${azureResourceCount - totalStateResources}`);
      console.log('');
      console.log('  🟡 Azure has more resources than Terraform state');
      console.log('');
      console.log('  This may indicate:');
      console.log('    - Resources created outside Terraform');
      console.log('    - Manual changes in Azure Portal');
      console.log('    - Resources not imported into state');
      console.log('');
      console.log('  Recommended actions:');
      console.log('    1. Run: terraform-cli plan dev [stack]');
      console.log('    2. Review what Terraform wants to change');
      console.log('    3. If needed: terraform-cli state repair dev [stack]');
      console.log('');
    }
    // Perfect match (rare but possible)
    else if (totalStateResources > 0 && azureResourceCount === totalStateResources) {
      logger.success('✅ Perfect alignment - Resource counts match', 'status');
      console.log('');
      console.log(`  Azure Resources:     ${azureResourceCount}`);
      console.log(`  Terraform State:     ${totalStateResources}`);
      console.log('');
      console.log('  💡 To check for configuration drift, run:');
      console.log('      terraform-cli plan dev [stack]');
      console.log('');
    }
    // No resources deployed
    else {
      logger.info('ℹ️  No resources deployed', 'status');
      console.log('');
    }

    // Summary
    logger.section('SUMMARY');
    console.log(`Environment: ${environment}`);
    console.log(`Stacks checked: ${stacksToCheck.length}`);
    console.log(`Stacks with state: ${stacksWithState}`);
    console.log(`Resource group: ${envConfig.resourceGroupName}`);
    if (stacksWithDrift > 0) {
      console.log(`\n⚠️  ${stacksWithDrift} stack(s) have drift - action required!`);
    }
  } catch (error: any) {
    logger.failure(`Status check failed: ${error.message}`);
    throw error;
  }
}

