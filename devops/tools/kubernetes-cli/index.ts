/**
 * Kubernetes CLI - Public API
 *
 * Re-exports for programmatic usage.
 */

export { loadProjectConfig, listProjects, getDefaultProject, validateProjectPaths } from './config/project-loader.js';
export type { ProjectConfig, DockerService } from './config/project-loader.js';
export { formatDeploymentResult, formatKeyValueTable } from './utils/output.js';
