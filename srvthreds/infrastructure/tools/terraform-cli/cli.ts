#!/usr/bin/env node

/**
 * Terraform Infrastructure CLI
 * 
 * Manages Azure infrastructure deployments with type-safe configuration
 * and comprehensive error handling.
 * 
 * Usage:
 *   terraform-cli deploy <environment> [stacks...]
 *   terraform-cli state <command> <environment>
 *   terraform-cli cleanup <environment> [--force] [--dry-run]
 *   terraform-cli bootstrap <environment>
 *   terraform-cli status <environment>
 */

import { fileURLToPath } from 'url';
import * as path from 'path';
import { logger, LogLevel } from '../shared/logger.js';
import { handleError, CLIError } from '../shared/error-handler.js';
import { deployCommand, planCommand } from './commands/deploy.js';
import { stateCommand } from './commands/state.js';
import { cleanupCommand } from './commands/cleanup.js';
import { bootstrapCommand } from './commands/bootstrap.js';
import { statusCommand } from './commands/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<void>;
}

const commands: Map<string, Command> = new Map([
  [
    'deploy',
    {
      name: 'deploy',
      description: 'Deploy infrastructure stacks to Azure',
      handler: deployCommand,
    },
  ],
  [
    'plan',
    {
      name: 'plan',
      description: 'Preview infrastructure changes without applying',
      handler: planCommand,
    },
  ],
  [
    'state',
    {
      name: 'state',
      description: 'Manage Terraform state (backup, validate, repair, clean)',
      handler: stateCommand,
    },
  ],
  [
    'cleanup',
    {
      name: 'cleanup',
      description: 'Cleanup infrastructure and state (with soft-delete handling)',
      handler: cleanupCommand,
    },
  ],
  [
    'bootstrap',
    {
      name: 'bootstrap',
      description: 'Initialize bootstrap infrastructure (storage, resource group)',
      handler: bootstrapCommand,
    },
  ],
  [
    'status',
    {
      name: 'status',
      description: 'Check deployment status',
      handler: statusCommand,
    },
  ],
]);

function printHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Terraform Infrastructure CLI                           ║
║         Manage Azure infrastructure deployments                ║
╚════════════════════════════════════════════════════════════════╝

USAGE:
  terraform-cli <command> [options]

COMMANDS:
`);

  for (const [, cmd] of commands) {
    console.log(`  ${cmd.name.padEnd(15)} ${cmd.description}`);
  }

  console.log(`
OPTIONS:
  --help, -h              Show this help message
  --debug                 Enable debug logging
  --dry-run               Preview changes without applying
  --force                 Skip confirmations (use with caution)

EXAMPLES:
  # Preview changes before deploying
  terraform-cli plan dev

  # Deploy all stacks to dev environment
  terraform-cli deploy dev

  # Deploy specific stacks
  terraform-cli deploy dev networking keyvault

  # Preview cleanup without applying
  terraform-cli cleanup dev --dry-run

  # Backup state before deployment
  terraform-cli state backup dev

  # Check deployment status
  terraform-cli status dev

For detailed help on a command:
  terraform-cli <command> --help
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle global options
  if (args.includes('--debug')) {
    logger.setMinLevel(LogLevel.DEBUG);
    args.splice(args.indexOf('--debug'), 1);
  }

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const commandName = args[0];
  const command = commands.get(commandName);

  if (!command) {
    logger.failure(`Unknown command: ${commandName}`);
    console.log(`\nRun 'terraform-cli --help' for usage information.`);
    process.exit(1);
  }

  try {
    logger.section(`${command.name.toUpperCase()}`);
    await command.handler(args.slice(1));
    logger.success('Command completed successfully');
  } catch (error) {
    handleError(error, `terraform-cli ${commandName}`);
  }
}

main().catch((error) => {
  handleError(error, 'terraform-cli');
});

