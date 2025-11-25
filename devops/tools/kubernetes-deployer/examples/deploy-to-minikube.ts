#!/usr/bin/env tsx
/**
 * Deploy to Minikube using the new MinikubeDeployer
 * This replaces the shell script approach with TypeScript
 *
 * Run with: npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-minikube.ts
 */

import { MinikubeDeployer } from '../src/index.js';
import { Logger, LogLevel } from '../src/utils/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDb = args.includes('--skip-db');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Set log level
  Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  console.log('🚀 Deploying SrvThreds to Minikube using TypeScript deployer\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new MinikubeDeployer({
    verbose,
    dryRun,
    skipDatabaseSetup: skipDb,
    manifestPath: 'infrastructure/local/minikube/manifests/minikube/',
  });

  try {
    // Run deployment
    const startTime = Date.now();
    const result = await deployer.deploy();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT SUCCESSFUL');
      console.log('='.repeat(60));
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🏷️  Image Tag: ${result.state.imageTag || 'dev'}`);
      console.log(`📊 Status: ${result.state.status}`);
      console.log(`📦 Resources Deployed: ${result.state.deployedResources?.length || 0}`);

      if (result.state.deployedResources && result.state.deployedResources.length > 0) {
        console.log('\nDeployed Resources:');
        result.state.deployedResources.forEach((resource) => {
          console.log(`  - ${resource.kind}/${resource.name} (${resource.namespace})`);
        });
      }

      console.log('\n💡 Next Steps:');
      console.log('   1. Check pods: kubectl get pods -n srvthreds');
      console.log('   2. View logs: kubectl logs -f deployment/srvthreds-engine -n srvthreds');
      console.log('   3. Setup port-forward: kubectl port-forward svc/srvthreds-session-agent-service 3000:3000 -n srvthreds');
      console.log('   4. Access at: http://localhost:3000');
      console.log('   5. Dashboard: minikube dashboard');

      process.exit(0);
    } else {
      console.error('\n❌ DEPLOYMENT FAILED');
      console.error('Check logs above for details');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ DEPLOYMENT FAILED');
    console.error('='.repeat(60));

    if (error instanceof Error) {
      console.error(`\nError: ${error.message}`);

      if (verbose && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }

      // Provide helpful suggestions based on error type
      if (error.message.includes('Docker')) {
        console.error('\n💡 Docker is not running. Start Docker Desktop and try again.');
      } else if (error.message.includes('Minikube')) {
        console.error('\n💡 Minikube issue detected. Try:');
        console.error('   minikube delete && minikube start');
      } else if (error.message.includes('MongoDB')) {
        console.error('\n💡 MongoDB issue detected. Try:');
        console.error('   bash infrastructure/local/docker/scripts/setup-repl.sh');
      }
    } else {
      console.error('Unknown error:', error);
    }

    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Deployment interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
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
  console.error('Unexpected error:', error);
  process.exit(1);
});
