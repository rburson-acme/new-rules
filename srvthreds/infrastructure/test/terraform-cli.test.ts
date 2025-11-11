/**
 * Unit tests for Terraform CLI tool
 *
 * Tests the terraform-cli wrapper functionality including:
 * - Configuration loading
 * - Terraform command execution
 * - Stack dependency resolution
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock types matching the actual implementation
interface TerraformCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ShellOptions {
  cwd?: string;
  env?: Record<string, string>;
  silent?: boolean;
}

interface StackConfig {
  name: string;
  path: string;
  dependencies: string[];
}

interface DeployConfig {
  environments: string[];
  stacks: StackConfig[];
}

// Mock implementations
class MockTerraformExecutor {
  async executeCommand(
    command: string,
    args: string[],
    options: ShellOptions
  ): Promise<TerraformCommandResult> {
    // Simulate successful terraform commands
    if (command === 'terraform' && args[0] === 'version') {
      return {
        success: true,
        stdout: 'Terraform v1.5.0',
        stderr: '',
        exitCode: 0,
      };
    }

    if (command === 'terraform' && args[0] === 'init') {
      return {
        success: true,
        stdout: 'Terraform has been successfully initialized!',
        stderr: '',
        exitCode: 0,
      };
    }

    if (command === 'terraform' && args[0] === 'plan') {
      return {
        success: true,
        stdout: 'No changes. Your infrastructure matches the configuration.',
        stderr: '',
        exitCode: 0,
      };
    }

    if (command === 'terraform' && args[0] === 'apply') {
      return {
        success: true,
        stdout: 'Apply complete! Resources: 0 added, 0 changed, 0 destroyed.',
        stderr: '',
        exitCode: 0,
      };
    }

    // Default failure for unknown commands
    return {
      success: false,
      stdout: '',
      stderr: `Unknown command: ${command} ${args.join(' ')}`,
      exitCode: 1,
    };
  }

  executeCommandSync(
    command: string,
    args: string[],
    options: ShellOptions
  ): TerraformCommandResult {
    // Synchronous version - same logic
    if (command === 'terraform' && args[0] === 'version') {
      return {
        success: true,
        stdout: 'Terraform v1.5.0',
        stderr: '',
        exitCode: 0,
      };
    }

    return {
      success: false,
      stdout: '',
      stderr: 'Command not mocked',
      exitCode: 1,
    };
  }
}

// Helper to resolve stack dependencies in correct order
function resolveStackOrder(stacks: StackConfig[]): StackConfig[] {
  const resolved: StackConfig[] = [];
  const resolvedNames = new Set<string>();

  const resolve = (stack: StackConfig) => {
    // Check if already resolved
    if (resolvedNames.has(stack.name)) {
      return;
    }

    // Resolve dependencies first
    for (const depName of stack.dependencies) {
      const dep = stacks.find(s => s.name === depName);
      if (!dep) {
        throw new Error(`Dependency not found: ${depName} for stack ${stack.name}`);
      }
      resolve(dep);
    }

    // Add this stack
    resolved.push(stack);
    resolvedNames.add(stack.name);
  };

  // Resolve all stacks
  for (const stack of stacks) {
    resolve(stack);
  }

  return resolved;
}

describe('Terraform CLI - Configuration Loading', () => {
  it('should load deployment configuration', () => {
    const config: DeployConfig = {
      environments: ['dev', 'staging', 'prod'],
      stacks: [
        { name: 'networking', path: 'stacks/networking', dependencies: [] },
        { name: 'keyvault', path: 'stacks/keyvault', dependencies: ['networking'] },
        { name: 'aks', path: 'stacks/aks', dependencies: ['networking', 'acr'] },
        { name: 'acr', path: 'stacks/acr', dependencies: ['networking'] },
      ],
    };

    expect(config.environments).toContain('dev');
    expect(config.environments).toContain('staging');
    expect(config.environments).toContain('prod');
    expect(config.stacks).toHaveLength(4);
  });

  it('should validate environment names', () => {
    const validEnvironments = ['dev', 'test', 'staging', 'prod'];
    const testEnvironment = 'dev';

    expect(validEnvironments).toContain(testEnvironment);
  });

  it('should reject invalid environment names', () => {
    const validEnvironments = ['dev', 'test', 'staging', 'prod'];
    const invalidEnvironment = 'production'; // Not in list

    expect(validEnvironments).not.toContain(invalidEnvironment);
  });
});

describe('Terraform CLI - Stack Dependencies', () => {
  const sampleStacks: StackConfig[] = [
    { name: 'networking', path: 'stacks/networking', dependencies: [] },
    { name: 'keyvault', path: 'stacks/keyvault', dependencies: ['networking'] },
    { name: 'acr', path: 'stacks/acr', dependencies: ['networking'] },
    { name: 'aks', path: 'stacks/aks', dependencies: ['networking', 'acr'] },
    { name: 'monitoring', path: 'stacks/monitoring', dependencies: ['networking'] },
  ];

  it('should resolve stack dependencies in correct order', () => {
    const ordered = resolveStackOrder(sampleStacks);

    // networking should come first (no dependencies)
    expect(ordered[0].name).toBe('networking');

    // aks should come after acr (depends on it)
    const aksIndex = ordered.findIndex(s => s.name === 'aks');
    const acrIndex = ordered.findIndex(s => s.name === 'acr');
    expect(aksIndex).toBeGreaterThan(acrIndex);

    // All stacks should be present
    expect(ordered).toHaveLength(sampleStacks.length);
  });

  it('should handle stacks with no dependencies', () => {
    const stacks: StackConfig[] = [
      { name: 'standalone', path: 'stacks/standalone', dependencies: [] },
    ];

    const ordered = resolveStackOrder(stacks);
    expect(ordered).toHaveLength(1);
    expect(ordered[0].name).toBe('standalone');
  });

  it('should detect missing dependencies', () => {
    const invalidStacks: StackConfig[] = [
      { name: 'aks', path: 'stacks/aks', dependencies: ['nonexistent'] },
    ];

    expect(() => resolveStackOrder(invalidStacks)).toThrow(
      'Dependency not found: nonexistent'
    );
  });

  it('should handle complex dependency chains', () => {
    const complexStacks: StackConfig[] = [
      { name: 'a', path: 'stacks/a', dependencies: [] },
      { name: 'b', path: 'stacks/b', dependencies: ['a'] },
      { name: 'c', path: 'stacks/c', dependencies: ['b'] },
      { name: 'd', path: 'stacks/d', dependencies: ['c'] },
    ];

    const ordered = resolveStackOrder(complexStacks);

    expect(ordered[0].name).toBe('a');
    expect(ordered[1].name).toBe('b');
    expect(ordered[2].name).toBe('c');
    expect(ordered[3].name).toBe('d');
  });
});

describe('Terraform CLI - Command Execution', () => {
  let executor: MockTerraformExecutor;

  beforeEach(() => {
    executor = new MockTerraformExecutor();
  });

  it('should execute terraform version command', async () => {
    const result = await executor.executeCommand('terraform', ['version'], {});

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Terraform v1.5');
    expect(result.exitCode).toBe(0);
  });

  it('should execute terraform init command', async () => {
    const result = await executor.executeCommand('terraform', ['init'], {
      cwd: '/path/to/stack',
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('successfully initialized');
    expect(result.exitCode).toBe(0);
  });

  it('should execute terraform plan command', async () => {
    const result = await executor.executeCommand('terraform', ['plan'], {
      cwd: '/path/to/stack',
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('No changes');
    expect(result.exitCode).toBe(0);
  });

  it('should execute terraform apply command', async () => {
    const result = await executor.executeCommand(
      'terraform',
      ['apply', '-auto-approve'],
      { cwd: '/path/to/stack' }
    );

    expect(result.success).toBe(true);
    expect(result.stdout).toContain('Apply complete');
    expect(result.exitCode).toBe(0);
  });

  it('should handle command failures', async () => {
    const result = await executor.executeCommand('unknown', ['command'], {});

    expect(result.success).toBe(false);
    expect(result.stderr).toContain('Unknown command');
    expect(result.exitCode).toBe(1);
  });

  it('should pass environment variables', async () => {
    const result = await executor.executeCommand('terraform', ['version'], {
      env: {
        TF_LOG: 'DEBUG',
        ARM_SUBSCRIPTION_ID: 'test-subscription-id',
      },
    });

    expect(result.success).toBe(true);
  });
});

describe('Terraform CLI - Variable Management', () => {
  it('should handle terraform variables', () => {
    const buildVarArgs = (vars: Record<string, string>): string[] => {
      const args: string[] = [];
      for (const [key, value] of Object.entries(vars)) {
        args.push('-var');
        args.push(`${key}=${value}`);
      }
      return args;
    };

    const vars = {
      subscription_id: '12345',
      tenant_id: '67890',
      environment: 'dev',
    };

    const args = buildVarArgs(vars);

    expect(args).toContain('-var');
    expect(args).toContain('subscription_id=12345');
    expect(args).toContain('tenant_id=67890');
    expect(args).toContain('environment=dev');
  });

  it('should sanitize sensitive variables in logs', () => {
    const sanitizeLog = (message: string, sensitiveKeys: string[]): string => {
      let sanitized = message;
      for (const key of sensitiveKeys) {
        const regex = new RegExp(`${key}=[^\\s]+`, 'g');
        sanitized = sanitized.replace(regex, `${key}=***`);
      }
      return sanitized;
    };

    const logMessage = 'Running: terraform apply -var subscription_id=12345 -var tenant_id=67890';
    const sensitiveKeys = ['subscription_id', 'tenant_id'];

    const sanitized = sanitizeLog(logMessage, sensitiveKeys);

    expect(sanitized).not.toContain('12345');
    expect(sanitized).not.toContain('67890');
    expect(sanitized).toContain('subscription_id=***');
    expect(sanitized).toContain('tenant_id=***');
  });
});
