/**
 * Tests for import command
 *
 * Tests the Azure resource import logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

// Mock shell
vi.mock('../../../shared/shell.js', () => ({
  execCommand: vi.fn(),
}));

// Mock logger
vi.mock('../../../shared/logger.js', () => ({
  logger: {
    section: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    failure: vi.fn(),
  },
}));

// Mock config loader
vi.mock('../../../shared/config-loader.js', () => ({
  createConfigLoader: vi.fn(() => ({
    loadConfig: vi.fn((file: string) => {
      if (file === 'environments.json') {
        return {
          dev: {
            subscriptionId: 'test-sub-id',
            resourceGroupName: 'test-rg',
            stateBackendResourceGroup: 'test-backend-rg',
            stateBackendStorageAccount: 'teststorage',
          },
          prod: {
            subscriptionId: 'prod-sub-id',
            resourceGroupName: 'prod-rg',
            stateBackendResourceGroup: 'prod-backend-rg',
            stateBackendStorageAccount: 'prodstorage',
          },
        };
      }
      return {};
    }),
  })),
}));

// Mock error handler
vi.mock('../../../shared/error-handler.js', () => ({
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
  ExecutionError: class ExecutionError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ExecutionError';
    }
  },
  confirmAction: vi.fn().mockResolvedValue(true),
}));

import * as fs from 'fs';
import { importCommand } from '../../commands/import.js';
import { logger } from '../../../shared/logger.js';
import { execCommand } from '../../../shared/shell.js';

describe('import command', () => {
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);
  const mockExecCommand = vi.mocked(execCommand);
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: stack directory and tfvars exist
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('module "cosmosdb" {}');
    // Default: commands succeed
    mockExecCommand.mockReturnValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ENVIRONMENT;
  });

  describe('help', () => {
    it('should show help when --help flag is provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await importCommand(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('USAGE');
      expect(output).toContain('import');
      expect(output).toContain('SUPPORTED RESOURCE TYPES');
      expect(output).toContain('azurerm_cosmosdb_account');
    });
  });

  describe('argument validation', () => {
    it('should throw error when missing required arguments', async () => {
      await expect(importCommand(['cosmosdb'])).rejects.toThrow('Missing required arguments');
      await expect(importCommand(['cosmosdb', 'type'])).rejects.toThrow('Missing required arguments');
      await expect(importCommand(['cosmosdb', 'type', 'name'])).rejects.toThrow('Missing required arguments');
    });

    it('should accept all required arguments', async () => {
      await expect(
        importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'myresource', '--dry-run']),
      ).resolves.not.toThrow();
    });
  });

  describe('resource ID construction', () => {
    it('should construct Azure resource ID from config for simple name', async () => {
      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Constructed Azure resource ID from config', 'import');

      // Check the logged resource ID contains expected parts
      const infoCalls = mockLogger.info.mock.calls;
      const resourceIdCall = infoCalls.find((call) => String(call[0]).includes('Azure Resource ID:'));
      expect(resourceIdCall).toBeDefined();
      expect(String(resourceIdCall![0])).toContain('test-sub-id');
      expect(String(resourceIdCall![0])).toContain('test-rg');
      expect(String(resourceIdCall![0])).toContain('mycosmosdb');
    });

    it('should use full resource ID when path starts with /subscriptions/', async () => {
      const fullId = '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/mydb';

      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', fullId, '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Using provided Azure resource ID', 'import');
    });

    it('should use full resource ID when --full-id flag is provided', async () => {
      const customId = 'some-custom-resource-path';

      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', customId, '--full-id', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Using provided Azure resource ID', 'import');
    });

    it('should add azurerm_ prefix to resource type if missing', async () => {
      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Resource Type: azurerm_cosmosdb_account', 'import');
    });

    it('should not double-prefix resource type', async () => {
      await importCommand(['cosmosdb', 'azurerm_cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Resource Type: azurerm_cosmosdb_account', 'import');
    });
  });

  describe('environment handling', () => {
    it('should use dev environment by default', async () => {
      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Environment: dev', 'import');
    });

    it('should respect ENVIRONMENT variable', async () => {
      process.env.ENVIRONMENT = 'prod';

      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Environment: prod', 'import');
    });

    it('should throw error for invalid environment', async () => {
      process.env.ENVIRONMENT = 'invalid';

      await expect(importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'myresource', '--dry-run'])).rejects.toThrow(
        "Environment 'invalid' not found",
      );
    });
  });

  describe('dry run mode', () => {
    it('should not execute terraform import in dry run mode', async () => {
      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.warn).toHaveBeenCalledWith('[DRY RUN] No changes will be made', 'import');
      // Should not call execCommand for actual import
      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it('should show what would be executed in dry run mode', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => {});

      await importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'mycosmosdb', '--dry-run']);

      expect(mockLogger.info).toHaveBeenCalledWith('Would execute:', 'import');
    });
  });

  describe('stack validation', () => {
    it('should throw error when stack directory does not exist', async () => {
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('nonexistent')) return false;
        return true;
      });

      await expect(
        importCommand(['nonexistent', 'cosmosdb_account', 'main', 'myresource', '--dry-run']),
      ).rejects.toThrow("Stack 'nonexistent' not found");
    });

    it('should throw error when tfvars file does not exist', async () => {
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('.tfvars')) return false;
        return true;
      });

      await expect(importCommand(['cosmosdb', 'cosmosdb_account', 'main', 'myresource', '--dry-run'])).rejects.toThrow(
        'Variables file not found',
      );
    });
  });
});
