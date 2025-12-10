/**
 * Azure CLI utilities
 */

import { logger } from '../../shared/logger.js';
import { execCommand, ShellOptions } from '../../shared/shell.js';
import { AzureError } from '../../shared/error-handler.js';

export interface AzureResource {
  id: string;
  name: string;
  type: string;
  resourceGroup: string;
}

export interface AzureSoftDeletedResource {
  id: string;
  name: string;
  type: string;
  deletionDate: string;
  scheduledPurgeDate: string;
}

export class AzureManager {
  private _subscriptionId?: string;

  constructor(subscriptionId?: string) {
    this._subscriptionId = subscriptionId;
  }

  get subscriptionId(): string | undefined {
    return this._subscriptionId;
  }

  /**
   * Get current Azure account info
   */
  async getAccountInfo(): Promise<any> {
    logger.debug('Getting Azure account info', 'azure');

    const result = execCommand('az account show --output json', {
      context: 'azure-account',
    });

    if (!result.success) {
      throw new AzureError('Failed to get Azure account info');
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new AzureError('Failed to parse Azure account info');
    }
  }

  /**
   * Set Azure subscription
   */
  async setSubscription(subscriptionId: string): Promise<void> {
    logger.info(`Setting Azure subscription to ${subscriptionId}`, 'azure');

    const result = execCommand(`az account set --subscription ${subscriptionId}`, {
      context: 'azure-subscription',
    });

    if (!result.success) {
      throw new AzureError(`Failed to set subscription to ${subscriptionId}`);
    }

    this._subscriptionId = subscriptionId;
  }

  /**
   * List resources in a resource group
   */
  async listResources(resourceGroup: string): Promise<AzureResource[]> {
    logger.debug(`Listing resources in ${resourceGroup}`, 'azure');

    const result = execCommand(`az resource list --resource-group ${resourceGroup} --output json`, {
      context: 'azure-list-resources',
    });

    if (!result.success) {
      throw new AzureError(`Failed to list resources in ${resourceGroup}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new AzureError(`Failed to parse resources from ${resourceGroup}`);
    }
  }

  /**
   * Delete a resource group
   */
  async deleteResourceGroup(resourceGroup: string, options: ShellOptions = {}): Promise<void> {
    logger.info(`Deleting resource group ${resourceGroup}`, 'azure');

    const result = execCommand(`az group delete --name ${resourceGroup} --yes`, {
      ...options,
      context: 'azure-delete-rg',
    });

    if (!result.success) {
      throw new AzureError(`Failed to delete resource group ${resourceGroup}`);
    }
  }

  /**
   * List soft-deleted Key Vaults
   */
  async listDeletedKeyVaults(): Promise<AzureSoftDeletedResource[]> {
    logger.debug('Listing soft-deleted Key Vaults', 'azure');

    const result = execCommand('az keyvault list-deleted --output json', {
      context: 'azure-list-deleted-kv',
    });

    if (!result.success) {
      logger.warn('Failed to list deleted Key Vaults', 'azure');
      return [];
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      logger.warn('Failed to parse deleted Key Vaults', 'azure');
      return [];
    }
  }

  /**
   * Purge a soft-deleted Key Vault
   */
  async purgeKeyVault(name: string, location: string): Promise<void> {
    logger.info(`Purging soft-deleted Key Vault ${name}`, 'azure');

    const result = execCommand(`az keyvault purge --name ${name} --location ${location}`, {
      context: 'azure-purge-kv',
    });

    if (!result.success) {
      throw new AzureError(`Failed to purge Key Vault ${name}`);
    }
  }

  /**
   * List soft-deleted Storage Accounts
   */
  async listDeletedStorageAccounts(): Promise<AzureSoftDeletedResource[]> {
    logger.debug('Listing soft-deleted Storage Accounts', 'azure');

    const result = execCommand('az storage account list-deleted --output json', {
      context: 'azure-list-deleted-sa',
    });

    if (!result.success) {
      logger.warn('Failed to list deleted Storage Accounts', 'azure');
      return [];
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      logger.warn('Failed to parse deleted Storage Accounts', 'azure');
      return [];
    }
  }

  /**
   * Purge a soft-deleted Storage Account
   */
  async purgeStorageAccount(name: string, resourceGroup: string): Promise<void> {
    logger.info(`Purging soft-deleted Storage Account ${name}`, 'azure');

    const result = execCommand(`az storage account purge --name ${name} --resource-group ${resourceGroup}`, {
      context: 'azure-purge-sa',
    });

    if (!result.success) {
      throw new AzureError(`Failed to purge Storage Account ${name}`);
    }
  }

  /**
   * List management locks on a resource group
   */
  async listLocks(resourceGroup: string): Promise<any[]> {
    logger.debug(`Listing locks on ${resourceGroup}`, 'azure');

    const result = execCommand(`az lock list --resource-group ${resourceGroup} --output json`, {
      context: 'azure-list-locks',
    });

    if (!result.success) {
      logger.warn(`Failed to list locks on ${resourceGroup}`, 'azure');
      return [];
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      logger.warn(`Failed to parse locks on ${resourceGroup}`, 'azure');
      return [];
    }
  }

  /**
   * Delete a management lock
   */
  async deleteLock(lockName: string, resourceGroup: string): Promise<void> {
    logger.info(`Deleting lock ${lockName} on ${resourceGroup}`, 'azure');

    const result = execCommand(`az lock delete --name ${lockName} --resource-group ${resourceGroup}`, {
      context: 'azure-delete-lock',
    });

    if (!result.success) {
      throw new AzureError(`Failed to delete lock ${lockName}`);
    }
  }
}
