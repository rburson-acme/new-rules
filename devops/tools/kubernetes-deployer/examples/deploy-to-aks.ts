#!/usr/bin/env tsx
/**
 * Deploy to Azure AKS using the new AKSDeployer
 * Supports dev, test, and prod environments
 *
 * Run with: npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts <environment>
 */

import { AKSDeployer } from '../src/index.js';
import { Logger, LogLevel } from '../src/utils/logger.js';

async function main() {
  // Parse command line args
  const args = process.argv.slice(2);

  // Get environment from first argument
  const environment = args[0] as 'dev' | 'test' | 'prod' | undefined;

  if (!environment || !['dev', 'test', 'prod'].includes(environment)) {
    console.error('❌ Error: Environment is required (dev, test, or prod)');
    console.error('\nUsage: npm run aks-deploy-ts <environment> [options]');
    console.error('\nExamples:');
    console.error('  npm run aks-deploy-ts dev');
    console.error('  npm run aks-deploy-ts test -- --verbose');
    console.error('  npm run aks-deploy-ts prod -- --dry-run');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const imageTag = args.find(arg => arg.startsWith('--tag='))?.split('=')[1] || 'latest';

  // Set log level
  Logger.setLevel(verbose ? LogLevel.DEBUG : LogLevel.INFO);

  console.log(`🚀 Deploying SrvThreds to AKS (${environment.toUpperCase()} environment)\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No actual changes will be made\n');
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
      console.log('\n' + '='.repeat(60));
      console.log('✅ DEPLOYMENT SUCCESSFUL');
      console.log('='.repeat(60));
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`🌍 Environment: ${environment}`);
      console.log(`🏷️  Image Tag: ${imageTag}`);
      console.log(`📊 Status: ${result.state.status}`);
      console.log(`📦 Resources Deployed: ${result.state.deployedResources?.length || 0}`);

      if (result.state.deployedResources && result.state.deployedResources.length > 0) {
        console.log('\nDeployed Resources:');
        result.state.deployedResources.forEach((resource) => {
          console.log(`  - ${resource.kind}/${resource.name} (${resource.namespace})`);
        });
      }

      console.log('\n💡 Next Steps:');
      console.log(`   1. Check pods: kubectl get pods -n srvthreds`);
      console.log(`   2. View logs: kubectl logs -f deployment/srvthreds-engine -n srvthreds`);
      console.log(`   3. Check services: kubectl get svc -n srvthreds`);

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
      if (error.message.includes('Azure')) {
        console.error('\n💡 Azure authentication issue. Try:');
        console.error('   az login');
      } else if (error.message.includes('AKS')) {
        console.error('\n💡 AKS cluster issue. Verify:');
        console.error('   1. Cluster exists in Azure portal');
        console.error('   2. You have access to the resource group');
        console.error('   3. Cluster is running');
      } else if (error.message.includes('ACR')) {
        console.error('\n💡 ACR issue. Verify:');
        console.error('   1. ACR exists in Azure portal');
        console.error('   2. You have push permissions');
        console.error('   3. ACR is attached to AKS cluster');
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
Usage: npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts <environment> [options]

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
  npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts dev

  # Deploy to prod with specific tag
  npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts prod --tag=v1.2.3

  # Dry run deployment to test
  npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts test --dry-run

  # Deploy with verbose logging
  npx tsx infrastructure/tools/kubernetes-deployer/examples/deploy-to-aks.ts dev --verbose

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
  console.error('Unexpected error:', error);
  process.exit(1);
});
