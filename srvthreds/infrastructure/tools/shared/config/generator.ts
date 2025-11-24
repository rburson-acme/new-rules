#!/usr/bin/env tsx

/**
 * Configuration Generator
 *
 * Generates deployment configurations from the centralized config-registry.yaml
 * Outputs: Docker Compose, Kubernetes manifests, .env files, agent configs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConfigRegistry {
  metadata: {
    name: string;
    namespace: string;
    version: string;
  };
  services: Record<string, any>;
  databases: Record<string, any>;
  build: any;
  networks: any;
  connectionStrings: Record<string, any>;
  security: any;
}

const CONFIG_REGISTRY_PATH = path.join(__dirname, '../../../config-registry.yaml');
const OUTPUT_BASE = path.join(__dirname, '../../../local');

class ConfigGenerator {
  private config: ConfigRegistry;

  constructor(configPath: string) {
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configContent) as ConfigRegistry;
  }

  /**
   * Generate all configuration files
   */
  generateAll(targets: string[] = ['all']) {
    console.log('🚀 Generating configurations from config-registry.yaml...\n');

    if (targets.includes('all') || targets.includes('docker-compose')) {
      this.generateDockerCompose();
    }

    if (targets.includes('all') || targets.includes('kubernetes')) {
      this.generateKubernetes();
    }

    if (targets.includes('all') || targets.includes('env')) {
      this.generateEnvFiles();
    }

    if (targets.includes('all') || targets.includes('agent-configs')) {
      this.generateAgentConfigs();
    }

    console.log('\n✅ Configuration generation complete!');
  }

  /**
   * Generate Docker Compose files
   */
  private generateDockerCompose() {
    console.log('📦 Generating Docker Compose files...');

    // Generate docker-compose-db.yml
    const dbCompose = {
      services: this.generateDockerComposeServices('databases'),
      networks: {
        [this.config.networks.default.name]: {
          driver: this.config.networks.default.driver,
          name: this.config.networks.default.name
        }
      }
    };

    const dbComposePath = path.join(OUTPUT_BASE, 'docker/compose/docker-compose-db.yml');
    this.writeYamlFile(dbComposePath, dbCompose);
    console.log(`  ✓ Created ${dbComposePath}`);

    // Generate docker-compose-services.yml
    const servicesCompose = {
      services: this.generateDockerComposeServices('services'),
      networks: {
        [this.config.networks.default.name]: {
          external: true
        }
      }
    };

    const servicesComposePath = path.join(OUTPUT_BASE, 'docker/compose/docker-compose-services.yml');
    this.writeYamlFile(servicesComposePath, servicesCompose);
    console.log(`  ✓ Created ${servicesComposePath}`);
  }

  /**
   * Generate Docker Compose service definitions
   */
  private generateDockerComposeServices(type: 'services' | 'databases'): Record<string, any> {
    const services: Record<string, any> = {};
    const sourceConfig = type === 'services' ? this.config.services : this.config.databases;

    for (const [key, config] of Object.entries(sourceConfig)) {
      // Handle special service types
      if (config.buildOnly) {
        // Builder service - build stage only, don't run as container
        services[config.name] = {
          image: `${config.image.repository}:${config.image.tag}`,
          build: {
            context: this.config.build.dockerContext.root,
            dockerfile: config.dockerfile || this.config.build.dockerfiles.builder,
            additional_contexts: {
              thredlib: this.config.build.dockerContext.thredlib
            }
          },
          profiles: ['manual']  // Prevent this from starting with 'docker compose up'
        };
        continue;
      }

      const service: any = {
        image: type === 'services'
          ? `${config.image.repository}:${config.image.tag}`
          : `${config.image.repository}:${config.image.tag}`,
        container_name: config.name,
        restart: config.restartPolicy || 'unless-stopped',
        networks: [this.config.networks.default.name]
      };

      // Add command if present
      if (config.command) {
        if (Array.isArray(config.command)) {
          service.command = config.command;
        } else {
          // Override both entrypoint and command to avoid Dockerfile ENTRYPOINT interference
          service.entrypoint = [config.command.entrypoint];
          service.command = config.command.args;
        }
      }

      // Add environment variables
      if (config.environment) {
        service.environment = Object.entries(config.environment).map(
          ([key, value]) => `${key}=${value}`
        );
      }

      // Add ports
      if (config.port) {
        service.ports = [`${config.port}:${config.port}`];
      } else if (config.ports && Object.keys(config.ports).length > 0) {
        service.ports = Object.values(config.ports).map((port: any) => `${port}:${port}`);
      }

      // Add volumes
      if (config.volumes) {
        if (Array.isArray(config.volumes)) {
          service.volumes = config.volumes.map((v: any) => `${v.hostPath}:${v.mountPath}`);
        } else {
          service.volumes = [`${config.volumes.hostPath}:${config.volumes.mountPath}`];
        }
      }

      // Add healthcheck
      if (config.healthcheck) {
        service.healthcheck = {
          test: config.healthcheck.test,
          interval: config.healthcheck.interval,
          timeout: config.healthcheck.timeout,
          retries: config.healthcheck.retries,
          start_period: config.healthcheck.startPeriod
        };
      }

      // Add build context for services
      if (type === 'services') {
        const dockerfile = config.dockerfile || this.config.build.dockerfiles.builder;
        service.build = {
          context: this.config.build.dockerContext.root,
          dockerfile: dockerfile,
          additional_contexts: {
            thredlib: this.config.build.dockerContext.thredlib
          }
        };

        // Add build args for production Dockerfile and cmdRunner (need BUILDER_IMAGE)
        if (dockerfile === this.config.build.dockerfiles.runtime ||
            dockerfile === this.config.build.dockerfiles.cmdRunner) {
          service.build.args = {
            BUILDER_IMAGE: `${this.config.services.builder.image.repository}:${this.config.services.builder.image.tag}`
          };
        }
      }

      // Add depends_on if specified
      if (config.dependsOn && Array.isArray(config.dependsOn) && config.dependsOn.length > 0) {
        service.depends_on = config.dependsOn;
      }

      services[config.name] = service;
    }

    return services;
  }

  /**
   * Generate Kubernetes manifests
   */
  private generateKubernetes() {
    console.log('☸️  Generating Kubernetes manifests...');

    const k8sBasePath = path.join(OUTPUT_BASE, 'minikube/manifests/base');
    const k8sMinikubePath = path.join(OUTPUT_BASE, 'minikube/manifests/minikube');

    // Ensure directories exist
    fs.mkdirSync(k8sBasePath, { recursive: true });
    fs.mkdirSync(k8sMinikubePath, { recursive: true });

    // Generate service manifests
    for (const [key, config] of Object.entries(this.config.services)) {
      this.generateK8sServiceManifest(config, k8sBasePath);
    }

    // Generate database manifests
    for (const [key, config] of Object.entries(this.config.databases)) {
      this.generateK8sServiceManifest(config, k8sMinikubePath);
    }

    // Generate ConfigMaps
    this.generateK8sConfigMap('base', k8sBasePath);
    this.generateK8sConfigMap('minikube', k8sMinikubePath);

    console.log(`  ✓ Created Kubernetes manifests in ${k8sBasePath}`);
  }

  /**
   * Generate individual Kubernetes service manifest
   */
  private generateK8sServiceManifest(config: any, outputPath: string) {
    const serviceName = config.name;
    const namespace = this.config.metadata.namespace;

    // Deployment
    const deployment: any = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: serviceName,
        namespace: namespace,
        labels: {
          app: serviceName
        }
      },
      spec: {
        replicas: config.replicas?.dev || 1,
        selector: {
          matchLabels: {
            app: serviceName
          }
        },
        template: {
          metadata: {
            labels: {
              app: serviceName
            }
          },
          spec: {
            containers: [{
              name: serviceName,
              image: 'srvthreds:dev',  // All services use the same builder image in Minikube
              imagePullPolicy: 'Never',  // Use local image, don't pull from registry
              ports: this.getK8sContainerPorts(config),
              envFrom: [{
                configMapRef: {
                  name: `${this.config.metadata.name}-config`
                }
              }],
              resources: {
                requests: {
                  memory: config.resources?.memory?.request || '128Mi',
                  cpu: config.resources?.cpu?.request || '100m'
                },
                limits: {
                  memory: config.resources?.memory?.limit || '256Mi',
                  cpu: config.resources?.cpu?.limit || '200m'
                }
              }
            }]
          }
        }
      }
    };

    // Add command if present
    if (config.command) {
      if (Array.isArray(config.command)) {
        deployment.spec.template.spec.containers[0].command = config.command;
      } else {
        deployment.spec.template.spec.containers[0].command = [config.command.entrypoint];
        deployment.spec.template.spec.containers[0].args = config.command.args;
      }
    }

    // Add volumes if present
    if (config.volumes) {
      const volumes = Array.isArray(config.volumes) ? config.volumes : [config.volumes];
      deployment.spec.template.spec.volumes = volumes.map((v: any, idx: number) => ({
        name: `${serviceName}-storage-${idx}`,
        emptyDir: {}
      }));
      deployment.spec.template.spec.containers[0].volumeMounts = volumes.map((v: any, idx: number) => ({
        name: `${serviceName}-storage-${idx}`,
        mountPath: v.mountPath
      }));
    }

    // Service (only if ports are defined)
    const ports = this.getK8sServicePorts(config);
    if (ports.length > 0) {
      const service = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: `${serviceName}-service`,
          namespace: namespace,
          labels: {
            app: serviceName
          }
        },
        spec: {
          type: 'ClusterIP',
          selector: {
            app: serviceName
          },
          ports: ports
        }
      };

      // Write combined manifest with both Deployment and Service
      const manifestPath = path.join(outputPath, `${serviceName}.yaml`);
      this.writeYamlFile(manifestPath, deployment, false);
      fs.appendFileSync(manifestPath, '---\n');
      fs.appendFileSync(manifestPath, yaml.dump(service, { indent: 2 }));
    } else {
      // Write only Deployment
      const manifestPath = path.join(outputPath, `${serviceName}.yaml`);
      this.writeYamlFile(manifestPath, deployment);
    }
  }

  /**
   * Get Kubernetes container ports from config
   */
  private getK8sContainerPorts(config: any): any[] {
    const ports: any[] = [];

    if (config.port) {
      ports.push({ containerPort: config.port });
    } else if (config.ports) {
      for (const [name, port] of Object.entries(config.ports)) {
        ports.push({ containerPort: port, name: name });
      }
    }

    return ports;
  }

  /**
   * Get Kubernetes service ports from config
   */
  private getK8sServicePorts(config: any): any[] {
    const ports: any[] = [];

    if (config.port) {
      ports.push({
        name: 'default',
        port: config.port,
        targetPort: config.port
      });
    } else if (config.ports) {
      for (const [name, port] of Object.entries(config.ports)) {
        ports.push({
          name: name,
          port: port,
          targetPort: port
        });
      }
    }

    return ports;
  }

  /**
   * Generate Kubernetes ConfigMap
   */
  private generateK8sConfigMap(environment: string, outputPath: string) {
    const namespace = this.config.metadata.namespace;
    const connStrings = this.config.connectionStrings[environment] || this.config.connectionStrings.kubernetes;

    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: `${this.config.metadata.name}-config`,
        namespace: namespace
      },
      data: {
        MONGO_HOST: connStrings.mongodb,
        REDIS_HOST: connStrings.redis,
        RABBITMQ_HOST: connStrings.rabbitmq,
        REDIS_USE_TLS: String(connStrings.useTls),
        MONGO_DIRECT_CONNECTION: String(connStrings.mongoDirectConnection),
        JWT_EXPIRE_TIME: this.config.security.jwt.expireTime,
        REFRESH_TOKEN_EXPIRE_TIME: this.config.security.jwt.refreshTokenExpireTime
      }
    };

    const configMapPath = path.join(outputPath, `configmap${environment !== 'base' ? '-' + environment : ''}.yaml`);
    this.writeYamlFile(configMapPath, configMap);
  }

  /**
   * Generate environment files
   */
  private generateEnvFiles() {
    console.log('📝 Generating .env files...');

    for (const [envName, connStrings] of Object.entries(this.config.connectionStrings)) {
      const envContent = this.generateEnvContent(connStrings as any);
      const envPath = path.join(OUTPUT_BASE, `configs/.env.${envName}`);

      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`  ✓ Created ${envPath}`);
    }
  }

  /**
   * Generate .env file content
   */
  private generateEnvContent(connStrings: any): string {
    const lines = [
      '# Auto-generated from config-registry.yaml',
      '# DO NOT EDIT MANUALLY - regenerated automatically on deployment',
      '# This file is NOT committed to git (.gitignore)',
      '',
      '# JWT Configuration',
      'JWT_SECRET=',
      `JWT_EXPIRE_TIME=${this.config.security.jwt.expireTime}`,
      'REFRESH_TOKEN_SECRET=',
      `REFRESH_TOKEN_EXPIRE_TIME=${this.config.security.jwt.refreshTokenExpireTime}`,
      '',
      '# Database Configuration',
      `MONGO_HOST=${connStrings.mongodb}`,
      `MONGO_DIRECT_CONNECTION=${connStrings.mongoDirectConnection}`,
      '',
      '# Cache and Storage Configuration',
      `REDIS_HOST=${connStrings.redis}`,
      `REDIS_USE_TLS=${connStrings.useTls}`,
      '',
      '# Message Queue Configuration',
      `RABBITMQ_HOST=${connStrings.rabbitmq}`,
      ''
    ];

    return lines.join('\n');
  }

  /**
   * Generate agent configuration files
   */
  private generateAgentConfigs() {
    console.log('🤖 Generating agent configuration files...');

    const agentConfigPath = path.join(OUTPUT_BASE, 'configs/agents');
    fs.mkdirSync(agentConfigPath, { recursive: true });

    for (const [key, config] of Object.entries(this.config.services)) {
      const agentConfig = {
        name: config.description,
        description: config.description,
        command: config.command,
        ports: config.ports,
        resources: config.resources
      };

      const configPath = path.join(agentConfigPath, `${key}.config.json`);
      this.writeJsonFile(configPath, agentConfig);
      console.log(`  ✓ Created ${configPath}`);
    }
  }

  /**
   * Write YAML file
   */
  private writeYamlFile(filePath: string, data: any, withHeader: boolean = true) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    let content = '';
    if (withHeader) {
      content += '# Auto-generated from config-registry.yaml\n';
      content += '# DO NOT EDIT MANUALLY - regenerate using: npm run generate:config\n\n';
    }
    content += yaml.dump(data, { indent: 2, lineWidth: -1 });

    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Write JSON file
   */
  private writeJsonFile(filePath: string, data: any) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

// CLI
const args = process.argv.slice(2);
const targets = args.length > 0 ? args : ['all'];

try {
  const generator = new ConfigGenerator(CONFIG_REGISTRY_PATH);
  generator.generateAll(targets);
} catch (error) {
  console.error('❌ Error generating configurations:', error);
  process.exit(1);
}
