import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

export const ComposeCommandUp = 'up';
// export const ComposeCommandDown = 'down';
// export const Composing = {
//   All: 'all',
//   Databases: 'databases',
//   Services: 'services',
// };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ComposeDir = path.join(__dirname, '/dockerCompose');

export interface ComposeFiles {
  composeFile: string,
  defaultArgs?: string,
  postUpCommands?: PostUpCommand[]
}

export interface PostUpCommand {
  description: string;
  command: string;
}

export interface DeploymentArguments {
  composing: string;
  deployTo: string;
  deployCommand: string;
  composeFile?: string;
  composeFiles?: ComposeFiles[];
  args?: string;
  postUpCommands?: PostUpCommand[];
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

function execute(deployCommand: string, composeFile: string, args?: string, postUpCommands?: PostUpCommand[]) {
  const fullComposePath = path.join(ComposeDir, composeFile);

  execCommand(
    `docker compose -f "${fullComposePath}" ${deployCommand} ${args ? args : ''}`,
    `Executing: docker compose -f "${fullComposePath}" ${deployCommand} ${args ? args : ''}`
  );

  console.log(`Deployment command "${deployCommand}" executed successfully for "${composeFile}".`);

  if (deployCommand === ComposeCommandUp && postUpCommands && postUpCommands.length > 0) {
    console.log('Executing post-up commands...');
    for (const cmd of postUpCommands) {
      execCommand(cmd.command, cmd.description);
    }
    console.log('Post-up commands executed successfully.');
  }
}

export function executeDeployment({ deployCommand, composeFile, args, postUpCommands }: DeploymentArguments): Promise<void> {
  if (!composeFile) {
    console.error('executeDeployment:: composeFile or composeFiles is required.');
    process.exit(1);
  }

  execute(deployCommand, composeFile, args, postUpCommands);
  return Promise.resolve();
}

export function executeDeployments({ deployCommand, composeFiles }: DeploymentArguments): Promise<void> {
  if (!composeFiles || composeFiles.length === 0) {
    console.error('executeDeployment:: composeFile or composeFiles is required.');
    process.exit(1);
  }

  composeFiles.forEach((compose) => {
    execute(deployCommand, compose.composeFile, compose.defaultArgs, compose.postUpCommands);
  })
  return Promise.resolve();
}