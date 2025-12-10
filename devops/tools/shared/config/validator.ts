#!/usr/bin/env tsx

/**
 * Configuration Validator
 *
 * Validates that all deployment configurations match the config-registry.yaml
 * Checks for port mismatches, path inconsistencies, and missing values
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { logger } from '../logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  issue: string;
  expected?: any;
  actual?: any;
}

interface K8sPort {
  containerPort: number;
  name?: string;
  protocol?: string;
}

interface K8sResources {
  requests?: {
    memory?: string;
    cpu?: string;
    storage?: string;
  };
  limits?: {
    memory?: string;
    cpu?: string;
  };
}

interface K8sContainer {
  name: string;
  image: string;
  imagePullPolicy?: string;
  ports?: K8sPort[];
  resources?: K8sResources;
  volumeMounts?: Array<{
    name: string;
    mountPath: string;
  }>;
  env?: Array<{
    name: string;
    value: string;
  }>;
}

interface K8sVolumeClaimTemplate {
  metadata: {
    name: string;
  };
  spec: {
    accessModes: string[];
    resources: K8sResources;
  };
}

interface K8sDeploymentSpec {
  replicas?: number;
  selector: {
    matchLabels: Record<string, string>;
  };
  template: {
    metadata: {
      labels: Record<string, string>;
    };
    spec: {
      containers: K8sContainer[];
      volumes?: Array<{
        name: string;
        emptyDir?: Record<string, unknown>;
      }>;
    };
  };
  volumeClaimTemplates?: K8sVolumeClaimTemplate[];
  serviceName?: string;
}

interface K8sResource {
  apiVersion: string;
  kind: 'Deployment' | 'StatefulSet' | 'Service' | 'Job' | 'CronJob';
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
  };
  spec?: K8sDeploymentSpec;
}

const PROJECTS_DIR = path.join(__dirname, '../../../projects');
const INFRA_BASE = path.join(__dirname, '../../..');

class ConfigValidator {
  private config: any;
  private issues: ValidationIssue[] = [];
  private projectName: string;

  constructor(configPath: string, projectName: string) {
    if (!projectName) {
      throw new Error('Project name is required');
    }
    this.projectName = projectName;
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configContent) as any;
  }

  /**
   * Validate all configurations
   */
  validateAll() {
    logger.info('🔍 Validating configurations against config-registry.yaml...\n');

    this.validateDockerCompose();
    this.validateKubernetes();
    this.validateAgentConfigs();
    this.validateEnvFiles();

    this.printResults();

    return this.issues.filter((i) => i.severity === 'error').length === 0;
  }

  /**
   * Validate Docker Compose files
   */
  private validateDockerCompose() {
    logger.info('📦 Validating Docker Compose files...');

    const dbComposePath = path.join(INFRA_BASE, 'local/docker/compose/docker-compose-db.yml');
    const servicesComposePath = path.join(INFRA_BASE, 'local/docker/compose/docker-compose-services.yml');

    if (fs.existsSync(dbComposePath)) {
      const dbCompose = yaml.load(fs.readFileSync(dbComposePath, 'utf8')) as any;
      this.validateDockerComposeServices(dbCompose, 'databases', dbComposePath);
    }

    if (fs.existsSync(servicesComposePath)) {
      const servicesCompose = yaml.load(fs.readFileSync(servicesComposePath, 'utf8')) as any;
      this.validateDockerComposeServices(servicesCompose, 'services', servicesComposePath);
    }
  }

  /**
   * Validate Docker Compose service definitions
   */
  private validateDockerComposeServices(compose: any, type: 'services' | 'databases', filePath: string) {
    const sourceConfig = type === 'services' ? this.config.services : this.config.databases;

    for (const [_, expected] of Object.entries(sourceConfig)) {
      const serviceName = (expected as any).name;
      const actual = compose.services?.[serviceName];

      if (!actual) {
        this.issues.push({
          severity: 'error',
          file: filePath,
          issue: `Missing service definition for ${serviceName}`,
        });
        continue;
      }

      // Validate ports
      if ((expected as any).port) {
        const expectedPort = (expected as any).port;
        const actualPorts = actual.ports || [];
        const hasPort = actualPorts.some((p: string) => p.includes(String(expectedPort)));

        if (!hasPort) {
          this.issues.push({
            severity: 'error',
            file: filePath,
            issue: `Port mismatch for ${serviceName}`,
            expected: expectedPort,
            actual: actualPorts,
          });
        }
      } else if ((expected as any).ports) {
        for (const [portName, expectedPort] of Object.entries((expected as any).ports)) {
          const actualPorts = actual.ports || [];
          const hasPort = actualPorts.some((p: string) => p.includes(String(expectedPort)));

          if (!hasPort) {
            this.issues.push({
              severity: 'error',
              file: filePath,
              issue: `Port mismatch for ${serviceName}.${portName}`,
              expected: expectedPort,
              actual: actualPorts,
            });
          }
        }
      }
    }
  }

  /**
   * Validate Kubernetes manifests
   */
  private validateKubernetes() {
    logger.info('☸️  Validating Kubernetes manifests...');

    const k8sBasePath = path.join(INFRA_BASE, 'local/minikube/manifests/base');
    const k8sMinikubePath = path.join(INFRA_BASE, 'local/minikube/manifests/minikube');

    // Validate service manifests
    for (const [_, config] of Object.entries(this.config.services)) {
      const manifestPath = path.join(k8sBasePath, `${(config as any).name}.yaml`);
      if (fs.existsSync(manifestPath)) {
        this.validateK8sManifest(manifestPath, config);
      }
    }

    // Validate database manifests
    for (const [_, config] of Object.entries(this.config.databases)) {
      const manifestPath = path.join(k8sMinikubePath, `${(config as any).name}.yaml`);
      if (fs.existsSync(manifestPath)) {
        this.validateK8sManifest(manifestPath, config);
      }
    }
  }

  /**
   * Validate individual Kubernetes manifest
   */
  private validateK8sManifest(manifestPath: string, expectedConfig: any) {
    const content = fs.readFileSync(manifestPath, 'utf8');
    const docs = content
      .split('---')
      .map((doc) => {
        try {
          return yaml.load(doc);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Support both Deployment and StatefulSet
    const deployment = docs.find(
      (doc: any): doc is K8sResource => doc?.kind === 'Deployment' || doc?.kind === 'StatefulSet',
    );

    if (!deployment) {
      this.issues.push({
        severity: 'warning',
        file: manifestPath,
        issue: `No Deployment or StatefulSet found in manifest (may be Job or other kind)`,
      });
      return;
    }

    const container = deployment.spec?.template?.spec?.containers?.[0];

    if (!container) {
      this.issues.push({
        severity: 'error',
        file: manifestPath,
        issue: `No container definition found`,
      });
      return;
    }

    // Validate StatefulSet-specific fields
    if (deployment.kind === 'StatefulSet' && expectedConfig.kubernetes?.volumeClaimTemplate) {
      const vct = deployment.spec?.volumeClaimTemplates?.[0];
      const expectedVct = expectedConfig.kubernetes.volumeClaimTemplate;

      if (!vct) {
        this.issues.push({
          severity: 'error',
          file: manifestPath,
          issue: `Missing volumeClaimTemplates for StatefulSet`,
        });
      } else if (vct.spec?.resources?.requests?.storage !== expectedVct.storage) {
        this.issues.push({
          severity: 'warning',
          file: manifestPath,
          issue: `Storage size mismatch`,
          expected: expectedVct.storage,
          actual: vct.spec?.resources?.requests?.storage,
        });
      }
    }

    // Validate ports
    if (expectedConfig.port) {
      const expectedPort = expectedConfig.port;
      const actualPorts = container.ports || [];
      const hasPort = actualPorts.some((p: any) => p.containerPort === expectedPort);

      if (!hasPort) {
        this.issues.push({
          severity: 'error',
          file: manifestPath,
          issue: `Port mismatch in containerPort`,
          expected: expectedPort,
          actual: actualPorts.map((p: any) => p.containerPort),
        });
      }
    } else if (expectedConfig.ports) {
      for (const [portName, expectedPort] of Object.entries(expectedConfig.ports)) {
        const actualPorts = container.ports || [];
        const hasPort = actualPorts.some((p: any) => p.containerPort === expectedPort);

        if (!hasPort) {
          this.issues.push({
            severity: 'error',
            file: manifestPath,
            issue: `Port mismatch for ${portName} in containerPort`,
            expected: expectedPort,
            actual: actualPorts.map((p: any) => p.containerPort),
          });
        }
      }
    }

    // Validate resources
    if (expectedConfig.resources) {
      const actualResources = container.resources;

      if (!actualResources) {
        this.issues.push({
          severity: 'warning',
          file: manifestPath,
          issue: `Missing resource definitions`,
        });
      } else {
        // Check memory
        if (expectedConfig.resources.memory?.request !== actualResources.requests?.memory) {
          this.issues.push({
            severity: 'warning',
            file: manifestPath,
            issue: `Memory request mismatch`,
            expected: expectedConfig.resources.memory?.request,
            actual: actualResources.requests?.memory,
          });
        }

        // Check CPU
        if (expectedConfig.resources.cpu?.request !== actualResources.requests?.cpu) {
          this.issues.push({
            severity: 'warning',
            file: manifestPath,
            issue: `CPU request mismatch`,
            expected: expectedConfig.resources.cpu?.request,
            actual: actualResources.requests?.cpu,
          });
        }
      }
    }

    // Validate image configuration for databases
    if (expectedConfig.image) {
      const actualImage = container.image;
      const expectedImage = `${expectedConfig.image.repository}:${expectedConfig.image.tag}`;

      // Allow exact match OR '<project>:dev' for local development services
      const devImage = `${this.projectName.toLowerCase()}:dev`;
      const isValidImage = actualImage === expectedImage || actualImage === devImage;

      if (!isValidImage && !expectedConfig.buildOnly) {
        this.issues.push({
          severity: 'error',
          file: manifestPath,
          issue: `Image mismatch`,
          expected: expectedImage,
          actual: actualImage,
        });
      }
    }
  }

  /**
   * Validate agent configuration files
   */
  private validateAgentConfigs() {
    logger.info('🤖 Validating agent configuration files...');

    const agentConfigPath = path.join(INFRA_BASE, 'local/configs/agents');

    for (const [key, expected] of Object.entries(this.config.services)) {
      const configPath = path.join(agentConfigPath, `${key}.config.json`);

      if (!fs.existsSync(configPath)) {
        this.issues.push({
          severity: 'warning',
          file: configPath,
          issue: `Agent config file not found`,
        });
        continue;
      }

      const actual = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Validate ports
      if ((expected as any).ports) {
        for (const [portName, expectedPort] of Object.entries((expected as any).ports)) {
          const actualPort = actual.ports?.[portName];

          if (actualPort !== expectedPort) {
            this.issues.push({
              severity: 'error',
              file: configPath,
              issue: `Port mismatch for ${portName}`,
              expected: expectedPort,
              actual: actualPort,
            });
          }
        }
      }

      // Validate resources
      if ((expected as any).resources) {
        const expectedMem = (expected as any).resources.memory?.request;
        const actualMem = actual.resources?.memory?.request;

        if (expectedMem !== actualMem) {
          this.issues.push({
            severity: 'warning',
            file: configPath,
            issue: `Memory request mismatch`,
            expected: expectedMem,
            actual: actualMem,
          });
        }
      }
    }
  }

  /**
   * Validate environment files
   */
  private validateEnvFiles() {
    logger.info('📝 Validating .env files...');

    const envExamplePath = path.join(INFRA_BASE, 'local/configs/.env.local.example');

    if (fs.existsSync(envExamplePath)) {
      const envContent = fs.readFileSync(envExamplePath, 'utf8');
      const localConnStrings = this.config.connectionStrings.local;

      // Check MongoDB
      if (!envContent.includes(localConnStrings.mongodb)) {
        this.issues.push({
          severity: 'warning',
          file: envExamplePath,
          issue: `MONGO_HOST mismatch`,
          expected: localConnStrings.mongodb,
          actual: 'Check file manually',
        });
      }

      // Check Redis
      if (!envContent.includes(localConnStrings.redis)) {
        this.issues.push({
          severity: 'warning',
          file: envExamplePath,
          issue: `REDIS_HOST mismatch`,
          expected: localConnStrings.redis,
          actual: 'Check file manually',
        });
      }
    }
  }

  /**
   * Print validation results
   */
  private printResults() {
    logger.info('\n📊 Validation Results:\n');

    const errors = this.issues.filter((i) => i.severity === 'error');
    const warnings = this.issues.filter((i) => i.severity === 'warning');
    const infos = this.issues.filter((i) => i.severity === 'info');

    if (errors.length === 0 && warnings.length === 0) {
      logger.info('✅ All configurations are valid!\n');
      return;
    }

    if (errors.length > 0) {
      logger.info(`❌ Errors (${errors.length}):\n`);
      errors.forEach((issue) => this.printIssue(issue));
    }

    if (warnings.length > 0) {
      logger.info(`\n⚠️  Warnings (${warnings.length}):\n`);
      warnings.forEach((issue) => this.printIssue(issue));
    }

    if (infos.length > 0) {
      logger.info(`\nℹ️  Info (${infos.length}):\n`);
      infos.forEach((issue) => this.printIssue(issue));
    }

    logger.info('\n💡 Update the static configuration files to match config-registry.yaml\n');
  }

  /**
   * Print individual issue
   */
  private printIssue(issue: ValidationIssue) {
    const relativePath = path.relative(process.cwd(), issue.file);
    logger.info(`  ${relativePath}`);
    logger.info(`    ${issue.issue}`);

    if (issue.expected !== undefined) {
      logger.info(`    Expected: ${JSON.stringify(issue.expected)}`);
      logger.info(`    Actual:   ${JSON.stringify(issue.actual)}`);
    }

    logger.info('');
  }
}

// CLI
try {
  const args = process.argv.slice(2);
  const projectIndex = args.findIndex((a) => a === '--project' || a === '-p');

  if (projectIndex === -1 || !args[projectIndex + 1]) {
    logger.error('❌ Missing required --project flag. Usage: validator --project <name>', 'ConfigValidator');
    process.exit(1);
  }

  const projectName = args[projectIndex + 1];
  const configRegistryPath = path.join(PROJECTS_DIR, projectName, 'config-registry.yaml');

  if (!fs.existsSync(configRegistryPath)) {
    logger.error(`❌ Config registry not found: ${configRegistryPath}`, 'ConfigValidator');
    process.exit(1);
  }

  const validator = new ConfigValidator(configRegistryPath, projectName);
  const isValid = validator.validateAll();

  process.exit(isValid ? 0 : 1);
} catch (error) {
  logger.error('❌ Error validating configurations:', 'ConfigValidator', error);
  process.exit(1);
}
