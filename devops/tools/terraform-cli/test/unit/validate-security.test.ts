/**
 * Tests for validate-security command
 *
 * Tests argument validation and help output.
 * Note: Full integration tests would require Azure CLI mocking.
 */

import { describe, it, expect, vi } from 'vitest';

describe('validate-security command', () => {
  describe('help', () => {
    it('should show help content when --help flag is provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { validateSecurityCommand } = await import('../../commands/validate-security.js');
      await validateSecurityCommand(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('USAGE');
      expect(output).toContain('validate-security');
      expect(output).toContain('Network Security');
      expect(output).toContain('RBAC');
      expect(output).toContain('--json');
      expect(output).toContain('EXAMPLES');

      consoleSpy.mockRestore();
    });
  });

  describe('argument validation', () => {
    it('should require environment argument', async () => {
      const { validateSecurityCommand } = await import('../../commands/validate-security.js');

      // Empty args should show help and throw
      await expect(validateSecurityCommand([])).rejects.toThrow();
    });
  });
});

/**
 * These tests would require Azure CLI mocking that's complex with ESM:
 *
 * - should use resource group from config when not provided
 * - should use override resource group when provided
 * - should run Azure CLI commands for security validation
 * - should handle Azure CLI errors gracefully
 * - should output JSON when --json flag is provided
 *
 * Consider using integration tests with a test Azure subscription
 * or refactoring to use dependency injection for the shell executor.
 */
