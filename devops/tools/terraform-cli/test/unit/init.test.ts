/**
 * Tests for init command
 *
 * Tests argument validation and help output.
 * Note: Full integration tests would require more complex mocking.
 */

import { describe, it, expect, vi } from 'vitest';

// Since ESM mocking is complex, we test what we can without deep mocking
describe('init command', () => {
  describe('help', () => {
    it('should show help content when --help flag is provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Dynamically import to get fresh module
      const { initCommand } = await import('../../commands/init.js');
      await initCommand(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('USAGE');
      expect(output).toContain('init');
      expect(output).toContain('Initialize Terraform');
      expect(output).toContain('--no-state');
      expect(output).toContain('EXAMPLES');

      consoleSpy.mockRestore();
    });
  });

  describe('argument validation', () => {
    it('should require environment argument', async () => {
      const { initCommand } = await import('../../commands/init.js');

      // Empty args should show help and throw
      await expect(initCommand([])).rejects.toThrow();
    });
  });
});

/**
 * These tests would require more complex mocking that's difficult with ESM:
 *
 * - should initialize all stacks for an environment
 * - should initialize specific stacks when provided
 * - should show resource counts by default
 * - should skip state counts when --no-state flag is provided
 * - should handle init failures gracefully
 * - should display environment configuration
 *
 * Consider using integration tests with actual terraform directories
 * or refactoring the command to be more testable.
 */
