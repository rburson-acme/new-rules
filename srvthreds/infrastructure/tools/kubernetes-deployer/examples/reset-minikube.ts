#!/usr/bin/env tsx
/**
 * Reset Minikube deployment using the new MinikubeDeployer
 * This deletes the namespace but keeps the cluster running (faster than full cleanup)
 *
 * Run with: npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts
 */

import { MinikubeDeployer } from '../src/index.js';
import { Logger, LogLevel } from '../src/utils/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');

  // Set log level
  Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  console.log('🔄 Resetting Minikube deployment\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
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

    console.log('\n' + '='.repeat(60));
    console.log('✅ RESET SUCCESSFUL');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${duration}s`);

    console.log('\n💡 Minikube cluster is still running.');
    console.log('💡 Host databases are still running.');
    console.log('\n💡 To redeploy:');
    console.log('   npm run minikube-deploy-ts');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ RESET FAILED');
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
  console.log('\n\n⚠️  Reset interrupted by user');
  process.exit(130);
});

// Show usage if --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Usage: npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts [options]

Reset Minikube deployment by deleting the namespace (faster than full cleanup).
The Minikube cluster and host databases remain running.

Options:
  --dry-run        Run without making actual changes
  --verbose, -v    Enable verbose logging
  --help, -h       Show this help message

Examples:
  # Reset deployment
  npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts

  # Dry run to see what would happen
  npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts --dry-run

  # Verbose mode for debugging
  npx tsx infrastructure/tools/kubernetes-deployer/examples/reset-minikube.ts --verbose

Note: This keeps the Minikube cluster running. For full cleanup, use:
  npm run minikube-cleanup-ts
`);
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
