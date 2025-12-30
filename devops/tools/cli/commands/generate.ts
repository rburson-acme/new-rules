/**
 * Generate Command
 *
 * Generates docker-compose.generated.yaml from project.yaml
 *
 * Usage:
 *   npm run generate -p <project>
 *   npm run cli -- generate -p <project>
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProjectConfig, getProjectDir } from '../utils/project-loader.js';
import { generateDockerCompose, toYamlString } from '../generators/docker-compose.js';
import { logger, createLogger } from '../../shared/logger.js';

const log = createLogger('generate');

export interface GenerateOptions {
  project: string;
  output?: string;
  dryRun?: boolean;
}

/**
 * Generate docker-compose.yaml from project configuration
 */
export async function generate(options: GenerateOptions): Promise<void> {
  const { project, dryRun } = options;

  logger.section(`Generating config: ${project}`);

  // Load project configuration
  const config = loadProjectConfig(project);
  logger.success(`Loaded project config: ${config.name}`);
  log.info(`  Source path: ${config.sourcePath}`);

  // Generate docker-compose
  const composeConfig = generateDockerCompose(config);
  const serviceCount = Object.keys(composeConfig.services).length;
  logger.success(`Generated docker-compose with ${serviceCount} services`);

  // List services by profile
  const profileServices: Record<string, string[]> = {};
  for (const [serviceName, service] of Object.entries(composeConfig.services)) {
    for (const profile of service.profiles || ['default']) {
      if (!profileServices[profile]) {
        profileServices[profile] = [];
      }
      profileServices[profile].push(serviceName);
    }
  }

  log.info('\n  Services by profile:');
  for (const [profile, services] of Object.entries(profileServices)) {
    log.info(`    ${profile}: ${services.join(', ')}`);
  }

  // Determine output path
  const projectDir = getProjectDir(project);
  const outputPath = options.output || path.join(projectDir, 'docker-compose.generated.yaml');

  // Convert to YAML
  const yamlContent = await toYamlString(composeConfig, project);

  if (dryRun) {
    log.info(`\n[DRY RUN] Would write to: ${outputPath}`);
    log.info('\n' + '─'.repeat(50));
    log.info('Generated content preview (first 50 lines):');
    log.info('─'.repeat(50));
    const lines = yamlContent.split('\n').slice(0, 50);
    log.info(lines.join('\n'));
    if (yamlContent.split('\n').length > 50) {
      log.info('... (truncated)');
    }
  } else {
    // Write file
    fs.writeFileSync(outputPath, yamlContent);
    logger.success(`Written to: ${outputPath}`);

    // Show profile hooks summary
    if (config.profileHooks) {
      const hasHooks = Object.values(config.profileHooks).some((h) => h.postUp && h.postUp.length > 0);
      if (hasHooks) {
        log.info('\n  Profile hooks (run between profile starts):');
        for (const [profileName, hooks] of Object.entries(config.profileHooks)) {
          if (hooks.postUp && hooks.postUp.length > 0) {
            log.info(`    After '${profileName}' profile:`);
            for (const hook of hooks.postUp) {
              log.info(`      - ${hook.description} (${hook.script})`);
            }
          }
        }
      }
    }
  }

  logger.success('Generation complete');
  log.info('\nNext steps:');
  log.info(`  1. Review the generated file: ${path.basename(outputPath)}`);
  log.info(`  2. Commit if changes look correct`);
  log.info(`  3. Run: npm run minikube -p ${project}`);
}

/**
 * CLI handler for generate command
 */
export function registerGenerateCommand(yargs: any) {
  return yargs.command(
    'generate',
    'Generate docker-compose.yaml from project.yaml',
    (y: any) =>
      y
        .option('project', {
          alias: 'p',
          type: 'string',
          description: 'Project name',
          demandOption: true,
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output file path (default: docker-compose.generated.yaml)',
        })
        .option('dry-run', {
          type: 'boolean',
          description: 'Preview output without writing file',
          default: false,
        }),
    async (argv: any) => {
      try {
        await generate({
          project: argv.project,
          output: argv.output,
          dryRun: argv['dry-run'],
        });
      } catch (error) {
        logger.failure(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    },
  );
}
