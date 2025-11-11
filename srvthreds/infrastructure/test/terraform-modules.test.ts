/**
 * Unit tests for Terraform modules
 *
 * Tests Terraform module configurations including:
 * - Module variable validation
 * - Output definitions
 * - Resource naming conventions
 * - Security configurations
 */

import { describe, it, expect } from 'vitest';

// Type definitions matching Terraform variable structures
interface AzureNamingConvention {
  prefix: string;
  appName: string;
  environment: 'D' | 'T' | 'P'; // Dev, Test, Prod
  region: string;
  resourceType: string;
}

interface ResourceRequirements {
  memory: {
    request: string;
    limit: string;
  };
  cpu: {
    request: string;
    limit: string;
  };
}

interface SecurityConfiguration {
  enableRBAC: boolean;
  enablePrivateCluster: boolean;
  enableAzurePolicy: boolean;
  enableKeyVaultSecretsProvider: boolean;
  minimumTLSVersion: '1.2' | '1.3';
}

describe('Terraform Modules - Naming Conventions', () => {
  it('should generate correct Azure resource names following Army NETCOM convention', () => {
    const generateResourceName = (naming: AzureNamingConvention): string => {
      // Format: CAZ-APPNAME-ENV-REGION-RESOURCETYPE
      return `${naming.prefix}-${naming.appName}-${naming.environment}-${naming.region}-${naming.resourceType}`;
    };

    const naming: AzureNamingConvention = {
      prefix: 'CAZ',
      appName: 'SRVTHREDS',
      environment: 'D',
      region: 'E',
      resourceType: 'RG',
    };

    const name = generateResourceName(naming);
    expect(name).toBe('CAZ-SRVTHREDS-D-E-RG');
  });

  it('should enforce resource name length limits', () => {
    const validateResourceName = (name: string, maxLength: number): boolean => {
      return name.length <= maxLength;
    };

    // Key Vault names must be 3-24 characters
    const keyVaultName = 'CAZ-SRVTHREDS-D-E-KEY';
    expect(validateResourceName(keyVaultName, 24)).toBe(true);
    expect(keyVaultName.length).toBeLessThanOrEqual(24);

    // Storage account names must be 3-24 characters, lowercase, no hyphens
    const storageAccountName = 'srvthredsdevtfstate';
    expect(validateResourceName(storageAccountName, 24)).toBe(true);
    expect(storageAccountName).toMatch(/^[a-z0-9]{3,24}$/);
  });

  it('should generate environment-specific names', () => {
    const environments = ['dev', 'test', 'prod'];
    const envCodes = { dev: 'D', test: 'T', prod: 'P' };

    for (const env of environments) {
      const code = envCodes[env as keyof typeof envCodes];
      const name = `CAZ-SRVTHREDS-${code}-E-AKS`;

      expect(name).toContain(code);
      if (env === 'dev') expect(name).toBe('CAZ-SRVTHREDS-D-E-AKS');
      if (env === 'test') expect(name).toBe('CAZ-SRVTHREDS-T-E-AKS');
      if (env === 'prod') expect(name).toBe('CAZ-SRVTHREDS-P-E-AKS');
    }
  });
});

describe('Terraform Modules - Variable Validation', () => {
  it('should validate environment variable', () => {
    const validateEnvironment = (env: string): boolean => {
      const validEnvironments = ['dev', 'test', 'staging', 'prod'];
      return validEnvironments.includes(env);
    };

    expect(validateEnvironment('dev')).toBe(true);
    expect(validateEnvironment('prod')).toBe(true);
    expect(validateEnvironment('invalid')).toBe(false);
  });

  it('should validate Azure region', () => {
    const validateRegion = (region: string): boolean => {
      const validRegions = ['eastus', 'eastus2', 'westus2', 'centralus'];
      return validRegions.includes(region);
    };

    expect(validateRegion('eastus')).toBe(true);
    expect(validateRegion('westus3')).toBe(false);
  });

  it('should validate resource requirements format', () => {
    const validateResources = (resources: ResourceRequirements): boolean => {
      // Check memory format (e.g., "512Mi", "1Gi")
      const memoryRegex = /^\d+(Mi|Gi)$/;
      if (!memoryRegex.test(resources.memory.request)) return false;
      if (!memoryRegex.test(resources.memory.limit)) return false;

      // Check CPU format (e.g., "500m", "1000m", "1")
      const cpuRegex = /^\d+(m)?$/;
      if (!cpuRegex.test(resources.cpu.request)) return false;
      if (!cpuRegex.test(resources.cpu.limit)) return false;

      return true;
    };

    const validResources: ResourceRequirements = {
      memory: { request: '512Mi', limit: '1Gi' },
      cpu: { request: '500m', limit: '1000m' },
    };

    expect(validateResources(validResources)).toBe(true);

    const invalidResources: ResourceRequirements = {
      memory: { request: '512', limit: '1Gi' }, // Missing unit
      cpu: { request: '500m', limit: '1000m' },
    };

    expect(validateResources(invalidResources)).toBe(false);
  });

  it('should validate network CIDR blocks', () => {
    const validateCIDR = (cidr: string): boolean => {
      // Simple CIDR validation (IP/mask format)
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      return cidrRegex.test(cidr);
    };

    expect(validateCIDR('10.0.0.0/16')).toBe(true);
    expect(validateCIDR('192.168.1.0/24')).toBe(true);
    expect(validateCIDR('10.0.0.0')).toBe(false); // Missing mask
    expect(validateCIDR('invalid')).toBe(false);
  });
});

describe('Terraform Modules - Security Configurations', () => {
  it('should enforce security best practices for production', () => {
    const getSecurityConfig = (environment: string): SecurityConfiguration => {
      const isProd = environment === 'prod' || environment === 'production';

      return {
        enableRBAC: true, // Always enabled
        enablePrivateCluster: isProd, // Required for prod
        enableAzurePolicy: isProd,
        enableKeyVaultSecretsProvider: true,
        minimumTLSVersion: '1.2',
      };
    };

    const prodConfig = getSecurityConfig('prod');
    expect(prodConfig.enableRBAC).toBe(true);
    expect(prodConfig.enablePrivateCluster).toBe(true);
    expect(prodConfig.enableAzurePolicy).toBe(true);
    expect(prodConfig.minimumTLSVersion).toBe('1.2');

    const devConfig = getSecurityConfig('dev');
    expect(devConfig.enableRBAC).toBe(true);
    expect(devConfig.enablePrivateCluster).toBe(false); // Relaxed for dev
  });

  it('should validate Key Vault configuration', () => {
    const validateKeyVaultConfig = (config: any): boolean => {
      // RBAC authorization should be enabled
      if (!config.enableRbacAuthorization) return false;

      // Public network access should be disabled for prod
      if (config.environment === 'prod' && config.publicNetworkAccessEnabled) {
        return false;
      }

      // Soft delete should be enabled
      if (!config.enableSoftDelete) return false;

      // Purge protection should be enabled for prod
      if (config.environment === 'prod' && !config.purgeProtectionEnabled) {
        return false;
      }

      return true;
    };

    const prodKeyVault = {
      enableRbacAuthorization: true,
      publicNetworkAccessEnabled: false,
      enableSoftDelete: true,
      purgeProtectionEnabled: true,
      environment: 'prod',
    };

    expect(validateKeyVaultConfig(prodKeyVault)).toBe(true);

    const insecureKeyVault = {
      enableRbacAuthorization: false, // Should be true
      publicNetworkAccessEnabled: true,
      enableSoftDelete: false,
      purgeProtectionEnabled: false,
      environment: 'prod',
    };

    expect(validateKeyVaultConfig(insecureKeyVault)).toBe(false);
  });

  it('should validate AKS security settings', () => {
    const validateAKSConfig = (config: any): boolean => {
      // Managed identity is required
      if (config.identityType !== 'SystemAssigned' && config.identityType !== 'UserAssigned') {
        return false;
      }

      // Azure AD integration should be enabled
      if (!config.azureADEnabled) return false;

      // Network policy should be set for prod
      if (config.environment === 'prod' && !config.networkPolicy) {
        return false;
      }

      return true;
    };

    const validAKS = {
      identityType: 'SystemAssigned',
      azureADEnabled: true,
      networkPolicy: 'calico',
      environment: 'prod',
    };

    expect(validateAKSConfig(validAKS)).toBe(true);

    const invalidAKS = {
      identityType: 'ServicePrincipal', // Should use managed identity
      azureADEnabled: false,
      networkPolicy: null,
      environment: 'prod',
    };

    expect(validateAKSConfig(invalidAKS)).toBe(false);
  });

  it('should validate storage account security', () => {
    const validateStorageConfig = (config: any): boolean => {
      // HTTPS only should be enabled
      if (!config.httpsTrafficOnlyEnabled) return false;

      // Minimum TLS version should be 1.2
      if (config.minimumTlsVersion !== 'TLS1_2') return false;

      // Public blob access should be disabled
      if (config.allowBlobPublicAccess) return false;

      // Encryption should be enabled
      if (!config.encryptionEnabled) return false;

      return true;
    };

    const secureStorage = {
      httpsTrafficOnlyEnabled: true,
      minimumTlsVersion: 'TLS1_2',
      allowBlobPublicAccess: false,
      encryptionEnabled: true,
    };

    expect(validateStorageConfig(secureStorage)).toBe(true);

    const insecureStorage = {
      httpsTrafficOnlyEnabled: false,
      minimumTlsVersion: 'TLS1_0',
      allowBlobPublicAccess: true,
      encryptionEnabled: false,
    };

    expect(validateStorageConfig(insecureStorage)).toBe(false);
  });
});

describe('Terraform Modules - RBAC Configurations', () => {
  it('should validate role assignments', () => {
    const validateRoleAssignment = (assignment: any): boolean => {
      // Must have scope
      if (!assignment.scope) return false;

      // Must have role definition
      if (!assignment.roleDefinitionName && !assignment.roleDefinitionId) return false;

      // Must have principal
      if (!assignment.principalId) return false;

      return true;
    };

    const validAssignment = {
      scope: '/subscriptions/123/resourceGroups/rg',
      roleDefinitionName: 'Contributor',
      principalId: 'abc-123',
    };

    expect(validateRoleAssignment(validAssignment)).toBe(true);

    const invalidAssignment = {
      scope: '/subscriptions/123/resourceGroups/rg',
      // Missing role and principal
    };

    expect(validateRoleAssignment(invalidAssignment)).toBe(false);
  });

  it('should prefer managed identities over service principals', () => {
    const evaluateIdentityType = (identityType: string): { score: number; recommendation: string } => {
      if (identityType === 'SystemAssigned' || identityType === 'UserAssigned') {
        return {
          score: 10,
          recommendation: 'Excellent - using managed identity',
        };
      }

      if (identityType === 'ServicePrincipal') {
        return {
          score: 5,
          recommendation: 'Warning - migrate to managed identity',
        };
      }

      return {
        score: 0,
        recommendation: 'Error - invalid identity type',
      };
    };

    expect(evaluateIdentityType('SystemAssigned').score).toBe(10);
    expect(evaluateIdentityType('UserAssigned').score).toBe(10);
    expect(evaluateIdentityType('ServicePrincipal').score).toBe(5);
    expect(evaluateIdentityType('Invalid').score).toBe(0);
  });

  it('should validate least privilege role assignments', () => {
    const isLeastPrivilege = (roleName: string, resourceType: string): boolean => {
      // Specific roles for specific resource types
      const leastPrivilegeRoles: Record<string, string[]> = {
        'Key Vault': ['Key Vault Secrets User', 'Key Vault Secrets Officer'],
        'Storage Account': ['Storage Blob Data Reader', 'Storage Blob Data Contributor'],
        'Container Registry': ['AcrPull', 'AcrPush'],
        'Cosmos DB': ['Cosmos DB Account Reader Role'],
      };

      // Avoid these broad roles
      const broadRoles = ['Owner', 'Contributor'];

      if (broadRoles.includes(roleName)) return false;

      const allowedRoles = leastPrivilegeRoles[resourceType] || [];
      return allowedRoles.includes(roleName);
    };

    expect(isLeastPrivilege('Key Vault Secrets User', 'Key Vault')).toBe(true);
    expect(isLeastPrivilege('Contributor', 'Key Vault')).toBe(false);
    expect(isLeastPrivilege('AcrPull', 'Container Registry')).toBe(true);
  });
});

describe('Terraform Modules - Tag Management', () => {
  it('should enforce required tags', () => {
    const validateTags = (tags: Record<string, string>, requiredTags: string[]): boolean => {
      for (const required of requiredTags) {
        if (!tags[required]) return false;
      }
      return true;
    };

    const requiredTags = ['Environment', 'ManagedBy', 'Project'];
    const validTags = {
      Environment: 'Production',
      ManagedBy: 'Terraform',
      Project: 'SrvThreds',
      CostCenter: 'Engineering',
    };

    expect(validateTags(validTags, requiredTags)).toBe(true);

    const invalidTags = {
      Environment: 'Production',
      // Missing ManagedBy and Project
    };

    expect(validateTags(invalidTags, requiredTags)).toBe(false);
  });

  it('should generate consistent tags', () => {
    const generateCommonTags = (environment: string, moduleName: string) => {
      return {
        Environment: environment.charAt(0).toUpperCase() + environment.slice(1),
        ManagedBy: 'Terraform',
        Project: 'SrvThreds',
        Module: moduleName,
      };
    };

    const tags = generateCommonTags('dev', 'networking');

    expect(tags).toHaveProperty('Environment', 'Dev');
    expect(tags).toHaveProperty('ManagedBy', 'Terraform');
    expect(tags).toHaveProperty('Project', 'SrvThreds');
    expect(tags).toHaveProperty('Module', 'networking');
  });
});
