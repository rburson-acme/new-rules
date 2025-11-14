import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

export const ComposeCommandUp = 'up';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ComposeDir = path.join(__dirname, '..', '..', 'local', 'docker', 'compose');

export interface EnvironmentOverrides {
  preBuildCommands?: PostUpCommand[];
  postUpCommands?: PostUpCommand[];
}

export interface ComposeFiles {
  composeFile: string,
  defaultArgs?: string,
  preBuildCommands?: PostUpCommand[],
  postUpCommands?: PostUpCommand[],
  environmentOverrides?: Record<string, EnvironmentOverrides>
}

export interface PostUpCommand {
  description: string;
  command: string;
}

export type DeploymentType = 'docker-compose' | 'sh' | 'kubectl';

export interface DeploymentArguments {
  type?: DeploymentType;
  composing: string;
  deployTo: string;
  deployCommand: string;
  composeFile?: string;
  composeFiles?: ComposeFiles[];
  args?: string;
  preBuildCommands?: PostUpCommand[];
  postUpCommands?: PostUpCommand[];
  environmentOverrides?: Record<string, EnvironmentOverrides>;
}

export function processExitError(errorMessage: string, optionalParams?: Object, errorCode: number = 1): never {
  console.error(errorMessage, optionalParams);
  process.exit(errorCode);
}

function execCommand(command: string, description?: string): void {
  if (description) {
    console.log(description);
  }
  try {
    console.debug(`executing command: `, { command, dir: `${process.cwd()}` });
    execSync(command, { stdio: 'inherit' });
  } catch (error: any) {
    processExitError(`Command failed: ${command}`, error);
  }
}

function mergeCommandsWithOverrides(
  defaultCommands: PostUpCommand[] | undefined,
  overrides: PostUpCommand[] | undefined
): PostUpCommand[] {
  return overrides || defaultCommands || [];
}

function execute(
  deployCommand: string,
  composeFile: string,
  deployTo: string,
  args?: string,
  preBuildCommands?: PostUpCommand[],
  postUpCommands?: PostUpCommand[],
  environmentOverrides?: Record<string, EnvironmentOverrides>
) {
  const fullComposePath = path.join(ComposeDir, composeFile);

  // Apply environment-specific overrides if they exist
  const envOverride = environmentOverrides?.[deployTo];
  const finalPreBuildCommands = mergeCommandsWithOverrides(preBuildCommands, envOverride?.preBuildCommands);
  const finalPostUpCommands = mergeCommandsWithOverrides(postUpCommands, envOverride?.postUpCommands);

  // Execute pre-build commands if specified (e.g., building dependencies like srvthreds-builder)
  if (finalPreBuildCommands.length > 0) {
    console.log('Executing pre-build commands...');
    for (const cmd of finalPreBuildCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Pre-build commands executed successfully.');
  }

  execCommand(
    `docker compose -f "${fullComposePath}" ${deployCommand} ${args ? args : ''}`,
    `Executing: docker compose -f "${fullComposePath}" ${deployCommand} ${args ? args : ''}`
  );

  console.log(`Deployment command "${deployCommand}" executed successfully for "${composeFile}".`);

  if (deployCommand === ComposeCommandUp && finalPostUpCommands.length > 0) {
    console.log('Executing post-up commands...');
    for (const cmd of finalPostUpCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Post-up commands executed successfully.');
  }
}

export function executeDockerComposeDeployment({ deployTo, deployCommand, composeFile, args, preBuildCommands, postUpCommands, environmentOverrides }: DeploymentArguments): Promise<void> {
  if (!composeFile) {
    processExitError(`executeDeployment:: composeFile or composeFiles is required.`);
  }

  execute(deployCommand, composeFile, deployTo, args, preBuildCommands, postUpCommands, environmentOverrides);

  return Promise.resolve();
}

export function executeDockerComposeDeployments({ deployTo, deployCommand, composeFiles }: DeploymentArguments): Promise<void> {
  if (!composeFiles || composeFiles.length === 0) {
    processExitError(`executeDeployment:: composeFile or composeFiles is required.`);
  }

  composeFiles.forEach((compose) => {
    execute(deployCommand, compose.composeFile, deployTo, compose.defaultArgs, compose.preBuildCommands, compose.postUpCommands, compose.environmentOverrides);
  });

  return Promise.resolve();
}

export function executeShellDeployment({ deployCommand, args, preBuildCommands, postUpCommands, deployTo, environmentOverrides }: DeploymentArguments): Promise<void> {
  if (!deployCommand) {
    processExitError(`executeShellDeployment:: deployCommand is required.`);
  }

  // Apply environment-specific overrides if they exist
  const envOverride = environmentOverrides?.[deployTo];
  const finalPreBuildCommands = mergeCommandsWithOverrides(preBuildCommands, envOverride?.preBuildCommands);
  const finalPostUpCommands = mergeCommandsWithOverrides(postUpCommands, envOverride?.postUpCommands);

  // Execute pre-build commands
  if (finalPreBuildCommands.length > 0) {
    console.log('Executing pre-build commands...');
    for (const cmd of finalPreBuildCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Pre-build commands executed successfully.');
  }

  // Execute the main shell command
  execCommand(
    `${deployCommand} ${args ? args : ''}`,
    `Executing shell command: ${deployCommand} ${args ? args : ''}`
  );

  console.log(`Shell command "${deployCommand}" executed successfully.`);

  // Execute post-up commands
  if (finalPostUpCommands.length > 0) {
    console.log('Executing post-up commands...');
    for (const cmd of finalPostUpCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Post-up commands executed successfully.');
  }

  return Promise.resolve();
}

export function executeKubectlDeployment({ deployCommand, args, preBuildCommands, postUpCommands, deployTo, environmentOverrides }: DeploymentArguments): Promise<void> {
  if (!deployCommand) {
    processExitError(`executeKubectlDeployment:: deployCommand is required.`);
  }

  // Apply environment-specific overrides if they exist
  const envOverride = environmentOverrides?.[deployTo];
  const finalPreBuildCommands = mergeCommandsWithOverrides(preBuildCommands, envOverride?.preBuildCommands);
  const finalPostUpCommands = mergeCommandsWithOverrides(postUpCommands, envOverride?.postUpCommands);

  // Execute pre-build commands
  if (finalPreBuildCommands.length > 0) {
    console.log('Executing pre-build commands...');
    for (const cmd of finalPreBuildCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Pre-build commands executed successfully.');
  }

  // Execute kubectl command
  execCommand(
    `kubectl ${deployCommand} ${args ? args : ''}`,
    `Executing kubectl command: kubectl ${deployCommand} ${args ? args : ''}`
  );

  console.log(`Kubectl command "${deployCommand}" executed successfully.`);

  // Execute post-up commands
  if (finalPostUpCommands.length > 0) {
    console.log('Executing post-up commands...');
    for (const cmd of finalPostUpCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Post-up commands executed successfully.');
  }

  return Promise.resolve();
}