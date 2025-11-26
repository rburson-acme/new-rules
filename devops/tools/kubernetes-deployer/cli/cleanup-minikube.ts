#!/usr/bin/env tsx
/**
 * Cleanup Minikube deployment using the MinikubeDeployer
 * Destroys the entire Minikube cluster
 *
 * Run with: npm run minikube:cleanup
 */

import { MinikubeDeployer } from '../src/index.js';
// import { Logger, LogLevel } from '../src/utils/logger.js';
import * as readline from 'readline';
import { logger } from '../../shared/logger.js';

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
  // Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info('🧹 Cleaning up Minikube deployment\n');

  if (dryRun) {
    logger.info('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new MinikubeDeployer({
    verbose,
    dryRun,
  });

  try {
    if (!force && !dryRun) {
      logger.info('⚠️  WARNING: This will:');
      logger.info('   • Delete the srvthreds namespace and all resources');
      logger.info('   • Stop the Minikube cluster');
      logger.info('   • Delete the Minikube cluster completely');

      if (deleteDatabases) {
        logger.info('   • Delete host databases (MongoDB, Redis, RabbitMQ)');
      } else {
        logger.info('   • Leave host databases running (use --delete-databases to stop them)');
      }

      logger.info('\n💡 If you just want to reset the deployment (faster), use:');
      logger.info('   npm run minikube:reset\n');

      const answer = await prompt('Are you sure you want to continue? (yes/no): ');

      if (answer !== 'yes' && answer !== 'y') {
        logger.info('\n❌ Cleanup cancelled');
        process.exit(0);
      }

      logger.info('');
    }

    // Run cleanup
    const startTime = Date.now();
    await deployer.destroyCluster({ deleteDatabases });
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ CLEANUP SUCCESSFUL');
    logger.info('='.repeat(60));
    logger.info(`⏱️  Duration: ${duration}s`);

    if (!deleteDatabases) {
      logger.info('\n📊 Host Database Status:');
      logger.info('   The following databases may still be running on your host Docker:');
      logger.info('   - MongoDB (mongo-repl-1)');
      logger.info('   - Redis');
      logger.info('   - RabbitMQ');
      logger.info('');
      logger.info('💡 To stop databases: npm run deploy-local-down-databases');
    }

    logger.info('\n💡 To start fresh:');
    logger.info('   npm run minikube:deploy');

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
  logger.info('\n\n⚠️  Cleanup interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  logger.info(`
Usage: npm run minikube:cleanup -- [options]

Cleanup Minikube deployment by destroying the entire cluster.

Options:
  --dry-run            Run without making actual changes
  --delete-databases   Also delete host databases (MongoDB, Redis, RabbitMQ)
  --force, -f          Skip confirmation prompt
  --verbose, -v        Enable verbose logging
  --help, -h           Show this help message

Examples:
  # Cleanup with confirmation
  npm run minikube:cleanup

  # Cleanup and stop databases
  npm run minikube:cleanup -- --delete-databases

  # Force cleanup without confirmation
  npm run minikube:cleanup -- --force

  # Dry run to see what would happen
  npm run minikube:cleanup -- --dry-run

Note: This destroys the entire Minikube cluster. If you just want to reset
the deployment (faster), use: npm run minikube:reset
`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
