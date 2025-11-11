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

const CONFIG_REGISTRY_PATH = path.join(__dirname, '../../../config-registry.yaml');
const INFRA_BASE = path.join(__dirname, '../../..');

class ConfigValidator {
  private config: any;
  private issues: ValidationIssue[] = [];

  constructor(configPath: string) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configContent) as any;
  }

  /**
   * Validate all configurations
   */
  validateAll() {
    console.log('🔍 Validating configurations against config-registry.yaml...\n');

    this.validateDockerCompose();
    this.validateKubernetes();
    this.validateAgentConfigs();
    this.validateEnvFiles();

    this.printResults();

    return this.issues.filter(i => i.severity === 'error').length === 0;
  }

  /**
   * Validate Docker Compose files
   */
  private validateDockerCompose() {
    console.log('📦 Validating Docker Compose files...');

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

    for (const [key, expected] of Object.entries(sourceConfig)) {
      const serviceName = (expected as any).name;
      const actual = compose.services?.[serviceName];

      if (!actual) {
        this.issues.push({
          severity: 'error',
          file: filePath,
          issue: `Missing service definition for ${serviceName}`
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
            actual: actualPorts
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
              actual: actualPorts
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
    console.log('☸️  Validating Kubernetes manifests...');

    const k8sBasePath = path.join(INFRA_BASE, 'local/minikube/manifests/base');
    const k8sMinikubePath = path.join(INFRA_BASE, 'local/minikube/manifests/minikube');

    // Validate service manifests
    for (const [key, config] of Object.entries(this.config.services)) {
      const manifestPath = path.join(k8sBasePath, `${(config as any).name}.yaml`);
      if (fs.existsSync(manifestPath)) {
        this.validateK8sManifest(manifestPath, config);
      }
    }

    // Validate database manifests
    for (const [key, config] of Object.entries(this.config.databases)) {
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
    const docs = content.split('---').map(doc => {
      try {
        return yaml.load(doc);
      } catch {
        return null;
      }
    }).filter(Boolean);

    const deployment = docs.find((doc: any) => doc?.kind === 'Deployment');

    if (!deployment) {
      this.issues.push({
        severity: 'warning',
        file: manifestPath,
        issue: `No Deployment found in manifest (may be Job or other kind)`
      });
      return;
    }

    const container = deployment.spec?.template?.spec?.containers?.[0];

    if (!container) {
      this.issues.push({
        severity: 'error',
        file: manifestPath,
        issue: `No container definition found`
      });
      return;
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
          actual: actualPorts.map((p: any) => p.containerPort)
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
            actual: actualPorts.map((p: any) => p.containerPort)
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
          issue: `Missing resource definitions`
        });
      } else {
        // Check memory
        if (expectedConfig.resources.memory?.request !== actualResources.requests?.memory) {
          this.issues.push({
            severity: 'warning',
            file: manifestPath,
            issue: `Memory request mismatch`,
            expected: expectedConfig.resources.memory?.request,
            actual: actualResources.requests?.memory
          });
        }

        // Check CPU
        if (expectedConfig.resources.cpu?.request !== actualResources.requests?.cpu) {
          this.issues.push({
            severity: 'warning',
            file: manifestPath,
            issue: `CPU request mismatch`,
            expected: expectedConfig.resources.cpu?.request,
            actual: actualResources.requests?.cpu
          });
        }
      }
    }
  }

  /**
   * Validate agent configuration files
   */
  private validateAgentConfigs() {
    console.log('🤖 Validating agent configuration files...');

    const agentConfigPath = path.join(INFRA_BASE, 'local/configs/agents');

    for (const [key, expected] of Object.entries(this.config.services)) {
      const configPath = path.join(agentConfigPath, `${key}.config.json`);

      if (!fs.existsSync(configPath)) {
        this.issues.push({
          severity: 'warning',
          file: configPath,
          issue: `Agent config file not found`
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
              actual: actualPort
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
            actual: actualMem
          });
        }
      }
    }
  }

  /**
   * Validate environment files
   */
  private validateEnvFiles() {
    console.log('📝 Validating .env files...');

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
          actual: 'Check file manually'
        });
      }

      // Check Redis
      if (!envContent.includes(localConnStrings.redis)) {
        this.issues.push({
          severity: 'warning',
          file: envExamplePath,
          issue: `REDIS_HOST mismatch`,
          expected: localConnStrings.redis,
          actual: 'Check file manually'
        });
      }
    }
  }

  /**
   * Print validation results
   */
  private printResults() {
    console.log('\n📊 Validation Results:\n');

    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    const infos = this.issues.filter(i => i.severity === 'info');

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ All configurations are valid!\n');
      return;
    }

    if (errors.length > 0) {
      console.log(`❌ Errors (${errors.length}):\n`);
      errors.forEach(issue => this.printIssue(issue));
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${warnings.length}):\n`);
      warnings.forEach(issue => this.printIssue(issue));
    }

    if (infos.length > 0) {
      console.log(`\nℹ️  Info (${infos.length}):\n`);
      infos.forEach(issue => this.printIssue(issue));
    }

    console.log('\n💡 Run `npm run generate:config` to regenerate configurations from config-registry.yaml\n');
  }

  /**
   * Print individual issue
   */
  private printIssue(issue: ValidationIssue) {
    const relativePath = path.relative(process.cwd(), issue.file);
    console.log(`  ${relativePath}`);
    console.log(`    ${issue.issue}`);

    if (issue.expected !== undefined) {
      console.log(`    Expected: ${JSON.stringify(issue.expected)}`);
      console.log(`    Actual:   ${JSON.stringify(issue.actual)}`);
    }

    console.log();
  }
}

// CLI
try {
  const validator = new ConfigValidator(CONFIG_REGISTRY_PATH);
  const isValid = validator.validateAll();

  process.exit(isValid ? 0 : 1);
} catch (error) {
  console.error('❌ Error validating configurations:', error);
  process.exit(1);
}
