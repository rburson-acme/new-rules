#!/usr/bin/env tsx
/**
 * Cleanup Minikube deployment using the new MinikubeDeployer
 * This destroys the entire Minikube cluster
 *
 * Run with: npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts
 */

import { MinikubeDeployer } from '../src/index.js';
import { Logger, LogLevel } from '../src/utils/logger.js';
import * as readline from 'readline';

// Helper to prompt user for confirmation
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const deleteDatabases = args.includes('--delete-databases');
  const force = args.includes('--force') || args.includes('-f');

  // Set log level
  Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  console.log('🧹 Cleaning up Minikube deployment\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new MinikubeDeployer({
    verbose,
    dryRun,
  });

  try {
    if (!force && !dryRun) {
      console.log('⚠️  WARNING: This will:');
      console.log('   • Delete the srvthreds namespace and all resources');
      console.log('   • Stop the Minikube cluster');
      console.log('   • Delete the Minikube cluster completely');

      if (deleteDatabases) {
        console.log('   • Delete host databases (MongoDB, Redis, RabbitMQ)');
      } else {
        console.log('   • Leave host databases running (use --delete-databases to stop them)');
      }

      console.log('\n💡 If you just want to reset the deployment (faster), use:');
      console.log('   npm run minikube-reset-ts\n');

      const answer = await prompt('Are you sure you want to continue? (yes/no): ');

      if (answer !== 'yes' && answer !== 'y') {
        console.log('\n❌ Cleanup cancelled');
        process.exit(0);
      }

      console.log('');
    }

    // Run cleanup
    const startTime = Date.now();
    await deployer.destroyCluster({ deleteDatabases });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('✅ CLEANUP SUCCESSFUL');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);

    if (!deleteDatabases) {
      console.log('\n📊 Host Database Status:');
      console.log('   The following databases may still be running on your host Docker:');
      console.log('   - MongoDB (mongo-repl-1)');
      console.log('   - Redis');
      console.log('   - RabbitMQ');
      console.log('');
      console.log('💡 To stop databases: npm run deploy-local-down-databases');
    }

    console.log('\n💡 To start fresh:');
    console.log('   npm run minikube-deploy-ts');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ CLEANUP FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);

      if (verbose && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Cleanup interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts [options]

Cleanup Minikube deployment by destroying the entire cluster.

Options:
  --dry-run            Run without making actual changes
  --delete-databases   Also delete host databases (MongoDB, Redis, RabbitMQ)
  --force, -f          Skip confirmation prompt
  --verbose, -v        Enable verbose logging
  --help, -h           Show this help message

Examples:
  # Cleanup with confirmation
  npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts

  # Cleanup and stop databases
  npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts --delete-databases

  # Force cleanup without confirmation
  npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts --force

  # Dry run to see what would happen
  npx tsx infrastructure/tools/kubernetes-deployer/examples/cleanup-minikube.ts --dry-run

Note: This destroys the entire Minikube cluster. If you just want to reset
the deployment (faster), use: npm run minikube-reset-ts
`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
