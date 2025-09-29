#!/usr/bin/env node

import * as readline from 'readline';
import { DeploymentArguments, Composing, deployDatabases, deployServices, DeployTo, ComposeCommandDown, ComposeCommandUp } from './deployment.js';

/**
 * TODO: This needs to be refined to better define how the constants are used to simplify additions.
 * This function will parse the command arguments and return a DeploymentArguments object
 * that can be used to run the docker process.
 * @param args command line arguments: DeployTo, composing, deployCommand, overrideArgs
 * @returns DeploymentArguments
 */
function parseArguments(args: Array<string>): DeploymentArguments {
  const deployTo = args[0];
  const composing = args[1];
  const deployCommand = args[2];
  const overrideArgs = args.length > 3 ? args.slice(3).join(' ') : '';

  if (!Object.values(DeployTo).includes(deployTo)) {
    console.error(`Invalid 'deployTo' argument: ${deployTo}. Valid options are: ${Object.values(DeployTo).join(', ')}`);
    process.exit(2);
  }

  if (!Object.values(Composing).includes(composing)) {
    console.error(`Invalid 'composing' argument: ${composing}. Valid options are: ${Object.values(Composing).join(', ')}`);
    process.exit(2);
  }

  if (![ComposeCommandUp, ComposeCommandDown].includes(deployCommand)) {
    console.error(`Invalid 'deployCommand' argument: ${deployCommand}. Valid options are: ${ComposeCommandUp}, ${ComposeCommandDown}`);
    process.exit(2);
  }

  console.log('args: ', { composing, deployTo, deployCommand, overrideArgs });
  return { composing, deployTo, deployCommand, overrideArgs };
}

const createRL = () => readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query: string): Promise<string> {
  const rl = createRL();
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

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
  const args = process.argv.slice(2);
  if (args.length === 0) {
    const deployTo = await askQuestionWithSelect(`What environment are you deploying to?`, Object.values(DeployTo));
    const composing = await askQuestionWithSelect(`What are you deploying?`, Object.values(Composing));
    const deployCommand = await askQuestionWithSelect(`What command do you want to run?`, [ComposeCommandDown, ComposeCommandUp]);
    const overrideArgs = await askQuestion(`Provide override arguments here to override default configuration which are found in the defaultDeployCommandArgs object: `);
    args.push(deployTo, composing, deployCommand, overrideArgs);
  }

  const deploymentArgs = parseArguments(args);
  if (deploymentArgs.composing === Composing.All) {
    // This works either way, but would be safer to destroy services then db.
    if (deploymentArgs.deployCommand === ComposeCommandDown) {
      await deployServices(deploymentArgs);
      await deployDatabases(deploymentArgs);
    } else {
      await deployDatabases(deploymentArgs);
      await deployServices(deploymentArgs);
    }
  }
  if (deploymentArgs.composing === Composing.Databases) {
    deployDatabases(deploymentArgs);
  }
  if (deploymentArgs.composing === Composing.Services) {
    deployServices(deploymentArgs);
  }
  Promise.resolve();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}