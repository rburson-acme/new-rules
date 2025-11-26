#!/usr/bin/env tsx
/**
 * Deploy to Azure AKS using the AKSDeployer
 * CLI entry point for AKS deployments (dev, test, prod)
 *
 * Run with: npm run aks:deploy -- <environment>
 */

import { AKSDeployer } from '../src/index.js';
// import { Logger, LogLevel } from '../src/utils/logger.js';
import { logger } from '../../shared/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);

  // Get environment from first argument
  const environment = args[0] as 'dev' | 'test' | 'prod' | undefined;

  if (!environment || !['dev', 'test', 'prod'].includes(environment)) {
    logger.error('❌ Error: Environment is required (dev, test, or prod)');
    logger.error('\nUsage: npm run aks:deploy -- <environment> [options]');
    logger.error('\nExamples:');
    logger.error('  npm run aks:deploy -- dev');
    logger.error('  npm run aks:deploy -- test --verbose');
    logger.error('  npm run aks:deploy -- prod --dry-run');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const imageTag = args.find(arg => arg.startsWith('--tag='))?.split('=')[1] || 'latest';

  // Set log level
  // Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  logger.info(`🚀 Deploying SrvThreds to AKS (${environment.toUpperCase()} environment)\n`);

  if (dryRun) {
    logger.info('🔍 DRY RUN MODE - No actual changes will be made\n');
  }

  // Create deployer
  const deployer = new AKSDeployer({
    environment,
    verbose,
    dryRun,
    imageTag,
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
      logger.info(`🌍 Environment: ${environment}`);
      logger.info(`🏷️  Image Tag: ${imageTag}`);
      logger.info(`📊 Status: ${result.state.status}`);
      logger.info(`📦 Resources Deployed: ${result.state.deployedResources?.length || 0}`);

      if (result.state.deployedResources && result.state.deployedResources.length > 0) {
        logger.info('\nDeployed Resources:');
        result.state.deployedResources.forEach((resource) => {
          logger.info(`  - ${resource.kind}/${resource.name} (${resource.namespace})`);
        });
      }

      logger.info('\n💡 Next Steps:');
      logger.info(`   1. Check pods: kubectl get pods -n srvthreds`);
      logger.info(`   2. View logs: kubectl logs -f deployment/srvthreds-engine -n srvthreds`);
      logger.info(`   3. Check services: kubectl get svc -n srvthreds`);

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
      if (error.message.includes('Azure')) {
        logger.error('\n💡 Azure authentication issue. Try:');
        logger.error('   az login');
      } else if (error.message.includes('AKS')) {
        logger.error('\n💡 AKS cluster issue. Verify:');
        logger.error('   1. Cluster exists in Azure portal');
        logger.error('   2. You have access to the resource group');
        logger.error('   3. Cluster is running');
      } else if (error.message.includes('ACR')) {
        logger.error('\n💡 ACR issue. Verify:');
        logger.error('   1. ACR exists in Azure portal');
        logger.error('   2. You have push permissions');
        logger.error('   3. ACR is attached to AKS cluster');
      }
    } else {
      logger.error('Unknown error:', 'deploy-to-aks', error);
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
Usage: npm run aks:deploy -- <environment> [options]

Deploy SrvThreds to Azure AKS cluster for specified environment.

Arguments:
  environment          Environment to deploy to: dev, test, or prod (required)

Options:
  --dry-run            Run without making actual changes
  --verbose, -v        Enable verbose logging
  --tag=<tag>          Docker image tag (default: latest)
  --help, -h           Show this help message

Examples:
  # Deploy to dev environment
  npm run aks:deploy -- dev

  # Deploy to prod with specific tag
  npm run aks:deploy -- prod --tag=v1.2.3

  # Dry run deployment to test
  npm run aks:deploy -- test --dry-run

  # Deploy with verbose logging
  npm run aks:deploy -- dev --verbose

Prerequisites:
  1. Azure CLI installed: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
  2. Logged in to Azure: az login
  3. AKS cluster provisioned via Terraform
  4. ACR attached to AKS cluster
  5. kubectl installed
`);
  process.exit(0);
}

main().catch((error) => {
  logger.error('Unexpected error:', error);
  process.exit(1);
});
