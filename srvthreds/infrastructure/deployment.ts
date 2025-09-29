import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Exit Code	Convention	Meaning
 * 0	Success	The program completed successfully.
 * 1	General Error	A generic, not categorized error occurred.
 * 2	Misuse of Shell/Command	The command was used incorrectly, for example, invalid arguments or bad syntax.
 * 126	Command invoked cannot execute	The command was found but cannot be executed (e.g., permission denied).
 * 127	Command not found	The command specified in the script was not found.
 * 128	Invalid argument to exit	(Used by some shells) The exit value given was out of range.
 * 128 + N	Fatal Error Signal N	The process was terminated by a fatal signal (e.g., SIGKILL is signal 9, so a process terminated by it might have an exit code of 137).
 */

export const ComposeCommandUp = 'up';
export const ComposeCommandDown = 'down';
export const Composing = {
  All: 'all',
  Databases: 'databases',
  Services: 'services',
  Database: 'database',
  service: 'service'
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ComposeDir = path.join(__dirname, '/dockerContainerSetup');
const DeployCommand = [ComposeCommandUp, ComposeCommandDown];

const defaultDeployCommandArgs = {
  UpDeployWait: '-d --wait',
  DownVolume: '-v',
  DownVolumeRMILocal: '-v --rmi local'
}

const ComposeFiles = {
  localDatabases: 'docker-compose-db.yml',
  localServices: 'docker-compose-services.yml',
}

function execCommand(command: string, description?: string): void {
  if (description) {
    console.log(description);
  }
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    process.exit(1);
  }
}

function fetchComposeFile(deployTo: string, composing: string): string {
  let composeFile = '';
  if (composing === Composing.Databases) {
    if (deployTo === DeployTo.Local) composeFile = path.join(ComposeDir, ComposeFiles.localDatabases);
    if (deployTo === DeployTo.Development) composeFile = path.join(ComposeDir, ComposeFiles.localDatabases);
    if (deployTo === DeployTo.Test) composeFile = path.join(ComposeDir, ComposeFiles.localDatabases);
    if (deployTo === DeployTo.Staging) composeFile = path.join(ComposeDir, ComposeFiles.localDatabases);
    if (deployTo === DeployTo.Production) composeFile = path.join(ComposeDir, ComposeFiles.localDatabases);
  }
  if (composing === Composing.Services) {
    if (deployTo === DeployTo.Local) composeFile = path.join(ComposeDir, ComposeFiles.localServices);
    if (deployTo === DeployTo.Development) composeFile = path.join(ComposeDir, ComposeFiles.localServices);
    if (deployTo === DeployTo.Test) composeFile = path.join(ComposeDir, ComposeFiles.localServices);
    if (deployTo === DeployTo.Staging) composeFile = path.join(ComposeDir, ComposeFiles.localServices);
    if (deployTo === DeployTo.Production) composeFile = path.join(ComposeDir, ComposeFiles.localServices);
  }
  if (!composeFile) {
    console.error('fetchComposeFile:: Incorrect DeployTo or environment provided to get compose file: ', { deployTo, composing });
    process.exit(2);
  }
  return composeFile;
}

function fetchDockerArgs(deployCommand: string, composing: string): string {
  const foundCommand = DeployCommand.find((c) => c === deployCommand);

  if (!foundCommand) {
    console.error('fetchDockerArgs:: Incorrect DeployCommand provided: ', deployCommand);
    process.exit(2);
  }

  let dockerArgs = '';
  if (composing === Composing.Databases) {
    dockerArgs = foundCommand === ComposeCommandUp ? defaultDeployCommandArgs.UpDeployWait : defaultDeployCommandArgs.DownVolume;
  }
  if (composing === Composing.Services) {
    dockerArgs = foundCommand === ComposeCommandUp ? defaultDeployCommandArgs.UpDeployWait : defaultDeployCommandArgs.DownVolumeRMILocal;
  }

  if (!dockerArgs) {
    console.error('fetchDockerArgs:: Incorrect Composing type provided to build docker args: ', dockerArgs);
    process.exit(2);
  }

  return dockerArgs;
}

export interface DeploymentArguments {
  composing: string,
  deployTo: string,
  deployCommand: string,
  overrideArgs?: string,
}

export const DeployTo = {
  Local: 'local',
  Development: 'dev',
  Test: 'test',
  Staging: 'staging',
  Production: 'prod'
};

export function deployDatabases({ deployTo, deployCommand, overrideArgs }: { deployTo: string, deployCommand: string, overrideArgs?: string }): Promise<void> {
  const composeFile = fetchComposeFile(deployTo, Composing.Databases);
  const dockerArgs = fetchDockerArgs(deployCommand, Composing.Databases);

  execCommand(
    `docker compose -f "${composeFile}" ${deployCommand} ${overrideArgs ? overrideArgs : dockerArgs}`,
    `Executing: "${composeFile}" ${deployCommand} ${overrideArgs ? overrideArgs : dockerArgs}`
  );

  console.log('deployDatabases:: docker compose execution successful...');

  if (deployCommand === ComposeCommandUp) {
    // Setup the replica set
    execCommand(
      `docker exec mongo-repl-1 mongosh "mongodb://localhost:27017" --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"`,
      'Setting up MongoDB replica set...'
    );

    console.log('deployDatabases:: Replica set initiated.');
  }
  return Promise.resolve();
}

export function deployServices({ deployTo, deployCommand, overrideArgs }: { deployTo: string, deployCommand: string, overrideArgs?: string }): Promise<void> {
  const composeFile = fetchComposeFile(deployTo, Composing.Services);
  const dockerArgs = fetchDockerArgs(deployCommand, Composing.Services);

  execCommand(
    `docker compose -f "${composeFile}" ${deployCommand} ${overrideArgs ? overrideArgs : dockerArgs}`,
    `Executing: "${composeFile}" ${deployCommand} ${overrideArgs ? overrideArgs : dockerArgs}`
  );

  console.log('deployServices:: docker compose execution successful...');
  return Promise.resolve();
}