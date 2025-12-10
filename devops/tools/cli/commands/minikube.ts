/**
 * Minikube Commands
 *
 * Simplified minikube deployment commands.
 *
 * Usage:
 *   npm run minikube -p <project>              # Start/update all services
 *   npm run minikube -p <project> --build      # Rebuild images
 *   npm run minikube -p <project> --recreate   # Force recreate containers
 *   npm run minikube -p <project> --profile infra  # Only infra profile
 *   npm run minikube:stop -p <project>         # Stop services
 *   npm run minikube:reset -p <project>        # Full reset
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProjectConfig, getProjectDir } from '../utils/project-loader.js';
import { logger, createLogger } from '../../shared/logger.js';
import { execCommand, execCommandAsync, commandExists } from '../../shared/shell.js';
import type { ResolvedProjectConfig } from '../schemas/project-config.js';

const log = createLogger('minikube');

export interface MinikubeUpOptions {
  project: string;
  profile?: string;
  build?: boolean;
  recreate?: boolean;
  dryRun?: boolean;
}

export interface MinikubeStopOptions {
  project: string;
  dryRun?: boolean;
}

export interface MinikubeResetOptions {
  project: string;
  dryRun?: boolean;
}

export interface MinikubeStatusOptions {
  project: string;
}

export interface MinikubeDeleteOptions {
  dryRun?: boolean;
}

/**
 * Check if minikube is running
 */
async function isMinikubeRunning(): Promise<boolean> {
  const result = execCommand('minikube status --format "{{.Host}}"', {
    verbose: false,
    context: 'minikube',
  });
  return result.success && result.stdout.trim() === 'Running';
}

/**
 * Get minikube docker environment variables
 */
async function getMinikubeDockerEnv(): Promise<Record<string, string>> {
  const result = execCommand('minikube docker-env --shell bash', {
    verbose: false,
    context: 'minikube',
  });

  if (!result.success) {
    throw new Error('Failed to get minikube docker environment');
  }

  const envVars: Record<string, string> = {};
  result.stdout.split('\n').forEach((line) => {
    const match = line.match(/export (.+)="(.+)"/);
    if (match) {
      const [, key, value] = match;
      if (key && value) {
        envVars[key] = value;
      }
    }
  });

  return envVars;
}

/**
 * Start minikube with default configuration
 */
async function startMinikube(options: { cpus?: number; memory?: number } = {}): Promise<void> {
  const cpus = options.cpus || 4;
  const memory = options.memory || 7836;

  log.info('Starting minikube cluster...');
  const startResult = await execCommandAsync(
    'minikube',
    ['start', '--driver=docker', `--cpus=${cpus}`, `--memory=${memory}`],
    { context: 'minikube', verbose: true },
  );

  if (!startResult.success) {
    throw new Error('Failed to start minikube');
  }

  // Configure restart policy
  log.info('Configuring minikube container restart policy...');
  await execCommandAsync('docker', ['update', '--restart=unless-stopped', 'minikube'], {
    context: 'minikube',
  });

  // Enable common addons
  log.info('Enabling minikube addons...');
  await execCommandAsync('minikube', ['addons', 'enable', 'ingress'], { context: 'minikube' });
  await execCommandAsync('minikube', ['addons', 'enable', 'metrics-server'], { context: 'minikube' });

  logger.success('Minikube started successfully');
}

/**
 * Start/update minikube deployment
 *
 * Deployment flow:
 * 1. Start infrastructure (mongo, redis, rabbitmq) via Docker Compose
 * 2. Run infra hooks (e.g., MongoDB replica set init)
 * 3. Build app images into Minikube's Docker daemon
 * 4. Deploy app services as K8s pods using kubectl apply -k
 *
 * This mirrors cloud deployment where infra is managed services
 * and apps run as K8s pods.
 */
export async function minikubeUp(options: MinikubeUpOptions): Promise<void> {
  const { project, profile = 'all', build, recreate, dryRun } = options;

  logger.section(`Minikube deployment: ${project}`);

  // Load project configuration
  const config = loadProjectConfig(project);
  const projectDir = getProjectDir(project);
  const composePath = path.join(projectDir, 'docker-compose.generated.yaml');
  const manifestsPath = path.join(projectDir, 'manifests', 'overlays', 'minikube');

  // Verify generated file exists
  if (!fs.existsSync(composePath)) {
    throw new Error(`Generated compose file not found: ${composePath}\n` + `Run first: npm run generate -p ${project}`);
  }
  logger.success('Found generated compose file');

  // Verify K8s manifests exist
  if (!fs.existsSync(manifestsPath)) {
    throw new Error(`K8s manifests not found: ${manifestsPath}\n` + `Manifests are required for K8s deployment`);
  }
  logger.success('Found K8s manifests');

  // Pre-flight checks
  await runPreflightChecks();

  // Ensure minikube is running
  const running = await isMinikubeRunning();
  if (!running) {
    log.info('Minikube is not running');
    if (dryRun) {
      log.info('[DRY RUN] Would start minikube');
    } else {
      await startMinikube();
    }
  } else {
    logger.success('Minikube is running');
  }

  // Get minikube docker environment for building images
  log.info('Configuring Docker to use Minikube environment...');
  const dockerEnv = dryRun ? {} : await getMinikubeDockerEnv();

  // Determine profile execution order
  const profilesToRun = expandProfileOrder(config, profile);

  for (const profileToRun of profilesToRun) {
    if (profileToRun === 'infra') {
      // Infrastructure runs via Docker Compose (not K8s)
      // These are accessible from K8s via host.minikube.internal
      await startInfrastructure(composePath, projectDir, dockerEnv, { build, recreate }, dryRun);

      // Run infra hooks (e.g., MongoDB replica set init)
      await runProfileHooks(config, profileToRun, projectDir, dryRun);
    } else if (profileToRun === 'build') {
      // Build images into Minikube's Docker daemon
      await buildImages(composePath, projectDir, dockerEnv, dryRun);
    } else if (profileToRun === 'app') {
      // Deploy app services as K8s pods
      await deployToKubernetes(config, manifestsPath, dryRun);
    }
  }

  logger.success('Minikube deployment complete');
  printAccessInfo(config);
}

/**
 * Start infrastructure services via Docker Compose
 */
async function startInfrastructure(
  composePath: string,
  projectDir: string,
  dockerEnv: Record<string, string>,
  options: { build?: boolean; recreate?: boolean },
  dryRun?: boolean,
): Promise<void> {
  const args = ['compose', '-f', composePath, '--profile', 'infra', 'up', '-d'];

  if (options.build) {
    args.push('--build');
  }
  if (options.recreate) {
    args.push('--force-recreate');
  }

  if (dryRun) {
    log.info('[DRY RUN] Would start infrastructure:');
    log.info(`  docker ${args.join(' ')}`);
  } else {
    log.info('Starting infrastructure services...');
    const result = await execCommandAsync('docker', args, {
      cwd: projectDir,
      env: { ...process.env, ...dockerEnv },
      context: 'docker',
      verbose: true,
    });
    if (!result.success) {
      throw new Error('Failed to start infrastructure services');
    }
    logger.success('Infrastructure services started');
  }
}

/**
 * Build app images into Minikube's Docker daemon
 */
async function buildImages(
  composePath: string,
  projectDir: string,
  dockerEnv: Record<string, string>,
  dryRun?: boolean,
): Promise<void> {
  // Build the builder image first, then app images
  const buildArgs = ['compose', '-f', composePath, '--profile', 'build', 'build'];
  const appBuildArgs = ['compose', '-f', composePath, '--profile', 'app', 'build'];

  if (dryRun) {
    log.info('[DRY RUN] Would build images:');
    log.info(`  docker ${buildArgs.join(' ')}`);
    log.info(`  docker ${appBuildArgs.join(' ')}`);
  } else {
    log.info('Building images...');

    // Build builder image
    log.info('  Building builder image...');
    const buildResult = await execCommandAsync('docker', buildArgs, {
      cwd: projectDir,
      env: { ...process.env, ...dockerEnv },
      context: 'docker',
      verbose: true,
    });
    if (!buildResult.success) {
      throw new Error('Failed to build builder image');
    }

    // Build app images
    log.info('  Building app images...');
    const appResult = await execCommandAsync('docker', appBuildArgs, {
      cwd: projectDir,
      env: { ...process.env, ...dockerEnv },
      context: 'docker',
      verbose: true,
    });
    if (!appResult.success) {
      throw new Error('Failed to build app images');
    }

    logger.success('Images built');
  }
}

/**
 * Deploy app services to Kubernetes using manifests
 */
async function deployToKubernetes(
  config: ResolvedProjectConfig,
  manifestsPath: string,
  dryRun?: boolean,
): Promise<void> {
  const namespace = config.environments.minikube.namespace || config.name;

  if (dryRun) {
    log.info('[DRY RUN] Would deploy to Kubernetes:');
    log.info(`  kubectl create namespace ${namespace}`);
    log.info(`  kubectl apply -k ${manifestsPath}`);
  } else {
    log.info('Deploying to Kubernetes...');

    // Ensure namespace exists
    execCommand(`kubectl create namespace ${namespace}`, { context: 'kubectl' });

    // Apply manifests using kustomize
    const applyResult = execCommand(`kubectl apply -k ${manifestsPath}`, {
      context: 'kubectl',
      verbose: true,
    });
    if (!applyResult.success) {
      throw new Error('Failed to apply Kubernetes manifests');
    }

    // Wait for deployments to be ready
    log.info('  Waiting for pods to be ready...');
    execCommand(`kubectl rollout status deployment --namespace ${namespace} --timeout=120s`, { context: 'kubectl' });

    logger.success('Kubernetes deployment complete');
  }
}

/**
 * Stop minikube services (keeps data)
 */
export async function minikubeStop(options: MinikubeStopOptions): Promise<void> {
  const { project, dryRun } = options;

  logger.section(`Stopping minikube: ${project}`);

  const projectDir = getProjectDir(project);
  const composePath = path.join(projectDir, 'docker-compose.generated.yaml');

  if (!fs.existsSync(composePath)) {
    throw new Error(`Generated compose file not found: ${composePath}`);
  }

  const args = ['compose', '-f', composePath, '--profile', 'all', 'stop'];

  if (dryRun) {
    log.info(`[DRY RUN] Would execute: docker ${args.join(' ')}`);
  } else {
    const result = await execCommandAsync('docker', args, {
      cwd: projectDir,
      context: 'docker',
      verbose: true,
    });
    if (!result.success) {
      throw new Error('Failed to stop services');
    }
    logger.success('Services stopped');
  }
}

/**
 * Full reset - removes containers, networks, and volumes
 */
export async function minikubeReset(options: MinikubeResetOptions): Promise<void> {
  const { project, dryRun } = options;

  logger.section(`Resetting minikube: ${project}`);
  logger.warn('This will delete all containers, networks, and volumes!');

  const config = loadProjectConfig(project);
  const projectDir = getProjectDir(project);
  const composePath = path.join(projectDir, 'docker-compose.generated.yaml');

  if (!fs.existsSync(composePath)) {
    throw new Error(`Generated compose file not found: ${composePath}`);
  }

  const args = ['compose', '-f', composePath, '--profile', 'all', 'down', '-v'];

  if (dryRun) {
    log.info(`[DRY RUN] Would execute: docker ${args.join(' ')}`);
    log.info(`[DRY RUN] Would delete K8s namespace: ${config.environments.minikube.namespace}`);
  } else {
    // Stop and remove containers, networks, volumes
    await execCommandAsync('docker', args, {
      cwd: projectDir,
      context: 'docker',
    });
    logger.success('Containers and volumes removed');

    // Delete K8s namespace if it exists
    const namespace = config.environments.minikube.namespace || project;
    execCommand(`kubectl delete namespace ${namespace}`, { context: 'kubectl' });
    logger.success(`Namespace ${namespace} deleted (if existed)`);
  }

  logger.success('Reset complete');
}

/**
 * Delete minikube cluster entirely
 *
 * Use when minikube gets into a corrupted state (apiserver not starting, etc.)
 */
export async function minikubeDelete(options: MinikubeDeleteOptions): Promise<void> {
  const { dryRun } = options;

  logger.section('Deleting minikube cluster');
  logger.warn('This will completely delete the minikube cluster and all data!');

  if (dryRun) {
    log.info('[DRY RUN] Would execute: minikube delete');
  } else {
    const result = await execCommandAsync('minikube', ['delete'], {
      context: 'minikube',
      verbose: true,
    });

    if (!result.success) {
      throw new Error('Failed to delete minikube cluster');
    }

    logger.success('Minikube cluster deleted');
    log.info('\nTo start fresh: npm run minikube -p <project>');
  }
}

/**
 * Show status of minikube services
 *
 * Shows both infrastructure (Docker Compose) and app pods (Kubernetes)
 */
export async function minikubeStatus(options: MinikubeStatusOptions): Promise<void> {
  const { project } = options;

  logger.section(`Minikube status: ${project}`);

  const config = loadProjectConfig(project);
  const projectDir = getProjectDir(project);
  const composePath = path.join(projectDir, 'docker-compose.generated.yaml');
  const namespace = config.environments.minikube.namespace || project;

  // Check if minikube is running
  const running = await isMinikubeRunning();
  if (!running) {
    logger.warn('Minikube is not running');
    return;
  }
  logger.success('Minikube is running');

  // Get minikube docker environment
  const dockerEnv = await getMinikubeDockerEnv();

  // Show infrastructure status (Docker Compose containers)
  log.info('\nInfrastructure (Docker Compose):');
  const infraResult = execCommand(`docker compose -f ${composePath} --profile infra ps --format json`, {
    cwd: projectDir,
    env: { ...process.env, ...dockerEnv },
    context: 'docker',
  });

  if (infraResult.success && infraResult.stdout.trim()) {
    const lines = infraResult.stdout.trim().split('\n');
    for (const line of lines) {
      try {
        const c = JSON.parse(line);
        const status = c.Health ? `${c.State} (${c.Health})` : c.State;
        const ports =
          c.Publishers?.filter((p: any) => p.PublishedPort)
            .map((p: any) => `${p.PublishedPort}:${p.TargetPort}`)
            .join(', ') || '';
        log.info(`  ${c.Name.padEnd(25)} ${status.padEnd(20)} ${ports}`);
      } catch {
        // Skip invalid JSON lines
      }
    }
  } else {
    log.info('  No infrastructure containers running');
  }

  // Show application pods (Kubernetes)
  log.info(`\nApplication Pods (namespace: ${namespace}):`);
  const podsResult = execCommand(`kubectl get pods -n ${namespace} -o wide --no-headers`, { context: 'kubectl' });

  if (podsResult.success && podsResult.stdout.trim()) {
    const header = `  ${'NAME'.padEnd(35)} ${'READY'.padEnd(10)} ${'STATUS'.padEnd(15)} ${'RESTARTS'.padEnd(10)} AGE`;
    log.info(header);
    log.info(`  ${'─'.repeat(80)}`);

    const podLines = podsResult.stdout.trim().split('\n');
    for (const line of podLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [name, ready, status, restarts, age] = parts;
        log.info(`  ${name.padEnd(35)} ${ready.padEnd(10)} ${status.padEnd(15)} ${restarts.padEnd(10)} ${age}`);
      }
    }
  } else {
    log.info('  No pods running');
    log.info(`  Deploy with: npm run minikube -p ${project}`);
  }

  // Show services
  log.info('\nServices:');
  const svcResult = execCommand(`kubectl get svc -n ${namespace} -o wide --no-headers`, { context: 'kubectl' });

  if (svcResult.success && svcResult.stdout.trim()) {
    const svcLines = svcResult.stdout.trim().split('\n');
    for (const line of svcLines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5) {
        const [name, type, , , ports] = parts;
        log.info(`  ${name.padEnd(35)} ${type.padEnd(12)} ${ports}`);
      }
    }
  }

  // Show how to access services
  log.info('\n' + '─'.repeat(50));
  log.info('Useful commands:');
  log.info(`  kubectl get pods -n ${namespace}`);
  log.info(`  kubectl logs -f deployment/<name> -n ${namespace}`);
  log.info(`  kubectl port-forward svc/<service> <local>:<remote> -n ${namespace}`);
}

/**
 * Run pre-flight checks
 */
async function runPreflightChecks(): Promise<void> {
  // Check Docker
  if (!commandExists('docker')) {
    throw new Error('Docker is not installed. Please install Docker Desktop.');
  }

  // Check docker is running
  const dockerInfo = execCommand('docker info', { context: 'docker' });
  if (!dockerInfo.success) {
    throw new Error('Docker daemon is not running. Please start Docker Desktop.');
  }
  logger.success('Docker is running');

  // Check minikube
  if (!commandExists('minikube')) {
    throw new Error('Minikube is not installed. Install from: https://minikube.sigs.k8s.io/');
  }
  logger.success('Minikube is installed');

  // Check kubectl
  if (!commandExists('kubectl')) {
    throw new Error('kubectl is not installed. Install from: https://kubernetes.io/docs/tasks/tools/');
  }
  logger.success('kubectl is installed');
}

/**
 * Expand a profile into ordered list of profiles to run
 *
 * If profile is 'all' and 'all' contains [infra, app], returns ['infra', 'app']
 * This allows hooks to run between profile starts.
 */
function expandProfileOrder(config: ResolvedProjectConfig, profileName: string): string[] {
  const profileDef = config.profiles[profileName];

  if (!profileDef) {
    throw new Error(`Unknown profile: ${profileName}`);
  }

  // Check if this profile contains other profiles (not services)
  const containsProfiles = profileDef.every((item) => config.profiles[item] !== undefined);

  if (containsProfiles && profileDef.length > 1) {
    // This is a composite profile like 'all: [infra, app]'
    // Return the sub-profiles in order
    return profileDef;
  }

  // This is a leaf profile (contains services)
  return [profileName];
}

/**
 * Run profile hooks (postUp scripts) after a profile's services are up
 */
async function runProfileHooks(
  config: ResolvedProjectConfig,
  profileName: string,
  projectDir: string,
  dryRun?: boolean,
): Promise<void> {
  const hooks = config.profileHooks?.[profileName];

  if (!hooks?.postUp || hooks.postUp.length === 0) {
    return;
  }

  log.info(`\nRunning hooks for profile '${profileName}'...`);

  for (const hook of hooks.postUp) {
    const scriptPath = path.join(projectDir, hook.script);

    if (dryRun) {
      log.info(`  [DRY RUN] ${hook.description}`);
      log.info(`    Would run: ${scriptPath}`);
    } else {
      log.info(`  ${hook.description}`);

      // Make script executable
      execCommand(`chmod +x ${scriptPath}`, { context: 'shell' });

      // Run the script with optional args
      const args = hook.args || [];
      const result = await execCommandAsync(scriptPath, args, {
        cwd: projectDir,
        context: 'hook',
        verbose: true,
      });

      if (!result.success) {
        throw new Error(`Hook failed: ${hook.description}`);
      }
      logger.success('Hook completed');
    }
  }
}

/**
 * Print access information after deployment
 */
function printAccessInfo(config: ResolvedProjectConfig): void {
  log.info('\n' + '─'.repeat(50));
  log.info('Access information:');

  // Find services with ports
  const servicesWithPorts = Object.entries(config.services).filter(
    ([_, s]) => s.ports && s.ports.length > 0 && s.deploy.includes('minikube'),
  );

  for (const [name, service] of servicesWithPorts) {
    for (const port of service.ports || []) {
      const [hostPort] = port.split(':');
      log.info(`  ${name}: http://localhost:${hostPort}`);
    }
  }

  log.info('\nUseful commands:');
  log.info(`  View logs:    docker compose logs -f <service>`);
  log.info(`  Stop:         npm run minikube:stop -p ${config.name}`);
  log.info(`  Reset:        npm run minikube:reset -p ${config.name}`);
}

/**
 * Register minikube commands with yargs
 */
export function registerMinikubeCommands(yargs: any) {
  return yargs
    .command(
      'minikube',
      'Start/update minikube deployment',
      (y: any) =>
        y
          .option('project', {
            alias: 'p',
            type: 'string',
            description: 'Project name',
            demandOption: true,
          })
          .option('profile', {
            type: 'string',
            description: 'Docker Compose profile to use (default: all)',
            default: 'all',
          })
          .option('build', {
            type: 'boolean',
            description: 'Rebuild images before starting',
            default: false,
          })
          .option('recreate', {
            type: 'boolean',
            description: 'Force recreate containers',
            default: false,
          })
          .option('dry-run', {
            type: 'boolean',
            description: 'Show what would be done without executing',
            default: false,
          }),
      async (argv: any) => {
        try {
          await minikubeUp({
            project: argv.project,
            profile: argv.profile,
            build: argv.build,
            recreate: argv.recreate,
            dryRun: argv['dry-run'],
          });
        } catch (error) {
          logger.failure(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .command(
      'minikube:stop',
      'Stop minikube services (keeps data)',
      (y: any) =>
        y
          .option('project', {
            alias: 'p',
            type: 'string',
            description: 'Project name',
            demandOption: true,
          })
          .option('dry-run', {
            type: 'boolean',
            description: 'Show what would be done without executing',
            default: false,
          }),
      async (argv: any) => {
        try {
          await minikubeStop({
            project: argv.project,
            dryRun: argv['dry-run'],
          });
        } catch (error) {
          logger.failure(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .command(
      'minikube:reset',
      'Full reset - removes containers, networks, and volumes',
      (y: any) =>
        y
          .option('project', {
            alias: 'p',
            type: 'string',
            description: 'Project name',
            demandOption: true,
          })
          .option('dry-run', {
            type: 'boolean',
            description: 'Show what would be done without executing',
            default: false,
          }),
      async (argv: any) => {
        try {
          await minikubeReset({
            project: argv.project,
            dryRun: argv['dry-run'],
          });
        } catch (error) {
          logger.failure(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .command(
      'minikube:status',
      'Show status of minikube services',
      (y: any) =>
        y.option('project', {
          alias: 'p',
          type: 'string',
          description: 'Project name',
          demandOption: true,
        }),
      async (argv: any) => {
        try {
          await minikubeStatus({
            project: argv.project,
          });
        } catch (error) {
          logger.failure(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .command(
      'minikube:delete',
      'Delete minikube cluster (use when cluster is corrupted)',
      (y: any) =>
        y.option('dry-run', {
          type: 'boolean',
          description: 'Show what would be done without executing',
          default: false,
        }),
      async (argv: any) => {
        try {
          await minikubeDelete({
            dryRun: argv['dry-run'],
          });
        } catch (error) {
          logger.failure(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    );
}
