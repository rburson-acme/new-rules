#!/usr/bin/env tsx
/**
 * Reset Minikube deployment using the MinikubeDeployer
 * Deletes the namespace but keeps the cluster running (faster than full cleanup)
 *
 * Run with: npm run minikube:reset
 */

import { MinikubeDeployer } from '../src/index.js';
// import { Logger, LogLevel } from '../src/utils/logger.js';
import { logger } from '../../shared/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Set log level
  // Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info('🔄 Resetting Minikube deployment\n');

  if (dryRun) {
    logger.info('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new MinikubeDeployer({
    verbose,
    dryRun,
  });

  try {
    const startTime = Date.now();
    await deployer.resetDeployment();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    logger.info('\n' + '='.repeat(60));
    logger.info('✅ RESET SUCCESSFUL');
    logger.info('='.repeat(60));
    logger.info(`⏱️  Duration: ${duration}s`);

    logger.info('\n💡 Minikube cluster is still running.');
    logger.info('💡 Host databases are still running.');
    logger.info('\n💡 To redeploy:');
    logger.info('   npm run minikube:deploy');

    process.exit(0);
  } catch (error) {
    logger.error('\n' + '='.repeat(60));
    logger.error('❌ RESET FAILED');
    logger.error('='.repeat(60));

    if (error instanceof Error) {
      logger.error(`\nError: ${error.message}`);

      if (verbose && error.stack) {
        logger.error('\nStack trace:');
        logger.error(error.stack);
      }
    } else {
      logger.error('Unknown error:', 'reset-minikube', error);
    }

    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  logger.info('\n\n⚠️  Reset interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  logger.info(`
Usage: npm run minikube:reset -- [options]

Reset Minikube deployment by deleting the namespace (faster than full cleanup).
The Minikube cluster and host databases remain running.

Options:
  --dry-run        Run without making actual changes
  --verbose, -v    Enable verbose logging
  --help, -h       Show this help message

Examples:
  # Reset deployment
  npm run minikube:reset

  # Dry run to see what would happen
  npm run minikube:reset -- --dry-run

  # Verbose mode for debugging
  npm run minikube:reset -- --verbose

Note: This keeps the Minikube cluster running. For full cleanup, use:
  npm run minikube:cleanup
`);
  process.exit(0);
}

main().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});
