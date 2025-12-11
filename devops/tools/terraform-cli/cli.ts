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
 *   terraform-cli state-backend <environment>
 *   terraform-cli status <environment>
 */

// import { fileURLToPath } from 'url';
// import * as path from 'path';
import { logger, LogLevel } from '../shared/logger.js';
import { handleError } from '../shared/error-handler.js';
import { deployCommand, planCommand, DEPLOY_COMMAND_DESCRIPTION, PLAN_COMMAND_DESCRIPTION } from './commands/deploy.js';
import { destroyCommand, DESTROY_COMMAND_DESCRIPTION } from './commands/destroy.js';
import { stateCommand, STATE_COMMAND_DESCRIPTION } from './commands/state.js';
import { cleanupCommand, CLEANUP_COMMAND_DESCRIPTION } from './commands/cleanup.js';
import { bootstrapCommand, BOOTSTRAP_COMMAND_DESCRIPTION } from './commands/bootstrap.js';
import { statusCommand, STATUS_COMMAND_DESCRIPTION } from './commands/status.js';
import { outputCommand, OUTPUT_COMMAND_DESCRIPTION } from './commands/output.js';
import { fixSymlinksCommand, FIX_SYMLINKS_COMMAND_DESCRIPTION } from './commands/fix-symlinks.js';
import { validateSecurityCommand, VALIDATE_SECURITY_COMMAND_DESCRIPTION } from './commands/validate-security.js';
import { importCommand, IMPORT_COMMAND_DESCRIPTION } from './commands/import.js';
import { initCommand, INIT_COMMAND_DESCRIPTION } from './commands/init.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

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
      description: DEPLOY_COMMAND_DESCRIPTION,
      handler: deployCommand,
    },
  ],
  [
    'plan',
    {
      name: 'plan',
      description: PLAN_COMMAND_DESCRIPTION,
      handler: planCommand,
    },
  ],
  [
    'destroy',
    {
      name: 'destroy',
      description: DESTROY_COMMAND_DESCRIPTION,
      handler: destroyCommand,
    },
  ],
  [
    'state',
    {
      name: 'state',
      description: STATE_COMMAND_DESCRIPTION,
      handler: stateCommand,
    },
  ],
  [
    'cleanup',
    {
      name: 'cleanup',
      description: CLEANUP_COMMAND_DESCRIPTION,
      handler: cleanupCommand,
    },
  ],
  [
    'state-backend',
    {
      name: 'state-backend',
      description: BOOTSTRAP_COMMAND_DESCRIPTION,
      handler: bootstrapCommand,
    },
  ],
  [
    'bootstrap', // Keep as alias for backward compatibility
    {
      name: 'bootstrap (deprecated, use state-backend)',
      description: BOOTSTRAP_COMMAND_DESCRIPTION,
      handler: bootstrapCommand,
    },
  ],
  [
    'status',
    {
      name: 'status',
      description: STATUS_COMMAND_DESCRIPTION,
      handler: statusCommand,
    },
  ],
  [
    'output',
    {
      name: 'output',
      description: OUTPUT_COMMAND_DESCRIPTION,
      handler: outputCommand,
    },
  ],
  [
    'fix-symlinks',
    {
      name: 'fix-symlinks',
      description: FIX_SYMLINKS_COMMAND_DESCRIPTION,
      handler: fixSymlinksCommand,
    },
  ],
  [
    'validate-security',
    {
      name: 'validate-security',
      description: VALIDATE_SECURITY_COMMAND_DESCRIPTION,
      handler: validateSecurityCommand,
    },
  ],
  [
    'import',
    {
      name: 'import',
      description: IMPORT_COMMAND_DESCRIPTION,
      handler: importCommand,
    },
  ],
  [
    'init',
    {
      name: 'init',
      description: INIT_COMMAND_DESCRIPTION,
      handler: initCommand,
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
  # Initialize all stacks for an environment (first time setup)
  terraform-cli init dev

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

  # Fix symlink consistency issues
  terraform-cli fix-symlinks --check

  # Validate Azure security configuration
  terraform-cli validate-security prod srvthreds-prod-rg

  # Import existing Azure resource
  terraform-cli import cosmosdb cosmosdb_account main "/subscriptions/.../..."

  # Recover out-of-sync state
  terraform-cli state recover dev cosmosdb --dry-run

For detailed help on a command:
  terraform-cli <command> --help
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Handle global options
  if (args.includes('--debug')) {
    logger.setLevel(LogLevel.DEBUG);
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
