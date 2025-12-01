/**
 * Config Commands
 *
 * Commands for listing and inspecting project configurations.
 */

import type { CommandModule, ArgumentsCamelCase } from 'yargs';
import { listProjects, loadProjectConfig, validateProjectPaths } from '../config/project-loader.js';
import { logger } from '../../shared/logger.js';

interface ShowOptions {
  project: string;
  verbose?: boolean;
}

/**
 * List available projects
 */
const listCommand: CommandModule = {
  command: 'list',
  describe: 'List available projects',
  handler: () => {
    const projects = listProjects();

    if (projects.length === 0) {
      logger.warn('No projects found in projects/ directory');
      process.exit(0);
    }

    logger.section('Available Projects');

    for (const projectName of projects) {
      try {
        const config = loadProjectConfig(projectName);
        logger.info(`  ${projectName.padEnd(20)} ${config.description}`);
      } catch {
        logger.info(`  ${projectName.padEnd(20)} (invalid config)`);
      }
    }

    logger.info('');
    logger.info(`Use 'k8s config show <project>' for details`);

    process.exit(0);
  },
};

/**
 * Show project configuration details
 */
const showCommand: CommandModule<object, ShowOptions> = {
  command: 'show <project>',
  describe: 'Show project configuration',
  builder: (yargs) =>
    yargs.positional('project', {
      type: 'string',
      description: 'Project name',
      demandOption: true,
    }),
  handler: (argv: ArgumentsCamelCase<ShowOptions>) => {
    try {
      const config = loadProjectConfig(argv.project);

      logger.section(`Project: ${config.name}`);
      logger.info(`  Description: ${config.description}`);
      logger.info('');

      logger.section('Source Paths');
      logger.info(`  Project Root:     ${config.source.path}`);
      logger.info(`  Compose Files:    ${config.source.composePath}`);
      logger.info(`  Deploy Configs:   ${config.source.configPath}`);
      logger.info('');

      logger.section('Docker');
      logger.info(`  Builder Image:    ${config.docker.builderImage}`);
      logger.info(`  Services:`);
      for (const svc of config.docker.services) {
        logger.info(`    - ${svc.name}: ${svc.image}`);
      }
      logger.info('');

      logger.section('Kubernetes');
      logger.info(`  Namespace:        ${config.kubernetes.namespace}`);
      logger.info(`  Deployments:`);
      for (const dep of config.kubernetes.deployments) {
        logger.info(`    - ${dep}`);
      }
      logger.info('');

      logger.section('Minikube');
      logger.info(`  Manifest Path:    ${config.minikube.manifestPath}`);
      logger.info('');

      logger.section('AKS');
      logger.info(`  Manifest Path:    ${config.aks.manifestPath}`);
      logger.info(`  Environments:     ${config.aks.environments.join(', ')}`);
      logger.info('');

      // Validate paths exist
      const validation = validateProjectPaths(config);
      if (!validation.valid) {
        logger.warn('Some paths do not exist:');
        for (const missing of validation.missing) {
          logger.info(`  - ${missing}`);
        }
      } else {
        logger.success('All source paths exist');
      }

      process.exit(0);
    } catch (error) {
      logger.failure(`Failed to load project: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  },
};

/**
 * Config command group
 */
export const configCommands: CommandModule = {
  command: 'config <command>',
  describe: 'Project configuration commands',
  builder: (yargs) =>
    yargs.command(listCommand).command(showCommand).demandCommand(1, 'You must specify a config command'),
  handler: () => {
    // This handler is never called due to demandCommand
  },
};
