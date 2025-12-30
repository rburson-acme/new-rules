/**
 * Shared shell execution utilities for infrastructure CLIs
 */

import { execSync, spawn } from 'child_process';
import { logger } from './logger.js';

export interface ShellOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
  verbose?: boolean;
  context?: string;
}

export interface ShellResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a shell command synchronously
 */
export function execCommand(command: string, options: ShellOptions = {}): ShellResult {
  const { cwd, env, dryRun = false, verbose = false, context = 'shell' } = options;

  if (dryRun) {
    logger.info(`[DRY RUN] ${command}`, context);
    return { success: true, stdout: '', stderr: '', exitCode: 0 };
  }

  if (verbose) {
    logger.debug(`Executing: ${command}`, context);
  }

  try {
    const stdout = execSync(command, {
      cwd,
      env: { ...process.env, ...env },
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (verbose) {
      logger.debug(`Command succeeded`, context, { stdout: stdout.substring(0, 200) });
    }

    return { success: true, stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.message || 'Unknown error';
    const stdout = error.stdout?.toString() || '';

    logger.error(`Command failed: ${command}`, context, { stderr: stderr.substring(0, 200) });

    return {
      success: false,
      stdout,
      stderr,
      exitCode: error.status || 1,
    };
  }
}

/**
 * Execute a shell command and stream output
 */
export async function execCommandAsync(
  command: string,
  args: string[] = [],
  options: ShellOptions = {}
): Promise<ShellResult> {
  const { cwd, env, dryRun = false, verbose = false, context = 'shell' } = options;

  if (dryRun) {
    logger.info(`[DRY RUN] ${command} ${args.join(' ')}`, context);
    return { success: true, stdout: '', stderr: '', exitCode: 0 };
  }

  if (verbose) {
    logger.debug(`Executing: ${command} ${args.join(' ')}`, context);
  }

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      if (verbose) {
        process.stdout.write(output);
      }
    });

    child.stderr?.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      if (verbose) {
        process.stderr.write(output);
      }
    });

    child.on('close', (code) => {
      const success = code === 0;

      if (success && verbose) {
        logger.debug(`Command succeeded`, context);
      } else if (!success) {
        logger.error(`Command failed with exit code ${code}`, context, { stderr: stderr.substring(0, 200) });
      }

      resolve({
        success,
        stdout,
        stderr,
        exitCode: code || 0,
      });
    });

    child.on('error', (error) => {
      logger.error(`Failed to execute command: ${error.message}`, context);
      resolve({
        success: false,
        stdout,
        stderr: error.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Execute multiple commands in sequence
 */
export async function execCommandsSequence(
  commands: Array<{ command: string; args?: string[]; description?: string }>,
  options: ShellOptions = {}
): Promise<ShellResult> {
  for (const cmd of commands) {
    if (cmd.description) {
      logger.info(cmd.description, options.context);
    }

    const result = await execCommandAsync(cmd.command, cmd.args || [], options);

    if (!result.success) {
      return result;
    }
  }

  return { success: true, stdout: '', stderr: '', exitCode: 0 };
}

/**
 * Check if a command exists in PATH
 */
export function commandExists(command: string): boolean {
  try {
    execCommand(`which ${command}`, { dryRun: false });
    return true;
  } catch {
    return false;
  }
}

