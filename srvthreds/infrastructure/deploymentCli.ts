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
  if (args.length === 0) {
    console.error("Invalid arguments provided. Please provide DeployTo, composing, deployCommand and (optional) override args: ", args);
    process.exit(2);
  }
  const deployTo = args[0];
  const composing = args[1];
  const deployCommand = args[2];
  const overrideArgs = args.length > 3 ? args.slice(3).join(' ') : '';
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  // console.log(args);
  // const deployTo = await askQuestion(`What environment are you deploying to, options ${JSON.stringify(DeployTo)} ? `);
  // const composing = await askQuestion(`What are you deploying ${JSON.stringify(Composing)} ? `);
  // const deployCommand = await askQuestion(`What command do you want to run, options ${ComposeCommandDown}, ${ComposeCommandUp} ? `);
  // const overrideArgs = await askQuestion(`Add any additional arguments you want: `);

  const deploymentArgs = parseArguments(args);
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