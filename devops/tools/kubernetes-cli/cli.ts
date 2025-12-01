#!/usr/bin/env node

/**
 * Kubernetes Deployment CLI
 *
 * Unified CLI for deploying projects to Minikube (local) and AKS (cloud).
 * Configuration-driven to support multiple projects.
 *
 * Usage:
 *   k8s minikube deploy [--project <name>] [--dry-run] [-v]
 *   k8s minikube reset [--project <name>]
 *   k8s minikube cleanup [--project <name>] [--delete-dbs]
 *   k8s aks deploy <env> [--project <name>] [--dry-run] [-v]
 *   k8s config list
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { minikubeCommands } from './commands/minikube.js';
import { aksCommands } from './commands/aks.js';
import { configCommands } from './commands/config.js';
import { logger, LogLevel } from '../shared/logger.js';
import { handleError } from '../shared/error-handler.js';

const cli = yargs(hideBin(process.argv))
  .scriptName('k8s')
  .usage('$0 <command> [options]')
  .middleware((argv) => {
    // Set log level based on verbose flag
    if (argv.verbose) {
      logger.setLevel(LogLevel.DEBUG);
    }
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Enable verbose logging',
    global: true,
  })
  .command(minikubeCommands)
  .command(aksCommands)
  .command(configCommands)
  .demandCommand(1, 'You must specify a command')
  .strict()
  .help()
  .alias('help', 'h')
  .version(false)
  .wrap(100)
  .epilogue(
    `Examples:
  $ k8s minikube deploy                    Deploy default project to Minikube
  $ k8s minikube deploy -p demo-env        Deploy demo-env project to Minikube
  $ k8s minikube reset                     Reset Minikube deployment
  $ k8s aks deploy dev                     Deploy to AKS dev environment
  $ k8s aks deploy prod --dry-run          Preview AKS prod deployment
  $ k8s config list                        List available projects`,
  )
  .fail((msg, err, yargs) => {
    if (err) {
      handleError(err, 'k8s');
    } else {
      console.error(msg);
      console.error();
      yargs.showHelp();
      process.exit(1);
    }
  });

// Parse and execute
cli.parse();
