/**
 * AKS Commands
 *
 * Commands for deploying to Azure Kubernetes Service.
 * Requires environment specification (dev, test, prod).
 */

import type { CommandModule, Argv, ArgumentsCamelCase } from 'yargs';
import { AKSDeployer } from '../../kubernetes-deployer/src/index.js';
import { loadProjectConfig, getDefaultProject, type ProjectConfig } from '../config/project-loader.js';
import { logger } from '../../shared/logger.js';
import { formatDeploymentResult } from '../utils/output.js';

type AKSEnvironment = 'dev' | 'test' | 'prod';

interface AKSOptions {
  env: AKSEnvironment;
  project: string;
  verbose?: boolean;
}

interface DeployOptions extends AKSOptions {
  'dry-run'?: boolean;
  tag?: string;
}

/**
 * Validate environment against project config
 */
function validateEnvironment(env: string, config: ProjectConfig): AKSEnvironment {
  if (!config.aks.environments.includes(env)) {
    logger.failure(
      `Invalid environment '${env}' for project ${config.name}. ` + `Available: ${config.aks.environments.join(', ')}`,
    );
    process.exit(1);
  }
  return env as AKSEnvironment;
}

/**
 * Add common options to AKS commands
 */
function addAKSOptions(yargs: Argv): Argv<AKSOptions> {
  return yargs
    .positional('env', {
      type: 'string',
      description: 'Environment (dev, test, prod)',
      demandOption: true,
    })
    .option('project', {
      alias: 'p',
      type: 'string',
      description: 'Project to deploy',
      default: getDefaultProject(),
    }) as Argv<AKSOptions>;
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
 * Deploy to AKS
 */
const deployCommand: CommandModule<object, DeployOptions> = {
  command: 'deploy <env>',
  describe: 'Deploy project to AKS environment',
  builder: (yargs) =>
    addAKSOptions(yargs)
      .option('dry-run', {
        type: 'boolean',
        description: 'Preview changes without applying',
        default: false,
      })
      .option('tag', {
        type: 'string',
        description: 'Docker image tag',
        default: 'latest',
      }),
  handler: async (argv: ArgumentsCamelCase<DeployOptions>) => {
    const config = getProjectConfig(argv.project);
    const env = validateEnvironment(argv.env, config);

    logger.info(`Deploying ${config.name} to AKS (${env.toUpperCase()})\n`);

    if (argv['dry-run']) {
      logger.info('DRY RUN MODE - No actual changes will be made\n');
    }

    const deployer = new AKSDeployer({
      environment: env,
      verbose: argv.verbose,
      dryRun: argv['dry-run'],
      imageTag: argv.tag,
      manifestPath: `${config.aks.manifestPath}${env}/`,
      namespace: config.kubernetes.namespace,
      srvthredsPath: config.source.path,
    });

    const startTime = Date.now();
    const result = await deployer.deploy();
    const duration = Date.now() - startTime;

    formatDeploymentResult(result, config, `aks-${env}`, duration);

    process.exit(result.success ? 0 : 1);
  },
};

/**
 * Show AKS deployment status
 */
const statusCommand: CommandModule<object, AKSOptions> = {
  command: 'status <env>',
  describe: 'Show AKS deployment status',
  builder: (yargs) => addAKSOptions(yargs),
  handler: async (argv: ArgumentsCamelCase<AKSOptions>) => {
    const config = getProjectConfig(argv.project);
    const env = validateEnvironment(argv.env, config);

    logger.info(`Checking ${config.name} status in AKS (${env.toUpperCase()})\n`);

    const { execSync } = await import('child_process');

    try {
      // Get AKS credentials first
      const naming = generateAzureNaming(env);
      logger.info(`Connecting to cluster: ${naming.clusterName}`);

      execSync(
        `az aks get-credentials --resource-group ${naming.resourceGroup} --name ${naming.clusterName} --overwrite-existing`,
        { stdio: 'inherit' },
      );

      // Check pods
      logger.section(`Pods in ${config.kubernetes.namespace}`);
      execSync(`kubectl get pods -n ${config.kubernetes.namespace} -o wide`, { stdio: 'inherit' });

      // Check services
      logger.section('Services');
      execSync(`kubectl get svc -n ${config.kubernetes.namespace}`, { stdio: 'inherit' });

      // Check deployments
      logger.section('Deployments');
      execSync(`kubectl get deployments -n ${config.kubernetes.namespace}`, { stdio: 'inherit' });
    } catch (error) {
      logger.failure(`Failed to get status: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }

    process.exit(0);
  },
};

/**
 * Rollout restart deployments
 */
const restartCommand: CommandModule<object, AKSOptions> = {
  command: 'restart <env>',
  describe: 'Rollout restart all deployments',
  builder: (yargs) => addAKSOptions(yargs),
  handler: async (argv: ArgumentsCamelCase<AKSOptions>) => {
    const config = getProjectConfig(argv.project);
    const env = validateEnvironment(argv.env, config);

    logger.info(`Restarting ${config.name} deployments in AKS (${env.toUpperCase()})\n`);

    const { execSync } = await import('child_process');

    try {
      // Get AKS credentials first
      const naming = generateAzureNaming(env);
      execSync(
        `az aks get-credentials --resource-group ${naming.resourceGroup} --name ${naming.clusterName} --overwrite-existing`,
        { stdio: 'pipe' },
      );

      // Restart each deployment
      for (const deployment of config.kubernetes.deployments) {
        logger.info(`Restarting ${deployment}...`);
        execSync(`kubectl rollout restart deployment/${deployment} -n ${config.kubernetes.namespace}`, {
          stdio: 'inherit',
        });
      }

      logger.success('All deployments restarted');
    } catch (error) {
      logger.failure(`Failed to restart: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }

    process.exit(0);
  },
};

/**
 * Generate Azure resource names following naming convention
 */
function generateAzureNaming(environment: AKSEnvironment): {
  resourceGroup: string;
  clusterName: string;
  acrName: string;
} {
  const caz = 'CAZ';
  const appName = 'SRVTHREDS';
  const envCode = environment === 'dev' ? 'D' : environment === 'test' ? 'T' : 'P';
  const region = 'E'; // East US

  return {
    resourceGroup: `${caz}-${appName}-${envCode}-${region}-RG`,
    clusterName: `${caz}-${appName}-${envCode}-${region}-AKS`,
    acrName: `${caz}${appName}${envCode}${region}ACR`.toLowerCase().replace(/-/g, ''),
  };
}

/**
 * AKS command group
 */
export const aksCommands: CommandModule = {
  command: 'aks <command>',
  describe: 'AKS deployment commands (Azure cloud)',
  builder: (yargs) =>
    yargs
      .command(deployCommand)
      .command(statusCommand)
      .command(restartCommand)
      .demandCommand(1, 'You must specify an aks command'),
  handler: () => {
    // This handler is never called due to demandCommand
  },
};
