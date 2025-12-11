/**
 * Docker Compose Generator
 *
 * Generates docker-compose.yaml from project.yaml (v2 schema).
 * Only includes services that deploy to minikube.
 */

import * as path from 'path';
import type {
  ResolvedProjectConfig,
  ServiceConfig,
  ImageBuildConfig,
  NetworkConfig,
} from '../schemas/project-config.js';

/**
 * Docker Compose file structure
 */
interface DockerComposeConfig {
  services: Record<string, DockerComposeService>;
  networks?: Record<string, DockerComposeNetwork>;
  volumes?: Record<string, Record<string, unknown>>;
}

interface DockerComposeService {
  image?: string;
  build?: DockerComposeBuild;
  container_name?: string;
  restart?: string;
  profiles?: string[];
  networks?: string[];
  depends_on?: Record<string, { condition: string }> | string[];
  ports?: string[];
  volumes?: string[];
  environment?: Record<string, string> | string[];
  entrypoint?: string[];
  command?: string[];
  healthcheck?: {
    test: string[];
    interval?: string;
    timeout?: string;
    retries?: number;
    start_period?: string;
  };
}

interface DockerComposeBuild {
  context: string;
  dockerfile: string;
  additional_contexts?: Record<string, string>;
  args?: Record<string, string>;
}

interface DockerComposeNetwork {
  driver?: string;
  external?: boolean;
  name?: string;
}

/**
 * Generate docker-compose configuration from project config
 *
 * @param config - Resolved project configuration
 * @returns Docker Compose configuration object
 */
export function generateDockerCompose(config: ResolvedProjectConfig): DockerComposeConfig {
  const services: Record<string, DockerComposeService> = {};
  const volumes: Record<string, Record<string, unknown>> = {};
  const networks: Record<string, DockerComposeNetwork> = {};

  // Process services
  for (const [serviceName, service] of Object.entries(config.services)) {
    // Only include services that deploy to minikube
    if (!service.deploy.includes('minikube')) {
      continue;
    }

    const composeService = generateService(serviceName, service, config);
    services[serviceName] = composeService;

    // Extract named volumes
    if (service.volumes) {
      for (const vol of service.volumes) {
        const volName = vol.split(':')[0];
        // Named volumes don't start with . or /
        if (!volName.startsWith('.') && !volName.startsWith('/')) {
          volumes[volName] = {};
        }
      }
    }
  }

  // Process networks
  if (config.networks) {
    for (const [networkName, networkConfig] of Object.entries(config.networks)) {
      networks[networkName] = generateNetwork(networkConfig);
    }
  }

  const result: DockerComposeConfig = { services };

  if (Object.keys(networks).length > 0) {
    result.networks = networks;
  }

  if (Object.keys(volumes).length > 0) {
    result.volumes = volumes;
  }

  return result;
}

/**
 * Generate a single service configuration
 */
function generateService(
  _serviceName: string,
  service: ServiceConfig,
  config: ResolvedProjectConfig,
): DockerComposeService {
  const composeService: DockerComposeService = {};

  // Determine if image is a build reference or external
  const imageConfig = config.images?.[service.image];

  if (imageConfig) {
    // Build from dockerfile
    composeService.build = generateBuild(imageConfig, config);
    composeService.image = `${config.name}/${service.image}:latest`;
  } else {
    // External image (e.g., mongo:latest)
    composeService.image = service.image;
  }

  // Container name - prefix with project name to avoid collisions between projects
  if (service.containerName) {
    composeService.container_name = `${config.name}-${service.containerName}`;
  }

  // Restart policy
  if (service.restart) {
    composeService.restart = service.restart;
  }

  // Profiles
  if (service.profiles && service.profiles.length > 0) {
    composeService.profiles = service.profiles;
  }

  // Networks
  if (service.networks && service.networks.length > 0) {
    composeService.networks = service.networks;
  }

  // Dependencies
  if (service.dependsOn && service.dependsOn.length > 0) {
    const deps: Record<string, { condition: string }> = {};
    for (const dep of service.dependsOn) {
      if (typeof dep === 'string') {
        deps[dep] = { condition: 'service_started' };
      } else {
        deps[dep.service] = { condition: dep.condition || 'service_started' };
      }
    }
    composeService.depends_on = deps;
  }

  // Ports
  if (service.ports && service.ports.length > 0) {
    composeService.ports = service.ports;
  }

  // Volumes
  if (service.volumes && service.volumes.length > 0) {
    composeService.volumes = service.volumes;
  }

  // Environment variables
  if (service.environment && Object.keys(service.environment).length > 0) {
    // Convert to array format for variable substitution support
    composeService.environment = Object.entries(service.environment).map(([key, value]) => `${key}=${value}`);
  }

  // Entrypoint
  if (service.entrypoint && service.entrypoint.length > 0) {
    composeService.entrypoint = service.entrypoint;
  }

  // Command
  if (service.command && service.command.length > 0) {
    composeService.command = service.command;
  }

  // Healthcheck
  if (service.healthcheck) {
    composeService.healthcheck = {
      test: service.healthcheck.test,
      interval: service.healthcheck.interval,
      timeout: service.healthcheck.timeout,
      retries: service.healthcheck.retries,
      start_period: service.healthcheck.startPeriod,
    };
  }

  return composeService;
}

/**
 * Generate build configuration
 */
function generateBuild(imageConfig: ImageBuildConfig, config: ResolvedProjectConfig): DockerComposeBuild {
  const build: DockerComposeBuild = {
    context: config.source.path,
    dockerfile: path.join(config.projectDir, imageConfig.dockerfile),
  };

  // Additional build contexts
  if (imageConfig.additionalContexts) {
    build.additional_contexts = {};
    for (const [name, relativePath] of Object.entries(imageConfig.additionalContexts)) {
      build.additional_contexts[name] = path.resolve(config.projectDir, relativePath);
    }
  }

  // Build args
  if (imageConfig.args) {
    build.args = imageConfig.args;
  }

  return build;
}

/**
 * Generate network configuration
 */
function generateNetwork(networkConfig: NetworkConfig): DockerComposeNetwork {
  const network: DockerComposeNetwork = {};

  if (networkConfig.driver) {
    network.driver = networkConfig.driver;
  }

  if (networkConfig.external) {
    network.external = networkConfig.external;
  }

  if (networkConfig.name) {
    network.name = networkConfig.name;
  }

  return network;
}

/**
 * Convert docker-compose config to YAML string with header
 */
export async function toYamlString(config: DockerComposeConfig, projectName: string): Promise<string> {
  // Import js-yaml dynamically for ES modules
  const yaml = await import('js-yaml');

  const header = `# AUTO-GENERATED from project.yaml - do not edit directly
# Regenerate with: npm run generate -p ${projectName}

`;

  return (
    header +
    yaml.dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    })
  );
}
