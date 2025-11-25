/**
 * Shared error handling utilities for infrastructure CLIs
 */

import { logger } from './logger.js';

export class CLIError extends Error {
  constructor(
    message: string,
    public code: number = 1,
    public context?: string
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, context?: string) {
    super(message, 2, context);
    this.name = 'ValidationError';
  }
}

export class ConfigError extends CLIError {
  constructor(message: string, context?: string) {
    super(message, 3, context);
    this.name = 'ConfigError';
  }
}

export class ExecutionError extends CLIError {
  constructor(message: string, context?: string) {
    super(message, 4, context);
    this.name = 'ExecutionError';
  }
}

export class AzureError extends CLIError {
  constructor(message: string, context?: string) {
    super(message, 5, context);
    this.name = 'AzureError';
  }
}

export class TerraformError extends CLIError {
  constructor(message: string, context?: string) {
    super(message, 6, context);
    this.name = 'TerraformError';
  }
}

/**
 * Handle CLI errors and exit gracefully
 */
export function handleError(error: any, context: string = 'CLI'): never {
  if (error instanceof CLIError) {
    logger.failure(error.message, error.context || context);
    process.exit(error.code);
  }

  if (error instanceof Error) {
    logger.failure(`${error.name}: ${error.message}`, context);
    logger.debug(error.stack || '', context);
    process.exit(1);
  }

  logger.failure(`Unknown error: ${JSON.stringify(error)}`, context);
  process.exit(1);
}

/**
 * Validate required environment variables
 */
export function validateEnvVars(required: string[]): void {
  const missing = required.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Validate that a value is not null or undefined
 */
export function requireValue<T>(value: T | null | undefined, fieldName: string): T {
  if (value === null || value === undefined) {
    throw new ValidationError(`Required value missing: ${fieldName}`);
  }
  return value;
}

/**
 * Validate that a string is not empty
 */
export function requireString(value: string | null | undefined, fieldName: string): string {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`Required string value missing or empty: ${fieldName}`);
  }
  return value.trim();
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string = 'Operation'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
  }
}

/**
 * Confirm action with user
 */
export async function confirmAction(message: string): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

/**
 * Confirm destructive action with typed confirmation
 */
export async function confirmDestructiveAction(message: string, confirmText: string): Promise<boolean> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message}\nType '${confirmText}' to confirm: `, (answer) => {
      rl.close();
      resolve(answer === confirmText);
    });
  });
}

