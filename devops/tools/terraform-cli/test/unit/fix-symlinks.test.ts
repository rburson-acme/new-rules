/**
 * Tests for fix-symlinks command
 *
 * Tests the symlink validation and fixing logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fs at the top level before any imports
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  lstatSync: vi.fn(),
  readlinkSync: vi.fn(),
  symlinkSync: vi.fn(),
  unlinkSync: vi.fn(),
}));

// Mock logger
vi.mock('../../../shared/logger.js', () => ({
  logger: {
    section: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    failure: vi.fn(),
  },
}));

// Now import after mocks
import * as fs from 'fs';
import { fixSymlinksCommand } from '../../commands/fix-symlinks.js';
import { logger } from '../../../shared/logger.js';

describe('fix-symlinks command', () => {
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockLstatSync = vi.mocked(fs.lstatSync);
  const mockReadlinkSync = vi.mocked(fs.readlinkSync);
  const mockSymlinkSync = vi.mocked(fs.symlinkSync);
  const mockUnlinkSync = vi.mocked(fs.unlinkSync);
  const mockLogger = vi.mocked(logger);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('help', () => {
    it('should show help when --help flag is provided', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await fixSymlinksCommand(['--help']);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.flat().join('\n');
      expect(output).toContain('USAGE');
      expect(output).toContain('fix-symlinks');
      expect(output).toContain('--check');
    });
  });

  describe('symlink validation', () => {
    it('should throw error when stacks directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      await expect(fixSymlinksCommand([])).rejects.toThrow('Stacks directory not found');
    });

    it('should report success when all symlinks are correct', async () => {
      // Need to return false for shared-backend-config.tf (wrong name), true for everything else
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // Wrong-named file should not exist
        if (pathStr.includes('shared-backend-config.tf')) return false;
        // Everything else exists
        return true;
      });

      // All are symlinks
      mockLstatSync.mockReturnValue({
        isSymbolicLink: () => true,
      } as fs.Stats);

      // All point to correct target
      mockReadlinkSync.mockReturnValue('../_shared/backend-config.tf');

      await fixSymlinksCommand([]);

      expect(mockLogger.success).toHaveBeenCalledWith('All symlinks are consistent!');
    });

    it('should detect wrong symlink target in check mode', async () => {
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // Wrong-named file doesn't exist
        if (pathStr.includes('shared-backend-config.tf')) return false;
        // Everything else exists
        return true;
      });

      mockLstatSync.mockReturnValue({
        isSymbolicLink: () => true,
      } as fs.Stats);

      // Wrong target
      mockReadlinkSync.mockReturnValue('../wrong/path.tf');

      // In check mode, should throw error about validation failure
      await expect(fixSymlinksCommand(['--check'])).rejects.toThrow('Symlink validation failed');

      // Should warn about wrong target
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should exit with error in check mode when issues found', async () => {
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // Stacks dir and stack dirs exist, but symlinks don't
        if (pathStr.endsWith('stacks')) return true;
        if (pathStr.includes('backend-config.tf')) return false;
        if (pathStr.includes('shared-backend')) return false;
        return true;
      });

      await expect(fixSymlinksCommand(['--check'])).rejects.toThrow('Symlink validation failed');
    });

    it('should detect file that is not a symlink', async () => {
      mockExistsSync.mockReturnValue(true);
      mockLstatSync.mockReturnValue({
        isSymbolicLink: () => false, // Not a symlink
      } as fs.Stats);

      mockUnlinkSync.mockImplementation(() => {});
      mockSymlinkSync.mockImplementation(() => {});

      // Should throw because we can't fix a regular file
      await expect(fixSymlinksCommand([])).rejects.toThrow('is not a symlink');
    });
  });

  describe('symlink fixing', () => {
    it('should create missing symlinks', async () => {
      // Track symlink creation state per stack
      const symlinkCreated: Record<string, boolean> = {};

      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('stacks')) return true;

        // shared-backend files don't exist
        if (pathStr.includes('shared-backend-config.tf')) return false;

        // Stack dirs exist
        if (!pathStr.includes('backend-config.tf')) {
          return true;
        }

        // Check if this symlink was created
        const stackMatch = pathStr.match(/stacks\/([^/]+)\/backend-config\.tf/);
        if (stackMatch) {
          const stack = stackMatch[1];
          return symlinkCreated[stack] || false;
        }

        return false;
      });

      mockLstatSync.mockReturnValue({
        isSymbolicLink: () => true,
      } as fs.Stats);

      mockReadlinkSync.mockReturnValue('../_shared/backend-config.tf');

      // Track when symlinks are created
      mockSymlinkSync.mockImplementation((_target, symlinkPath) => {
        const pathStr = String(symlinkPath);
        const stackMatch = pathStr.match(/stacks\/([^/]+)\/backend-config\.tf/);
        if (stackMatch) {
          symlinkCreated[stackMatch[1]] = true;
        }
      });

      await fixSymlinksCommand([]);

      // Should have created symlinks
      expect(mockSymlinkSync).toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining('issue(s) fixed'));
    });

    it('should warn about wrong-named symlinks in check mode', async () => {
      mockExistsSync.mockImplementation((p) => {
        const pathStr = String(p);
        // shared-backend-config.tf exists (wrong name)
        if (pathStr.includes('shared-backend-config.tf')) return true;
        // backend-config.tf doesn't exist
        if (pathStr.includes('backend-config.tf')) return false;
        return true;
      });

      mockLstatSync.mockReturnValue({
        isSymbolicLink: () => true,
      } as fs.Stats);

      mockReadlinkSync.mockReturnValue('../_shared/backend-config.tf');

      // In check mode, should throw about validation failure
      await expect(fixSymlinksCommand(['--check'])).rejects.toThrow('Symlink validation failed');

      // Should warn about wrong filename
      expect(mockLogger.warn).toHaveBeenCalled();
      const warnCalls = mockLogger.warn.mock.calls;
      expect(warnCalls.some((call) => String(call[0]).includes('Wrong filename'))).toBe(true);
    });
  });
});
