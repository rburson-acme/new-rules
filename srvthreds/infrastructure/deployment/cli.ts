#!/usr/bin/env node

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { executeDeployment, executeDeployments, DeploymentArguments, PostUpCommand, ComposeFiles, EnvironmentOverrides, processExitError } from './deployment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, 'configs', 'containerDeploymentConfig.json');

interface DeploymentTarget {
  composing: string;
  deployCommand: string;
  composeFile?: string;
  composeFiles?: ComposeFiles[];
  defaultArgs?: string;
  preBuildCommands?: PostUpCommand[];
  postUpCommands?: PostUpCommand[];
  environmentOverrides?: Record<string, EnvironmentOverrides>;
}

interface Deployment {
  name: string;
  shortName: string;
  description: string;
  environments: string[];
  target: DeploymentTarget;
}

interface DeploymentConfig {
  deployments: Deployment[];
}

async function runDeployment(deploymentArgs: DeploymentArguments): Promise<void> {
  if (deploymentArgs.composeFiles && deploymentArgs.composeFiles.length > 0) {
    await executeDeployments(deploymentArgs);
    return Promise.resolve();
  }
  if (deploymentArgs.composeFile) {
    await executeDeployment(deploymentArgs);
    return Promise.resolve();
  }
  return Promise.reject('Deployment Args did not contain any deployment files.');
}

const createRL = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestionWithSelect(query: string, options: Array<string>): Promise<string> {
  const rl = createRL();
  const fullOptions = [...options, 'Cancel'];
  return new Promise((resolve) => {
    const ask = () => {
      console.log(query);
      fullOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option}`);
      });
      rl.question('Please enter the number of your choice: ', (answer) => {
        const selection = parseInt(answer);
        if (isNaN(selection) || selection < 1 || selection > fullOptions.length) {
          console.log('Invalid selection, please try again.');
          ask();
        } else if (fullOptions[selection - 1] === 'Cancel') {
          console.log('Operation cancelled.');
          process.exit(0);
        } else {
          rl.close();
          resolve(fullOptions[selection - 1]);
        }
      });
    };
    ask();
  });
}

async function main(): Promise<void> {
  const config: DeploymentConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const args = process.argv.slice(2);

  let deployTo: string;
  let deployment: Deployment | undefined;
  console.debug(`Args: ${args}`);
  if (args.length >= 2) {
    deployTo = args[0];
    const deploymentName = args[1];
    console.debug(`Deploy To: ${deployTo} Deployment Name: ${deploymentName}`);
    deployment = config.deployments.find(d => d.name === deploymentName || d.shortName === deploymentName);

    if (!deployment) {
      processExitError(`Deployment "${deploymentName}" not found in deploymentConfig.json.`);
    }
    if (!deployment.environments.includes(deployTo)) {
      processExitError(`Environment "${deployTo}" is not valid for the deployment "${deploymentName}".`);
    }
  } else {
    const allEnvironments = [...new Set(config.deployments.flatMap(d => d.environments))];
    deployTo = await askQuestionWithSelect('Select an environment:', allEnvironments);

    const availableDeployments = config.deployments.filter(d => d.environments.includes(deployTo));
    const deploymentName = await askQuestionWithSelect(
      'Select a deployment:',
      availableDeployments.map(d => `${d.name} (${d.shortName}) - ${d.description}`)
    );
    const selectedName = deploymentName.split(' (')[0];
    deployment = availableDeployments.find(d => d.name === selectedName);
  }

  if (!deployment) {
    processExitError('Could not determine a deployment to run.');
  }

  const deploymentArgs: DeploymentArguments = {
    deployTo,
    composing: deployment.target.composing,
    deployCommand: deployment.target.deployCommand,
    composeFile: deployment.target.composeFile,
    composeFiles: deployment.target.composeFiles,
    args: deployment.target.defaultArgs,
    preBuildCommands: deployment.target.preBuildCommands,
    postUpCommands: deployment.target.postUpCommands,
    environmentOverrides: deployment.target.environmentOverrides,
  };

  console.log('Executing deployment:', {
    deployment: deployment.name,
    ...deploymentArgs
  });

  await runDeployment(deploymentArgs)
    .catch((reason: any) => processExitError("Failed to execute deployment: ", reason) );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e: any) {
    processExitError('Main execution failure: ', e);
  }
}