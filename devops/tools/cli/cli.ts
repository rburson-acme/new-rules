#!/usr/bin/env node

/**
 * Simplified DevOps CLI
 *
 * Commands:
 *   generate    - Generate docker-compose.yaml from project.yaml
 *   minikube    - Start/update minikube deployment
 *   minikube:stop   - Stop services
 *   minikube:reset  - Full reset
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { registerGenerateCommand } from './commands/generate.js';
import { registerMinikubeCommands } from './commands/minikube.js';
import { listProjects } from './utils/project-loader.js';
import { logger } from '../shared/logger.js';

async function main() {
  let yargsInstance = yargs(hideBin(process.argv))
    .scriptName('cli')
    .usage('$0 <command> [options]')
    .demandCommand(1, 'You must specify a command')
    .strict()
    .help()
    .alias('h', 'help')
    .version(false);

  // Register commands
  yargsInstance = registerGenerateCommand(yargsInstance);
  yargsInstance = registerMinikubeCommands(yargsInstance);

  // Add config list command
  yargsInstance = yargsInstance.command(
    'config:list',
    'List available projects',
    () => {},
    () => {
      const projects = listProjects();
      logger.info('\nAvailable projects:');
      if (projects.length === 0) {
        logger.info('  (none found)');
      } else {
        for (const project of projects) {
          logger.info(`  - ${project}`);
        }
      }
      logger.info('');
    },
  );

  await yargsInstance.parse();
}

main().catch((error) => {
  logger.failure(`Fatal error: ${error}`);
  process.exit(1);
});
