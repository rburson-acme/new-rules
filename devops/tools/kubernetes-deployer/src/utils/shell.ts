/**
 * Shell command execution utility
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { Logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Result of shell command execution
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Options for shell execution
 */
export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
  silent?: boolean;
  throwOnError?: boolean;
  streamOutput?: boolean; // If true, stream output in real-time
}

/**
 * Shell command executor with error handling and logging
 */
export class ShellExecutor {
  private logger: Logger;

  constructor(context: string = 'ShellExecutor') {
    this.logger = new Logger(context);
  }

  /**
   * Execute a shell command asynchronously
   */
  async exec(
    command: string,
    args: string[] = [],
    options: ExecOptions = {}
  ): Promise<ExecResult> {
    // Use streaming execution if requested
    if (options.streamOutput) {
      return this.execWithStreaming(command, args, options);
    }

    const fullCommand = this.buildCommand(command, args);

    if (!options.silent) {
      this.logger.debug(`Executing: ${fullCommand}`, {
        cwd: options.cwd || process.cwd()
      });
    }

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        timeout: options.timeout,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 10 // 10MB default
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    } catch (error: any) {
      const exitCode = error.code || 1;
      const stdout = error.stdout?.toString().trim() || '';
      const stderr = error.stderr?.toString().trim() || '';

      this.logger.error(`Command failed: ${fullCommand}`, error, {
        exitCode,
        stdout,
        stderr
      });

      throw new Error(
        `Command failed with exit code ${exitCode}: ${stderr || stdout || error.message}`
      );
    }
  }

  /**
   * Execute a shell command with real-time output streaming
   */
  private execWithStreaming(
    command: string,
    args: string[] = [],
    options: ExecOptions = {}
  ): Promise<ExecResult> {
    const fullCommand = this.buildCommand(command, args);

    if (!options.silent) {
      this.logger.debug(`Executing (streaming): ${fullCommand}`, {
        cwd: options.cwd || process.cwd()
      });
    }

    return new Promise((resolve, reject) => {
      const child = exec(
        fullCommand,
        {
          cwd: options.cwd,
          env: { ...process.env, ...options.env },
          timeout: options.timeout,
          maxBuffer: options.maxBuffer || 1024 * 1024 * 10
        },
        (error, stdout, stderr) => {
          // This callback runs when the process completes
          if (error) {
            const exitCode = (error as any).code || 1;
            this.logger.error(`Command failed: ${fullCommand}`, error, {
              exitCode,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
            });
            return reject(error);
          }

          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: 0
          });
        }
      );

      // Stream stdout in real-time
      child.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!options.silent) {
          // Write directly to stdout for real-time display
          process.stdout.write(output);
        }
      });

      // Stream stderr in real-time
      child.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!options.silent) {
          // Write directly to stderr for real-time display
          process.stderr.write(output);
        }
      });

      // Handle timeout
      if (options.timeout) {
        const timeoutId = setTimeout(() => {
          child.kill('SIGTERM');
          reject(new Error(`Command timed out after ${options.timeout}ms: ${fullCommand}`));
        }, options.timeout);

        child.on('exit', () => {
          clearTimeout(timeoutId);
        });
      }
    });
  }

  /**
   * Execute a shell command synchronously
   */
  execSync(
    command: string,
    args: string[] = [],
    options: ExecOptions = {}
  ): ExecResult {
    const fullCommand = this.buildCommand(command, args);

    if (!options.silent) {
      this.logger.debug(`Executing (sync): ${fullCommand}`, {
        cwd: options.cwd || process.cwd()
      });
    }

    try {
      const stdout = execSync(fullCommand, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        maxBuffer: options.maxBuffer || 1024 * 1024 * 10,
        encoding: 'utf-8'
      });

      return {
        stdout: stdout.trim(),
        stderr: '',
        exitCode: 0
      };
    } catch (error: any) {
      const exitCode = error.status || 1;
      const stdout = error.stdout?.toString().trim() || '';
      const stderr = error.stderr?.toString().trim() || '';

      this.logger.error(`Command failed: ${fullCommand}`, error, {
        exitCode,
        stdout,
        stderr
      });

      throw new Error(
        `Command failed with exit code ${exitCode}: ${stderr || stdout || error.message}`
      );
    }
  }

  /**
   * Check if a command exists in PATH
   */
  async commandExists(command: string): Promise<boolean> {
    try {
      await this.exec('which', [command], { silent: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get command version
   */
  async getVersion(command: string, versionArg: string = '--version'): Promise<string> {
    try {
      const result = await this.exec(command, [versionArg], { silent: true });
      return result.stdout.split('\n')[0];
    } catch (error) {
      throw new Error(`Failed to get version for ${command}: ${error}`);
    }
  }

  /**
   * Build full command string from command and args
   */
  private buildCommand(command: string, args: string[]): string {
    if (args.length === 0) {
      return command;
    }

    // Escape arguments that contain spaces
    const escapedArgs = args.map((arg) => {
      if (arg.includes(' ') && !arg.startsWith('"') && !arg.startsWith("'")) {
        return `"${arg}"`;
      }
      return arg;
    });

    return `${command} ${escapedArgs.join(' ')}`;
  }
}
