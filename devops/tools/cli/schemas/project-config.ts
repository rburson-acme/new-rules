/**
 * Simplified Project Configuration Schema
 *
 * Single source of truth for project deployment configuration.
 * Used to generate docker-compose.yaml and drive minikube/CI-CD deployments.
 */

/**
 * Build configuration for an image
 */
export interface ImageBuildConfig {
  /** Dockerfile path relative to project directory */
  dockerfile: string;
  /** Build context path (defaults to source.path) */
  context?: string;
  /** Additional build contexts (e.g., thredlib: ../thredlib) */
  additionalContexts?: Record<string, string>;
  /** Build arguments */
  args?: Record<string, string>;
  /** Depends on another image being built first */
  dependsOn?: string;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  /** Image name - reference to images key, or external image (e.g., mongo:7) */
  image: string;
  /** Docker Compose profiles this service belongs to */
  profiles: string[];
  /** Environments where this service deploys */
  deploy: DeployTarget[];
  /** Container name override */
  containerName?: string;
  /** Restart policy */
  restart?: 'no' | 'always' | 'unless-stopped' | 'on-failure';
  /** Network(s) to attach to */
  networks?: string[];
  /** Service dependencies */
  dependsOn?: ServiceDependency[];
  /** Port mappings (host:container) */
  ports?: string[];
  /** Volume mounts */
  volumes?: string[];
  /** Environment variables */
  environment?: Record<string, string>;
  /** Override entrypoint */
  entrypoint?: string[];
  /** Override command */
  command?: string[];
  /** Healthcheck configuration */
  healthcheck?: HealthcheckConfig;
}

/**
 * Hook command configuration
 */
export interface HookCommand {
  /** Description of what this hook does */
  description: string;
  /** Script path relative to project directory */
  script: string;
  /** Arguments to pass to the script */
  args?: string[];
}

/**
 * Profile hooks - run after profile services are up
 */
export interface ProfileHooks {
  /** Commands to run after profile services are up */
  postUp?: HookCommand[];
}

/**
 * Service dependency with optional condition
 */
export interface ServiceDependency {
  service: string;
  condition?: 'service_started' | 'service_healthy' | 'service_completed_successfully';
}

/**
 * Healthcheck configuration
 */
export interface HealthcheckConfig {
  test: string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  startPeriod?: string;
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  driver?: 'bridge' | 'host' | 'overlay';
  external?: boolean;
  name?: string;
}

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  /** Container registry URL ('local' for minikube) */
  registry: string;
  /** Kubernetes ingress class */
  ingressClass?: string;
  /** Kubernetes namespace */
  namespace?: string;
}

/**
 * Azure naming convention configuration
 */
export interface AzureConfig {
  prefix: string;
  appCode: string;
  regionCode: string;
}

/**
 * Valid deployment targets
 */
export type DeployTarget = 'minikube' | 'dev' | 'test' | 'prod';

/**
 * Main project configuration
 */
export interface ProjectConfig {
  /** Project name (used for naming resources) */
  name: string;
  /** Project description */
  description: string;

  /** Source code location */
  source: {
    /** Path to source code relative to project directory */
    path: string;
  };

  /** Images to build */
  images: Record<string, ImageBuildConfig>;

  /** Services to deploy */
  services: Record<string, ServiceConfig>;

  /** Profile groupings (profile name -> list of profiles or service names) */
  profiles: Record<string, string[]>;

  /** Profile hooks - scripts to run after profile services are up */
  profileHooks?: Record<string, ProfileHooks>;

  /** Network definitions */
  networks?: Record<string, NetworkConfig>;

  /** Environment-specific settings */
  environments: {
    minikube: EnvironmentConfig;
    dev?: EnvironmentConfig;
    test?: EnvironmentConfig;
    prod?: EnvironmentConfig;
  };

  /** Azure naming convention (optional, for reference) */
  azure?: AzureConfig;

  /** Terraform configuration paths (kept separate) */
  terraform?: {
    stacksPath: string;
    configPath: string;
  };
}

/**
 * Parsed and resolved project configuration with absolute paths
 */
export interface ResolvedProjectConfig extends ProjectConfig {
  /** Absolute path to project directory */
  projectDir: string;
  /** Absolute path to source code */
  sourcePath: string;
}
