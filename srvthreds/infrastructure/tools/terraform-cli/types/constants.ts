/**
 * Constants used throughout the Terraform CLI
 */

/**
 * Command descriptions (exported from command files for centralization)
 */
export const COMMAND_DESCRIPTIONS = {
  DEPLOY: 'Deploy infrastructure stacks to Azure',
  PLAN: 'Preview infrastructure changes without applying',
  DESTROY: 'Destroy infrastructure stacks from Azure',
  STATE: 'Manage Terraform state (backup, validate, repair, clean)',
  CLEANUP: 'Cleanup infrastructure and state (with soft-delete handling)',
  BOOTSTRAP: 'Initialize bootstrap infrastructure (storage, resource group)',
  STATUS: 'Check deployment status'
} as const;

/**
 * Terraform backend configuration defaults
 */
export const BACKEND_CONFIG = {
  CONTAINER_NAME: 'tfstate',
  STATE_KEY_PREFIX: 'stacks'
} as const;

/**
 * Exit codes for CLI operations
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  CONFIG_ERROR: 3,
  EXECUTION_ERROR: 4,
  AZURE_ERROR: 5,
  TERRAFORM_ERROR: 6
} as const;

/**
 * Valid Terraform state commands
 */
export const STATE_COMMANDS = ['backup', 'validate', 'repair', 'clean', 'show'] as const;

/**
 * Type for valid state commands
 */
export type StateCommand = typeof STATE_COMMANDS[number];
