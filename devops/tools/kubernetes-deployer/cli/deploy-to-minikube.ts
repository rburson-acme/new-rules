#!/usr/bin/env tsx
/**
 * Deploy to Minikube using the MinikubeDeployer
 * CLI entry point for Minikube deployments
 *
 * Run with: npm run minikube:deploy
 */

import { MinikubeDeployer } from '../src/index.js';
// import { Logger, LogLevel } from '../src/utils/logger.js';
import { logger } from '../../shared/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDb = args.includes('--skip-db');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Set log level
  // Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info('🚀 Deploying SrvThreds to Minikube using TypeScript deployer\n');

  if (dryRun) {
    logger.info('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new MinikubeDeployer({
    verbose,
    dryRun,
    skipDatabaseSetup: skipDb,
    manifestPath: 'minikube/srvthreds/manifests/minikube/',
  });

  try {
    // Run deployment
    const startTime = Date.now();
    const result = await deployer.deploy();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      logger.info('\n' + '='.repeat(60));
      logger.info('✅ DEPLOYMENT SUCCESSFUL');
      logger.info('='.repeat(60));
      logger.info(`⏱️  Duration: ${duration}s`);
      logger.info(`🏷️  Image Tag: ${result.state.imageTag || 'dev'}`);
      logger.info(`📊 Status: ${result.state.status}`);
      logger.info(`📦 Resources Deployed: ${result.state.deployedResources?.length || 0}`);

      if (result.state.deployedResources && result.state.deployedResources.length > 0) {
        logger.info('\nDeployed Resources:');
        result.state.deployedResources.forEach((resource) => {
          logger.info(`  - ${resource.kind}/${resource.name} (${resource.namespace})`);
        });
      }

      logger.info('\n💡 Next Steps:');
      logger.info('   1. Check pods: kubectl get pods -n srvthreds');
      logger.info('   2. View logs: kubectl logs -f deployment/srvthreds-engine -n srvthreds');
      logger.info('   3. Setup port-forward: kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds');
      logger.info('   4. Access at: http://localhost:3000');
      logger.info('   5. Dashboard: minikube dashboard');

      process.exit(0);
    } else {
      logger.error('\n❌ DEPLOYMENT FAILED');
      logger.error('Check logs above for details');
      process.exit(1);
    }
  } catch (error) {
    logger.error('\n' + '='.repeat(60));
    logger.error('❌ DEPLOYMENT FAILED');
    logger.error('='.repeat(60));

    if (error instanceof Error) {
      logger.error(`\nError: ${error.message}`);

      if (verbose && error.stack) {
        logger.error('\nStack trace:');
        logger.error(error.stack);
      }

      // Provide helpful suggestions based on error type
      if (error.message.includes('Docker')) {
        logger.error('\n💡 Docker is not running. Start Docker Desktop and try again.');
      } else if (error.message.includes('Minikube')) {
        logger.error('\n💡 Minikube issue detected. Try:');
        logger.error('   minikube delete && minikube start');
      } else if (error.message.includes('MongoDB')) {
        logger.error('\n💡 MongoDB issue detected. Try:');
        logger.error('   bash ../srvthreds/infrastructure/local/docker/scripts/setup-repl.sh');
      }
    } else {
      logger.error('Unknown error:', 'deploy-to-minikube', error);
    }

    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  logger.info('\n\n⚠️  Deployment interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  logger.info(`
Usage: npm run minikube:deploy -- [options]

Options:
  --dry-run        Run without making actual changes
  --skip-db        Skip database setup (assumes databases are already running)
  --verbose, -v    Enable verbose logging
  --help, -h       Show this help message

Examples:
  # Normal deployment
  npm run minikube:deploy

  # Dry run to test without deploying
  npm run minikube:deploy -- --dry-run

  # Skip database setup if already running
  npm run minikube:deploy -- --skip-db

  # Verbose mode for debugging
  npm run minikube:deploy -- --verbose
`);
  process.exit(0);
}

main().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});
