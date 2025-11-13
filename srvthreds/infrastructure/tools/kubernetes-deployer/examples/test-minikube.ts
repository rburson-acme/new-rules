#!/usr/bin/env tsx
/**
 * Test script for MinikubeDeployer
 * Run with: npx tsx infrastructure/tools/kubernetes-deployer/examples/test-minikube.ts
 */

import { MinikubeDeployer } from '../src/deployers/MinikubeDeployer.js';
import { Logger, LogLevel } from '../src/utils/logger.js';

async function main() {
  // Set verbose logging
  Logger.setLevel(LogLevel.DEBUG);

  console.log('🧪 Testing MinikubeDeployer...\n');

  // Test 1: Instantiation
  console.log('Test 1: Instantiate MinikubeDeployer');
  const deployer = new MinikubeDeployer({
    verbose: true,
    dryRun: true, // Use dry-run mode to avoid actual deployment
    skipDatabaseSetup: true, // Skip database setup for quick test
  });

  console.log('✓ MinikubeDeployer instantiated successfully\n');

  // Test 2: Pre-deployment checks (dry-run)
  console.log('Test 2: Run pre-deployment checks (dry-run mode)');
  try {
    await deployer.deploy();
    console.log('✓ Deployment simulation completed successfully\n');
  } catch (error) {
    console.error('✗ Deployment simulation failed:', error);
    process.exit(1);
  }

  console.log('🎉 All tests passed!');
  console.log('\n📝 Next steps:');
  console.log('   1. Remove dryRun to test actual deployment');
  console.log('   2. Ensure Docker is running');
  console.log('   3. Ensure Minikube is installed');
  console.log('   4. Run: npm run minikube-create');
}

main().catch((error) => {
  console.error('Test script failed:', error);
  process.exit(1);
});
