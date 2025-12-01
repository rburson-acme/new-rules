/**
 * Minikube Commands
 *
 * Commands for deploying to local Minikube cluster.
 * No environment concept - Minikube is always local development.
 */

import type { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';
import { MinikubeDeployer } from '../../kubernetes-deployer/src/index.js';
import { loadProjectConfig, getDefaultProject, type ProjectConfig } from '../config/project-loader.js';
import { logger } from '../../shared/logger.js';
import { formatDeploymentResult } from '../utils/output.js';

interface MinikubeOptions {
  project: string;
  verbose?: boolean;
}

interface DeployOptions extends MinikubeOptions {
  'dry-run'?: boolean;
  'skip-db'?: boolean;
}

interface CleanupOptions extends MinikubeOptions {
  'delete-dbs'?: boolean;
}

/**
 * Add common project option to command
 */
function addProjectOption(yargs: Argv): Argv<MinikubeOptions> {
  return yargs.option('project', {
    alias: 'p',
    type: 'string',
    description: 'Project to deploy',
    default: getDefaultProject(),
  }) as Argv<MinikubeOptions>;
}

/**
 * Load project config and handle errors
 */
function getProjectConfig(projectName: string): ProjectConfig {
  try {
    return loadProjectConfig(projectName);
  } catch (error) {
    logger.failure(`Failed to load project: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

/**
 * Deploy to Minikube
 */
const deployCommand: CommandModule<object, DeployOptions> = {
  command: 'deploy',
  describe: 'Deploy project to Minikube',
  builder: (yargs) =>
    addProjectOption(yargs)
      .option('dry-run', {
        type: 'boolean',
        description: 'Preview changes without applying',
        default: false,
      })
      .option('skip-db', {
        type: 'boolean',
        description: 'Skip database setup (assumes DBs are running)',
        default: false,
      }),
  handler: async (argv: ArgumentsCamelCase<DeployOptions>) => {
    const config = getProjectConfig(argv.project);

    logger.info(`Deploying ${config.name} to Minikube\n`);

    if (argv['dry-run']) {
      logger.info('DRY RUN MODE - No actual changes will be made\n');
    }

    const deployer = new MinikubeDeployer({
      verbose: argv.verbose,
      dryRun: argv['dry-run'],
      skipDatabaseSetup: argv['skip-db'],
      manifestPath: config.minikube.manifestPath,
      srvthredsPath: config.source.path,
    });

    const startTime = Date.now();
    const result = await deployer.deploy();
    const duration = Date.now() - startTime;

    formatDeploymentResult(result, config, 'minikube', duration);

    process.exit(result.success ? 0 : 1);
  },
};

/**
 * Reset Minikube deployment (keeps cluster running)
 */
const resetCommand: CommandModule<object, MinikubeOptions> = {
  command: 'reset',
  describe: 'Reset deployment (keeps cluster running)',
  builder: (yargs) => addProjectOption(yargs),
  handler: async (argv: ArgumentsCamelCase<MinikubeOptions>) => {
    const config = getProjectConfig(argv.project);

    logger.info(`Resetting ${config.name} deployment in Minikube\n`);

    const deployer = new MinikubeDeployer({
      verbose: argv.verbose,
      manifestPath: config.minikube.manifestPath,
      srvthredsPath: config.source.path,
    });

    await deployer.resetDeployment();

    logger.success('Reset complete. Cluster is still running.');
    logger.info(`To redeploy: k8s minikube deploy -p ${config.name}`);

    process.exit(0);
  },
};

/**
 * Full cleanup - deletes Minikube cluster
 */
const cleanupCommand: CommandModule<object, CleanupOptions> = {
  command: 'cleanup',
  describe: 'Full cleanup (deletes cluster)',
  builder: (yargs) =>
    addProjectOption(yargs).option('delete-dbs', {
      type: 'boolean',
      description: 'Also delete host databases',
      default: false,
    }),
  handler: async (argv: ArgumentsCamelCase<CleanupOptions>) => {
    const config = getProjectConfig(argv.project);

    logger.info(`Cleaning up ${config.name} Minikube deployment\n`);

    if (argv['delete-dbs']) {
      logger.warn('Will also delete host databases');
    }

    const deployer = new MinikubeDeployer({
      verbose: argv.verbose,
      manifestPath: config.minikube.manifestPath,
      srvthredsPath: config.source.path,
    });

    await deployer.destroyCluster({ deleteDatabases: argv['delete-dbs'] });

    logger.success('Cleanup complete.');

    process.exit(0);
  },
};

/**
 * Show deployment status
 */
const statusCommand: CommandModule<object, MinikubeOptions> = {
  command: 'status',
  describe: 'Show Minikube deployment status',
  builder: (yargs) => addProjectOption(yargs),
  handler: async (argv: ArgumentsCamelCase<MinikubeOptions>) => {
    const config = getProjectConfig(argv.project);

    logger.info(`Checking ${config.name} status in Minikube\n`);

    // Use kubectl directly for status checks
    const { execSync } = await import('child_process');

    try {
      // Check Minikube status
      logger.section('Minikube Cluster');
      execSync('minikube status', { stdio: 'inherit' });
    } catch {
      logger.warn('Minikube cluster is not running');
      process.exit(1);
    }

    try {
      // Check pods
      logger.section(`Pods in ${config.kubernetes.namespace}`);
      execSync(`kubectl get pods -n ${config.kubernetes.namespace} -o wide`, { stdio: 'inherit' });

      // Check services
      logger.section('Services');
      execSync(`kubectl get svc -n ${config.kubernetes.namespace}`, { stdio: 'inherit' });

      // Check deployments
      logger.section('Deployments');
      execSync(`kubectl get deployments -n ${config.kubernetes.namespace}`, { stdio: 'inherit' });
    } catch {
      logger.warn(`Namespace ${config.kubernetes.namespace} may not exist or has no resources`);
    }

    process.exit(0);
  },
};

/**
 * Minikube command group
 */
export const minikubeCommands: CommandModule = {
  command: 'minikube <command>',
  describe: 'Minikube deployment commands (local development)',
  builder: (yargs) =>
    yargs
      .command(deployCommand)
      .command(resetCommand)
      .command(cleanupCommand)
      .command(statusCommand)
      .demandCommand(1, 'You must specify a minikube command'),
  handler: () => {
    // This handler is never called due to demandCommand
  },
};
