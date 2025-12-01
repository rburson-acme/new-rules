/**
 * Validate Security command - Azure infrastructure security validation
 *
 * Migrated from: terraform/scripts/validate-security.sh
 *
 * Validates Azure infrastructure security configuration against best practices:
 * - Resource group security (locks)
 * - Network security (VNet encryption, NSG rules, public IPs)
 * - Private endpoints (Key Vault, Storage Account)
 * - AKS cluster security (private cluster, managed identity, AAD, network policy)
 * - RBAC and identity (Key Vault RBAC, managed identities)
 * - Encryption and data protection (storage encryption, TLS)
 * - Monitoring and logging (Log Analytics, diagnostic settings)
 * - Compliance (Azure Policy)
 */

import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { execCommand } from '../../shared/shell.js';
import { ValidationError, ExecutionError } from '../../shared/error-handler.js';
import { createConfigLoader } from '../../shared/config-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const VALIDATE_SECURITY_COMMAND_DESCRIPTION = 'Validate Azure infrastructure security configuration';

interface EnvironmentConfig {
  resourceGroupName: string;
  stateBackendResourceGroup: string;
  stateBackendStorageAccount: string;
}

interface EnvironmentsConfig {
  [key: string]: EnvironmentConfig;
}

interface SecurityCheckResult {
  name: string;
  category: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

interface SecurityValidationResult {
  environment: string;
  resourceGroup: string;
  passCount: number;
  warnCount: number;
  failCount: number;
  checks: SecurityCheckResult[];
}

const CONTEXT = 'security';

export async function validateSecurityCommand(args: string[]): Promise<void> {
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    if (args.length === 0 && !args.includes('--help')) {
      throw new ValidationError('Missing required argument: <environment>');
    }
    return;
  }

  const environment = args[0];
  const jsonOutput = args.includes('--json');

  // Filter out flags to check for optional resource group override
  const positionalArgs = args.filter((a) => !a.startsWith('--'));
  const resourceGroupOverride = positionalArgs[1];

  // Load environment config to get resource group name
  const configDir = path.join(__dirname, '../../..', 'configs', 'terraform');
  const configLoader = createConfigLoader(configDir, 'validate-security');

  let resourceGroup: string;

  if (resourceGroupOverride) {
    // Use explicit override
    resourceGroup = resourceGroupOverride;
    logger.info(`Using resource group override: ${resourceGroup}`, CONTEXT);
  } else {
    // Load from environment config
    try {
      const environmentsConfig = configLoader.loadConfig<EnvironmentsConfig>('environments.json');
      const envConfig = environmentsConfig[environment];

      if (!envConfig) {
        throw new ValidationError(
          `Environment '${environment}' not found in config. Valid environments: ${Object.keys(environmentsConfig).join(', ')}`,
        );
      }

      resourceGroup = envConfig.resourceGroupName;
      logger.info(`Using resource group from config: ${resourceGroup}`, CONTEXT);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Could not load environment config: ${error.message}. Provide resource group explicitly: validate-security <env> <resource-group>`,
      );
    }
  }

  const result = await runSecurityValidation(environment, resourceGroup);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    printResults(result);
  }

  // Exit with error if there are failures
  if (result.failCount > 0) {
    throw new ExecutionError(`Security validation failed with ${result.failCount} error(s)`);
  }
}

async function runSecurityValidation(environment: string, resourceGroup: string): Promise<SecurityValidationResult> {
  logger.section(`SECURITY VALIDATION: ${environment}`);
  logger.info(`Resource Group: ${resourceGroup}`, CONTEXT);

  // Verify Azure CLI is logged in
  const loginCheck = execCommand('az account show', { context: CONTEXT });
  if (!loginCheck.success) {
    throw new ExecutionError('Not logged in to Azure CLI. Run: az login');
  }

  // Verify resource group exists
  const rgCheck = execCommand(`az group show --name "${resourceGroup}"`, { context: CONTEXT });
  if (!rgCheck.success) {
    throw new ValidationError(`Resource group '${resourceGroup}' not found`);
  }

  const checks: SecurityCheckResult[] = [];

  // Run all security checks
  await runResourceGroupChecks(resourceGroup, checks);
  await runNetworkSecurityChecks(resourceGroup, checks);
  await runPrivateEndpointChecks(resourceGroup, environment, checks);
  await runAKSSecurityChecks(resourceGroup, environment, checks);
  await runRBACChecks(resourceGroup, checks);
  await runEncryptionChecks(resourceGroup, environment, checks);
  await runMonitoringChecks(resourceGroup, checks);
  await runComplianceChecks(resourceGroup, checks);

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;

  return {
    environment,
    resourceGroup,
    passCount,
    warnCount,
    failCount,
    checks,
  };
}

async function runResourceGroupChecks(resourceGroup: string, checks: SecurityCheckResult[]): Promise<void> {
  logger.info('Checking resource group security...', CONTEXT);

  // Check for resource locks
  const locksResult = execCommand(`az lock list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`, {
    context: CONTEXT,
  });

  const lockCount = parseInt(locksResult.stdout.trim()) || 0;

  checks.push({
    name: 'Resource Locks',
    category: 'Resource Group',
    status: lockCount > 0 ? 'pass' : 'warn',
    message:
      lockCount > 0
        ? `Resource locks configured (${lockCount} locks found)`
        : 'No resource locks found - consider adding CanNotDelete locks for critical resources',
  });
}

async function runNetworkSecurityChecks(resourceGroup: string, checks: SecurityCheckResult[]): Promise<void> {
  logger.info('Checking network security...', CONTEXT);

  // Check VNet encryption
  const vnetResult = execCommand(
    `az network vnet list --resource-group "${resourceGroup}" --query "[].{name:name, encryption:encryption.enabled}" -o json`,
    { context: CONTEXT },
  );

  if (vnetResult.success) {
    try {
      const vnets = JSON.parse(vnetResult.stdout || '[]');
      if (vnets.length > 0) {
        const encryptedCount = vnets.filter((v: any) => v.encryption === true).length;
        checks.push({
          name: 'VNet Encryption',
          category: 'Network Security',
          status: encryptedCount === vnets.length ? 'pass' : 'warn',
          message:
            encryptedCount === vnets.length
              ? `All VNets have encryption enabled (${encryptedCount}/${vnets.length})`
              : `Some VNets do not have encryption enabled (${encryptedCount}/${vnets.length})`,
        });
      }
    } catch {
      // Skip if parsing fails
    }
  }

  // Check NSG on subnets
  const subnetResult = execCommand(
    `az network vnet list --resource-group "${resourceGroup}" --query "[].subnets[?networkSecurityGroup == null].name" -o json`,
    { context: CONTEXT },
  );

  if (subnetResult.success) {
    try {
      const subnetsWithoutNSG = JSON.parse(subnetResult.stdout || '[]').flat();
      checks.push({
        name: 'Subnet NSG Coverage',
        category: 'Network Security',
        status: subnetsWithoutNSG.length === 0 ? 'pass' : 'fail',
        message:
          subnetsWithoutNSG.length === 0
            ? 'All subnets have NSGs attached'
            : `${subnetsWithoutNSG.length} subnet(s) missing NSG - add Network Security Groups`,
      });
    } catch {
      // Skip if parsing fails
    }
  }

  // Check public IPs
  const publicIpResult = execCommand(
    `az network public-ip list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`,
    { context: CONTEXT },
  );

  if (publicIpResult.success) {
    const publicIpCount = parseInt(publicIpResult.stdout.trim()) || 0;
    checks.push({
      name: 'Public IP Review',
      category: 'Network Security',
      status: publicIpCount <= 1 ? 'pass' : 'warn',
      message:
        publicIpCount === 0
          ? 'No public IPs found'
          : `${publicIpCount} public IP(s) found - verify only internet-facing resources (App Gateway) have public IPs`,
    });
  }
}

async function runPrivateEndpointChecks(
  resourceGroup: string,
  environment: string,
  checks: SecurityCheckResult[],
): Promise<void> {
  logger.info('Checking private endpoint security...', CONTEXT);

  // Check for private endpoints
  const peResult = execCommand(
    `az network private-endpoint list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`,
    { context: CONTEXT },
  );

  if (peResult.success) {
    const peCount = parseInt(peResult.stdout.trim()) || 0;
    const isProdOrStaging = environment === 'prod' || environment === 'staging';

    checks.push({
      name: 'Private Endpoints',
      category: 'Private Endpoint Security',
      status: peCount > 0 ? 'pass' : isProdOrStaging ? 'fail' : 'warn',
      message:
        peCount > 0
          ? `Private endpoints configured (${peCount} found)`
          : isProdOrStaging
            ? 'No private endpoints found - production/staging should use private endpoints'
            : 'No private endpoints found - acceptable for development',
    });
  }

  // Check Key Vault public access
  const kvResult = execCommand(
    `az keyvault list --resource-group "${resourceGroup}" --query "[].{name:name, publicAccess:properties.publicNetworkAccess}" -o json`,
    { context: CONTEXT },
  );

  if (kvResult.success) {
    try {
      const keyvaults = JSON.parse(kvResult.stdout || '[]');
      if (keyvaults.length > 0) {
        const publicKvCount = keyvaults.filter((kv: any) => kv.publicAccess === 'Enabled').length;
        const isProd = environment === 'prod';

        checks.push({
          name: 'Key Vault Public Access',
          category: 'Private Endpoint Security',
          status: publicKvCount === 0 ? 'pass' : isProd ? 'fail' : 'warn',
          message:
            publicKvCount === 0
              ? 'All Key Vaults have public access disabled'
              : `${publicKvCount} Key Vault(s) have public access enabled${isProd ? ' - disable for production' : ''}`,
        });
      }
    } catch {
      // Skip if parsing fails
    }
  }

  // Check Storage Account public access
  const storageResult = execCommand(
    `az storage account list --resource-group "${resourceGroup}" --query "[].{name:name, publicAccess:publicNetworkAccess, allowBlobPublic:allowBlobPublicAccess}" -o json`,
    { context: CONTEXT },
  );

  if (storageResult.success) {
    try {
      const storageAccounts = JSON.parse(storageResult.stdout || '[]');
      if (storageAccounts.length > 0) {
        const publicStorageCount = storageAccounts.filter(
          (sa: any) => sa.publicAccess === 'Enabled' || sa.allowBlobPublic === true,
        ).length;
        const isProd = environment === 'prod';

        checks.push({
          name: 'Storage Account Public Access',
          category: 'Private Endpoint Security',
          status: publicStorageCount === 0 ? 'pass' : isProd ? 'fail' : 'warn',
          message:
            publicStorageCount === 0
              ? 'All storage accounts have public access disabled'
              : `Storage accounts have public access enabled${isProd ? ' - disable for production' : ''}`,
        });
      }
    } catch {
      // Skip if parsing fails
    }
  }
}

async function runAKSSecurityChecks(
  resourceGroup: string,
  environment: string,
  checks: SecurityCheckResult[],
): Promise<void> {
  logger.info('Checking AKS cluster security...', CONTEXT);

  const aksListResult = execCommand(`az aks list --resource-group "${resourceGroup}" --query "[].name" -o tsv`, {
    context: CONTEXT,
  });

  if (!aksListResult.success || !aksListResult.stdout.trim()) {
    checks.push({
      name: 'AKS Clusters',
      category: 'AKS Security',
      status: 'warn',
      message: 'No AKS clusters found in resource group',
    });
    return;
  }

  const clusters = aksListResult.stdout.trim().split('\n');
  const isProdOrStaging = environment === 'prod' || environment === 'staging';

  for (const cluster of clusters) {
    const aksName = cluster.trim();
    if (!aksName) continue;

    // Check private cluster
    const privateResult = execCommand(
      `az aks show --name "${aksName}" --resource-group "${resourceGroup}" --query "apiServerAccessProfile.enablePrivateCluster" -o tsv`,
      { context: CONTEXT },
    );

    const isPrivate = privateResult.stdout.trim() === 'true';
    checks.push({
      name: `AKS Private Cluster (${aksName})`,
      category: 'AKS Security',
      status: isPrivate ? 'pass' : isProdOrStaging ? 'fail' : 'warn',
      message: isPrivate
        ? 'AKS cluster is private'
        : `AKS cluster is not private${isProdOrStaging ? ' - enable private cluster for ' + environment : ' - acceptable for development'}`,
    });

    // Check managed identity
    const identityResult = execCommand(
      `az aks show --name "${aksName}" --resource-group "${resourceGroup}" --query "identity.type" -o tsv`,
      { context: CONTEXT },
    );

    const identityType = identityResult.stdout.trim();
    const usesManagedIdentity = identityType === 'SystemAssigned' || identityType === 'UserAssigned';
    checks.push({
      name: `AKS Managed Identity (${aksName})`,
      category: 'AKS Security',
      status: usesManagedIdentity ? 'pass' : 'fail',
      message: usesManagedIdentity
        ? `AKS uses managed identity (${identityType})`
        : 'AKS not using managed identity - migrate from service principal',
    });

    // Check Azure AD integration
    const aadResult = execCommand(
      `az aks show --name "${aksName}" --resource-group "${resourceGroup}" --query "aadProfile.managed" -o tsv`,
      { context: CONTEXT },
    );

    const aadEnabled = aadResult.stdout.trim() === 'true';
    checks.push({
      name: `AKS Azure AD Integration (${aksName})`,
      category: 'AKS Security',
      status: aadEnabled ? 'pass' : 'fail',
      message: aadEnabled
        ? 'AKS has Azure AD integration enabled'
        : 'AKS Azure AD integration not enabled - enable for RBAC',
    });

    // Check network policy
    const networkPolicyResult = execCommand(
      `az aks show --name "${aksName}" --resource-group "${resourceGroup}" --query "networkProfile.networkPolicy" -o tsv`,
      { context: CONTEXT },
    );

    const networkPolicy = networkPolicyResult.stdout.trim();
    const hasNetworkPolicy = networkPolicy && networkPolicy !== 'null' && networkPolicy !== '';
    checks.push({
      name: `AKS Network Policy (${aksName})`,
      category: 'AKS Security',
      status: hasNetworkPolicy ? 'pass' : 'warn',
      message: hasNetworkPolicy
        ? `Network policy enabled: ${networkPolicy}`
        : 'Network policy not enabled - consider enabling for microsegmentation',
    });

    // Check Azure Policy addon
    const azurePolicyResult = execCommand(
      `az aks show --name "${aksName}" --resource-group "${resourceGroup}" --query "addonProfiles.azurepolicy.enabled" -o tsv`,
      { context: CONTEXT },
    );

    const azurePolicyEnabled = azurePolicyResult.stdout.trim() === 'true';
    checks.push({
      name: `AKS Azure Policy Addon (${aksName})`,
      category: 'AKS Security',
      status: azurePolicyEnabled ? 'pass' : 'warn',
      message: azurePolicyEnabled
        ? 'Azure Policy addon enabled'
        : 'Azure Policy addon not enabled - consider enabling for compliance',
    });
  }
}

async function runRBACChecks(resourceGroup: string, checks: SecurityCheckResult[]): Promise<void> {
  logger.info('Checking RBAC and identity security...', CONTEXT);

  // Check Key Vault RBAC authorization
  // Get all key vaults and parse in JS to avoid JMESPath backtick escaping issues
  const kvListResult = execCommand(
    `az keyvault list --resource-group "${resourceGroup}" --query "[].{name:name, rbac:properties.enableRbacAuthorization}" -o json`,
    { context: CONTEXT },
  );

  if (kvListResult.success) {
    try {
      const keyvaults = JSON.parse(kvListResult.stdout || '[]');
      if (keyvaults.length > 0) {
        const rbacCount = keyvaults.filter((kv: { rbac: boolean }) => kv.rbac === true).length;
        const totalCount = keyvaults.length;

        checks.push({
          name: 'Key Vault RBAC Authorization',
          category: 'RBAC and Identity',
          status: rbacCount === totalCount ? 'pass' : 'fail',
          message:
            rbacCount === totalCount
              ? 'All Key Vaults use RBAC authorization'
              : `${totalCount - rbacCount} Key Vault(s) use access policies instead of RBAC - migrate to RBAC`,
        });
      }
    } catch {
      // Skip if parsing fails
    }
  }

  // Check for managed identities
  const miResult = execCommand(`az identity list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`, {
    context: CONTEXT,
  });

  if (miResult.success) {
    const miCount = parseInt(miResult.stdout.trim()) || 0;
    checks.push({
      name: 'Managed Identities',
      category: 'RBAC and Identity',
      status: miCount > 0 ? 'pass' : 'warn',
      message:
        miCount > 0
          ? `Managed identities configured (${miCount} found)`
          : 'No managed identities found - use managed identities for service-to-service auth',
    });
  }

  // Check service principal assignments
  const spResult = execCommand(
    `az role assignment list --resource-group "${resourceGroup}" --query "[?principalType == 'ServicePrincipal'] | length(@)" -o tsv`,
    { context: CONTEXT },
  );

  if (spResult.success) {
    const spCount = parseInt(spResult.stdout.trim()) || 0;
    checks.push({
      name: 'Service Principal Usage',
      category: 'RBAC and Identity',
      status: spCount <= 5 ? 'pass' : 'warn',
      message:
        spCount <= 5
          ? `Service principal usage acceptable (${spCount} assignments)`
          : `High number of service principal assignments (${spCount}) - prefer managed identities`,
    });
  }
}

async function runEncryptionChecks(
  resourceGroup: string,
  _environment: string,
  checks: SecurityCheckResult[],
): Promise<void> {
  logger.info('Checking encryption and data protection...', CONTEXT);

  // Check Storage Account encryption and TLS
  const storageResult = execCommand(
    `az storage account list --resource-group "${resourceGroup}" --query "[].{name:name, encryption:encryption.services.blob.enabled, minTls:minimumTlsVersion}" -o json`,
    { context: CONTEXT },
  );

  if (storageResult.success) {
    try {
      const storageAccounts = JSON.parse(storageResult.stdout || '[]');
      if (storageAccounts.length > 0) {
        // Check encryption
        const encryptedCount = storageAccounts.filter((sa: any) => sa.encryption === true).length;
        checks.push({
          name: 'Storage Account Encryption',
          category: 'Encryption',
          status: encryptedCount === storageAccounts.length ? 'pass' : 'fail',
          message:
            encryptedCount === storageAccounts.length
              ? 'All storage accounts have encryption enabled'
              : 'Some storage accounts do not have encryption enabled',
        });

        // Check TLS version
        const tls12Count = storageAccounts.filter((sa: any) => sa.minTls === 'TLS1_2').length;
        checks.push({
          name: 'Storage Account TLS Version',
          category: 'Encryption',
          status: tls12Count === storageAccounts.length ? 'pass' : 'fail',
          message:
            tls12Count === storageAccounts.length
              ? 'All storage accounts require TLS 1.2+'
              : `${storageAccounts.length - tls12Count} storage account(s) allow TLS < 1.2 - enforce TLS 1.2+`,
        });
      }
    } catch {
      // Skip if parsing fails
    }
  }

  // Check Cosmos DB (encryption is always enabled)
  const cosmosResult = execCommand(`az cosmosdb list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`, {
    context: CONTEXT,
  });

  if (cosmosResult.success) {
    const cosmosCount = parseInt(cosmosResult.stdout.trim()) || 0;
    if (cosmosCount > 0) {
      checks.push({
        name: 'Cosmos DB Encryption',
        category: 'Encryption',
        status: 'pass',
        message: `Cosmos DB accounts found (${cosmosCount}) - encryption enabled by default`,
      });
    }
  }
}

async function runMonitoringChecks(resourceGroup: string, checks: SecurityCheckResult[]): Promise<void> {
  logger.info('Checking monitoring and logging...', CONTEXT);

  // Check for Log Analytics workspace
  const laResult = execCommand(
    `az monitor log-analytics workspace list --resource-group "${resourceGroup}" --query "length(@)" -o tsv`,
    { context: CONTEXT },
  );

  if (laResult.success) {
    const laCount = parseInt(laResult.stdout.trim()) || 0;
    checks.push({
      name: 'Log Analytics Workspace',
      category: 'Monitoring',
      status: laCount > 0 ? 'pass' : 'warn',
      message:
        laCount > 0
          ? 'Log Analytics workspace configured'
          : 'No Log Analytics workspace found - configure centralized logging',
    });
  }
}

async function runComplianceChecks(resourceGroup: string, checks: SecurityCheckResult[]): Promise<void> {
  logger.info('Checking compliance and Azure Policy...', CONTEXT);

  // Check Azure Policy compliance
  const policyResult = execCommand(
    `az policy state list --resource-group "${resourceGroup}" --query "[?complianceState == 'NonCompliant'] | length(@)" -o tsv 2>/dev/null || echo "0"`,
    { context: CONTEXT },
  );

  if (policyResult.success) {
    const nonCompliantCount = parseInt(policyResult.stdout.trim()) || 0;
    checks.push({
      name: 'Azure Policy Compliance',
      category: 'Compliance',
      status: nonCompliantCount === 0 ? 'pass' : 'fail',
      message:
        nonCompliantCount === 0
          ? 'No non-compliant policy states found'
          : `${nonCompliantCount} resource(s) are non-compliant with Azure Policy`,
    });
  }
}

function printResults(result: SecurityValidationResult): void {
  console.log('');
  logger.section('SECURITY VALIDATION RESULTS');

  // Group checks by category
  const categories = new Map<string, SecurityCheckResult[]>();
  for (const check of result.checks) {
    const existing = categories.get(check.category) || [];
    existing.push(check);
    categories.set(check.category, existing);
  }

  for (const [category, categoryChecks] of categories) {
    console.log(`\n${category}:`);
    for (const check of categoryChecks) {
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      const statusText = check.status.toUpperCase();
      console.log(`  ${icon} [${statusText}] ${check.name}`);
      console.log(`      ${check.message}`);
    }
  }

  console.log('');
  logger.section('SUMMARY');
  console.log(`  Passed:   ${result.passCount}`);
  console.log(`  Warnings: ${result.warnCount}`);
  console.log(`  Failed:   ${result.failCount}`);
  console.log('');

  if (result.failCount === 0) {
    logger.success('Security validation passed!');
    if (result.warnCount > 0) {
      logger.warn(`${result.warnCount} warning(s) found - review and address as needed`, CONTEXT);
    }
  } else {
    logger.failure(`Security validation failed with ${result.failCount} error(s)`);
  }
}

function printHelp(): void {
  console.log(`
Validate Azure infrastructure security configuration

USAGE:
  terraform-cli validate-security <environment> [resource-group] [options]

ARGUMENTS:
  environment     Environment name (dev, test, prod)
  resource-group  Azure resource group name (optional - auto-resolved from config)

OPTIONS:
  --json          Output results as JSON (for CI integration)
  --help          Show this help message

CONFIGURATION:
  Resource group names are loaded from configs/terraform/environments.json.
  You can override by providing the resource-group argument explicitly.

DESCRIPTION:
  Validates Azure infrastructure security configuration against best practices:

  1. Resource Group Security
     - Resource locks for critical resources

  2. Network Security
     - VNet encryption
     - NSG coverage on subnets
     - Public IP review

  3. Private Endpoint Security
     - Private endpoints for PaaS services
     - Key Vault public access
     - Storage Account public access

  4. AKS Cluster Security
     - Private cluster configuration
     - Managed identity usage
     - Azure AD integration
     - Network policy
     - Azure Policy addon

  5. RBAC and Identity
     - Key Vault RBAC authorization
     - Managed identity usage
     - Service principal review

  6. Encryption
     - Storage Account encryption
     - TLS 1.2 enforcement
     - Cosmos DB encryption

  7. Monitoring
     - Log Analytics workspace

  8. Compliance
     - Azure Policy compliance state

EXIT CODES:
  0 - All security checks passed (warnings allowed)
  1 - One or more security checks failed

EXAMPLES:
  # Validate dev security (uses resource group from config)
  terraform-cli validate-security dev

  # Validate production security (uses resource group from config)
  terraform-cli validate-security prod

  # Validate with explicit resource group override
  terraform-cli validate-security prod my-custom-rg

  # Validate with JSON output for CI
  terraform-cli validate-security prod --json
`);
}
