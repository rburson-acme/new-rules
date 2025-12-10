/**
 * CLI argument parsing utilities
 */

import { ValidationError } from '../../shared/error-handler.js';

/**
 * Extract the --project flag value from args
 * Throws if not provided - no defaults allowed
 */
export function extractProject(args: string[]): { project: string; remainingArgs: string[] } {
  const projectIndex = args.findIndex((a) => a === '--project' || a === '-p');

  if (projectIndex === -1) {
    throw new ValidationError(
      'Missing required --project flag. Use --project <name> or -p <name> to specify the project.',
    );
  }

  const projectValue = args[projectIndex + 1];
  if (!projectValue || projectValue.startsWith('-')) {
    throw new ValidationError(
      'Missing value for --project flag. Use --project <name> or -p <name> to specify the project.',
    );
  }

  // Remove --project and its value from args
  const remainingArgs = [...args];
  remainingArgs.splice(projectIndex, 2);

  return { project: projectValue, remainingArgs };
}
