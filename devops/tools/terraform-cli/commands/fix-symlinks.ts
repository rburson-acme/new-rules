/**
 * Fix Symlinks command - Validates and fixes Terraform backend symlink consistency
 *
 * Migrated from: terraform/scripts/fix-symlink-consistency.sh
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../shared/logger.js';
import { ExecutionError } from '../../shared/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const FIX_SYMLINKS_COMMAND_DESCRIPTION = 'Validate and fix Terraform backend symlink consistency';

interface SymlinkStatus {
  stack: string;
  exists: boolean;
  isSymlink: boolean;
  target: string | null;
  expectedTarget: string;
  isCorrect: boolean;
  issue?: string;
}

const EXPECTED_SYMLINK_TARGET = '../_shared/backend-config.tf';
const STACKS = ['keyvault', 'acr', 'cosmosdb', 'redis', 'servicebus', 'aks', 'appgateway', 'monitoring'];

export async function fixSymlinksCommand(args: string[]): Promise<void> {
  if (args.includes('--help')) {
    printHelp();
    return;
  }

  const checkOnly = args.includes('--check');
  const terraformDir = path.join(__dirname, '../../..', 'terraform');
  const stacksDir = path.join(terraformDir, 'stacks');

  logger.section('SYMLINK CONSISTENCY CHECK');

  // Verify stacks directory exists
  if (!fs.existsSync(stacksDir)) {
    throw new ExecutionError(`Stacks directory not found: ${stacksDir}`);
  }

  // Check all symlinks
  const statuses: SymlinkStatus[] = [];

  for (const stack of STACKS) {
    const status = checkSymlink(stacksDir, stack);
    statuses.push(status);
  }

  // Report status
  const correct = statuses.filter((s) => s.isCorrect);
  const incorrect = statuses.filter((s) => !s.isCorrect);

  logger.info('Symlink Status:');
  for (const status of statuses) {
    if (status.isCorrect) {
      logger.success(`${status.stack}/backend-config.tf -> ${status.target}`);
    } else {
      logger.warn(`${status.stack}: ${status.issue}`, 'symlinks');
    }
  }

  console.log('');
  logger.info(`Correct: ${correct.length}/${statuses.length}`);

  if (incorrect.length === 0) {
    logger.success('All symlinks are consistent!');
    return;
  }

  if (checkOnly) {
    logger.warn(`Found ${incorrect.length} issue(s). Run without --check to fix.`, 'symlinks');
    throw new ExecutionError(`Symlink validation failed: ${incorrect.length} issue(s) found`);
  }

  // Fix issues
  logger.section('FIXING SYMLINKS');

  for (const status of incorrect) {
    await fixSymlink(stacksDir, status);
  }

  // Verify fixes
  console.log('');
  logger.info('Verifying fixes...');

  let fixedCount = 0;
  for (const status of incorrect) {
    const newStatus = checkSymlink(stacksDir, status.stack);
    if (newStatus.isCorrect) {
      logger.success(`Fixed: ${status.stack}/backend-config.tf`);
      fixedCount++;
    } else {
      logger.failure(`Still broken: ${status.stack} - ${newStatus.issue}`);
    }
  }

  console.log('');
  if (fixedCount === incorrect.length) {
    logger.success(`All ${fixedCount} issue(s) fixed!`);
  } else {
    throw new ExecutionError(`Fixed ${fixedCount}/${incorrect.length} issues. Some issues remain.`);
  }
}

function checkSymlink(stacksDir: string, stack: string): SymlinkStatus {
  const stackDir = path.join(stacksDir, stack);
  const symlinkPath = path.join(stackDir, 'backend-config.tf');
  const wrongNamePath = path.join(stackDir, 'shared-backend-config.tf');

  // Check for wrong name first
  if (fs.existsSync(wrongNamePath)) {
    const stats = fs.lstatSync(wrongNamePath);
    if (stats.isSymbolicLink()) {
      return {
        stack,
        exists: true,
        isSymlink: true,
        target: fs.readlinkSync(wrongNamePath),
        expectedTarget: EXPECTED_SYMLINK_TARGET,
        isCorrect: false,
        issue: 'Wrong filename: shared-backend-config.tf (should be backend-config.tf)',
      };
    }
  }

  // Check if stack directory exists
  if (!fs.existsSync(stackDir)) {
    return {
      stack,
      exists: false,
      isSymlink: false,
      target: null,
      expectedTarget: EXPECTED_SYMLINK_TARGET,
      isCorrect: false,
      issue: 'Stack directory does not exist',
    };
  }

  // Check if symlink exists
  if (!fs.existsSync(symlinkPath)) {
    return {
      stack,
      exists: false,
      isSymlink: false,
      target: null,
      expectedTarget: EXPECTED_SYMLINK_TARGET,
      isCorrect: false,
      issue: 'Missing backend-config.tf symlink',
    };
  }

  const stats = fs.lstatSync(symlinkPath);

  // Check if it's a symlink
  if (!stats.isSymbolicLink()) {
    return {
      stack,
      exists: true,
      isSymlink: false,
      target: null,
      expectedTarget: EXPECTED_SYMLINK_TARGET,
      isCorrect: false,
      issue: 'backend-config.tf is not a symlink',
    };
  }

  // Check symlink target
  const target = fs.readlinkSync(symlinkPath);

  if (target !== EXPECTED_SYMLINK_TARGET) {
    return {
      stack,
      exists: true,
      isSymlink: true,
      target,
      expectedTarget: EXPECTED_SYMLINK_TARGET,
      isCorrect: false,
      issue: `Wrong target: ${target} (expected ${EXPECTED_SYMLINK_TARGET})`,
    };
  }

  return {
    stack,
    exists: true,
    isSymlink: true,
    target,
    expectedTarget: EXPECTED_SYMLINK_TARGET,
    isCorrect: true,
  };
}

async function fixSymlink(stacksDir: string, status: SymlinkStatus): Promise<void> {
  const stackDir = path.join(stacksDir, status.stack);
  const symlinkPath = path.join(stackDir, 'backend-config.tf');
  const wrongNamePath = path.join(stackDir, 'shared-backend-config.tf');

  logger.info(`Fixing ${status.stack}...`, 'symlinks');

  // Handle wrong filename case
  if (fs.existsSync(wrongNamePath)) {
    logger.info(`  Removing wrong-named symlink: shared-backend-config.tf`, 'symlinks');
    fs.unlinkSync(wrongNamePath);
  }

  // Remove existing incorrect symlink if present
  if (fs.existsSync(symlinkPath)) {
    const stats = fs.lstatSync(symlinkPath);
    if (stats.isSymbolicLink()) {
      logger.info(`  Removing incorrect symlink`, 'symlinks');
      fs.unlinkSync(symlinkPath);
    } else {
      throw new ExecutionError(`Cannot fix ${status.stack}: backend-config.tf exists but is not a symlink`);
    }
  }

  // Create correct symlink
  logger.info(`  Creating symlink: backend-config.tf -> ${EXPECTED_SYMLINK_TARGET}`, 'symlinks');
  fs.symlinkSync(EXPECTED_SYMLINK_TARGET, symlinkPath);
}

function printHelp(): void {
  console.log(`
Validate and fix Terraform backend symlink consistency

USAGE:
  terraform-cli fix-symlinks [--check]

OPTIONS:
  --check       Validate only, don't fix issues (exit code 1 if issues found)
  --help        Show this help message

DESCRIPTION:
  This command ensures all Terraform stacks have consistent backend-config.tf
  symlinks pointing to the shared configuration at ../_shared/backend-config.tf.

  Stacks checked: ${STACKS.join(', ')}

EXAMPLES:
  # Check symlink consistency
  terraform-cli fix-symlinks --check

  # Fix any symlink issues
  terraform-cli fix-symlinks
`);
}
