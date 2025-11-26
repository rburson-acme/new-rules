#!/usr/bin/env tsx
/**
 * Test script for MinikubeDeployer
 * Run with: npm run minikube:test
 */

import { MinikubeDeployer } from '../src/deployers/MinikubeDeployer.js';
// import { Logger, LogLevel } from '../src/utils/logger.js';
import { logger } from '../../shared/logger.js';

async function main() {
  // Set verbose logging
  // Logger.setLevel(LogLevel.DEBUG);

  logger.info('🧪 Testing MinikubeDeployer...\n');

  // Test 1: Instantiation
  logger.info('Test 1: Instantiate MinikubeDeployer');
  const deployer = new MinikubeDeployer({
    verbose: true,
    dryRun: true, // Use dry-run mode to avoid actual deployment
    skipDatabaseSetup: true, // Skip database setup for quick test
  });

  logger.info('✓ MinikubeDeployer instantiated successfully\n');

  // Test 2: Pre-deployment checks (dry-run)
  logger.info('Test 2: Run pre-deployment checks (dry-run mode)');
  try {
    await deployer.deploy();
    logger.info('✓ Deployment simulation completed successfully\n');
  } catch (error) {
    logger.error('✗ Deployment simulation failed:', 'test-minikube', error);
    process.exit(1);
  }

  logger.info('🎉 All tests passed!');
  logger.info('\n📝 Next steps:');
  logger.info('   1. Remove dryRun to test actual deployment');
  logger.info('   2. Ensure Docker is running');
  logger.info('   3. Ensure Minikube is installed');
  logger.info('   4. Run: npm run minikube:deploy');
}

main().catch((error) => {
  logger.error('Test script failed:', error);
  process.exit(1);
});
