/**
 * Type definitions for infrastructure configuration registry
 *
 * These types provide compile-time validation for configuration files
 * and enable IDE autocomplete when working with configurations.
 */

// ============================================================================
// Metadata Types
// ============================================================================

export interface Metadata {
  name: string;
  namespace: string;
  version: string;
  description?: string;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface ServiceImage {
  repository: string;
  tag: string;
}

export interface ServiceCommand {
  entrypoint: string;
  args: string[];
}

export interface ServicePorts {
  [key: string]: number;
}

export interface ServiceEnvironment {
  [key: string]: string;
}

export interface ResourceRequirements {
  memory: {
    request: string;
    limit: string;
  };
  cpu: {
    request: string;
    limit: string;
  };
}

export interface ServiceReplicas {
  dev: number;
  staging: number;
  production: number;
}

export interface PodDisruptionBudget {
  minAvailable: number;
}

export interface ServiceDefinition {
  name: string;
  description: string;
  image: ServiceImage;
  dockerfile: string;
  command?: ServiceCommand;
  ports: ServicePorts;
  environment: ServiceEnvironment;
  dependsOn?: string[];
  resources: ResourceRequirements;
  replicas: ServiceReplicas;
  restartPolicy?: string;
  buildOnly?: boolean;
  podDisruptionBudget?: PodDisruptionBudget;
}

export interface Services {
  [key: string]: ServiceDefinition;
}

// ============================================================================
// Database Configuration Types
// ============================================================================

export interface DatabaseVolume {
  mountPath: string;
  hostPath: string;
}

export interface HealthCheck {
  test: string;
  interval: string;
  timeout: string;
  retries: number;
  startPeriod: string;
}

export interface DatabaseDefinition {
  name: string;
  description: string;
  image: ServiceImage;
  port?: number;
  ports?: ServicePorts;
  command?: string[];
  environment?: ServiceEnvironment;
  volumes?: DatabaseVolume | DatabaseVolume[];
  healthcheck?: HealthCheck;
  resources: ResourceRequirements;
}

export interface Databases {
  mongodb: DatabaseDefinition;
  redis: DatabaseDefinition;
  rabbitmq: DatabaseDefinition;
}

// ============================================================================
// Build Configuration Types
// ============================================================================

export interface BuildAssets {
  source: string;
  destination: string;
}

export interface BuildDockerfiles {
  builder: string;
  runtime: string;
  cmdRunner: string;
}

export interface BuildDockerContext {
  root: string;
  thredlib: string;
}

export interface BuildConfiguration {
  context: string;
  distPath: string;
  workdir: string;
  assets: BuildAssets;
  dockerfiles: BuildDockerfiles;
  dockerContext: BuildDockerContext;
}

// ============================================================================
// Network Configuration Types
// ============================================================================

export interface NetworkDefinition {
  name: string;
  driver: string;
}

export interface Networks {
  default: NetworkDefinition;
}

// ============================================================================
// Connection String Types
// ============================================================================

export interface ConnectionStringSet {
  mongodb: string;
  redis: string;
  rabbitmq: string;
  mongoDirectConnection: boolean;
  useTls: boolean;
}

export interface ConnectionStrings {
  local: ConnectionStringSet;
  docker: ConnectionStringSet;
  kubernetes: ConnectionStringSet;
  minikube: ConnectionStringSet;
}

// ============================================================================
// Security Configuration Types
// ============================================================================

export interface SecretReference {
  azure: string;
  aws: string;
  gcp: string;
}

export interface JWTConfiguration {
  expireTime: string;
  refreshTokenExpireTime: string;
  secretKeyRef: SecretReference;
}

export interface SecurityConfiguration {
  jwt: JWTConfiguration;
}

// ============================================================================
// Cloud Configuration Types
// ============================================================================

export interface AzureNaming {
  prefix: string;
  environment: {
    dev: string;
    test: string;
    prod: string;
  };
  suffix: string;
}

export interface AzureCosmosDB {
  enabled: boolean;
  apiVersion: string;
  consistencyLevel: string;
  connectionStringRef: string;
  tier?: string;
  throughput?: number;
  enableAutoscale?: boolean;
  maxThroughput?: number;
}

export interface AzureRedis {
  enabled: boolean;
  sku: string;
  capacity: number;
  connectionStringRef: string;
  enableNonSslPort?: boolean;
  replicaCount?: number;
}

export interface AzureServiceBus {
  enabled: boolean;
  sku: string;
  connectionStringRef: string;
}

export interface AzureKeyVault {
  name: string;
  enableSoftDelete: boolean;
  purgeProtection: boolean;
}

export interface AzureACR {
  name: string;
  sku: string;
}

export interface AzureAKSNodePool {
  name: string;
  vmSize: string;
  count: number;
  minCount?: number;
  maxCount?: number;
}

export interface AzureAKS {
  nodeCount: number;
  vmSize: string;
  enableAutoScaling: boolean;
  minCount?: number;
  maxCount?: number;
  nodePools?: AzureAKSNodePool[];
}

export interface AzureSubnets {
  aks: string;
  privateEndpoints: string;
  appGateway: string;
}

export interface AzureNetworking {
  vnetName: string;
  addressSpace: string;
  subnets: AzureSubnets;
}

export interface AzureLogAnalytics {
  workspaceName: string;
  retentionDays: number;
}

export interface AzureApplicationInsights {
  enabled: boolean;
}

export interface AzureMonitoring {
  logAnalytics: AzureLogAnalytics;
  applicationInsights: AzureApplicationInsights;
}

export interface AzureServices {
  cosmosdb: AzureCosmosDB;
  redis: AzureRedis;
  servicebus: AzureServiceBus;
  keyvault: AzureKeyVault;
  acr: AzureACR;
  aks: AzureAKS;
}

export interface AzureConfiguration {
  naming: AzureNaming;
  services: AzureServices;
  networking: AzureNetworking;
  monitoring: AzureMonitoring;
}

export interface AWSDocumentDB {
  enabled: boolean;
  instanceClass: string;
  instanceCount: number;
  secretArn: string;
  multiAZ?: boolean;
  backupRetentionPeriod?: number;
}

export interface AWSElastiCache {
  enabled: boolean;
  nodeType: string;
  numCacheNodes: number;
  secretArn: string;
  automaticFailoverEnabled?: boolean;
  multiAZ?: boolean;
}

export interface AWSAmazonMQ {
  enabled: boolean;
  instanceType: string;
  deploymentMode: string;
  secretArn: string;
}

export interface AWSECR {
  repositoryName: string;
  imageScanOnPush: boolean;
}

export interface AWSEKS {
  version: string;
  nodeGroupInstanceTypes: string[];
  desiredSize: number;
  minSize: number;
  maxSize: number;
}

export interface AWSServices {
  documentdb: AWSDocumentDB;
  elasticache: AWSElastiCache;
  amazonmq: AWSAmazonMQ;
  ecr: AWSECR;
  eks: AWSEKS;
}

export interface AWSNetworking {
  vpcCidr: string;
  availabilityZones: number;
  privateSubnets: string[];
  publicSubnets: string[];
}

export interface AWSCloudWatch {
  logRetentionDays: number;
}

export interface AWSXRay {
  enabled: boolean;
}

export interface AWSMonitoring {
  cloudWatch: AWSCloudWatch;
  xray: AWSXRay;
}

export interface AWSNaming {
  prefix: string;
  environment: string;
}

export interface AWSConfiguration {
  naming: AWSNaming;
  services: AWSServices;
  networking: AWSNetworking;
  monitoring: AWSMonitoring;
}

export interface GCPMongoDB {
  enabled: boolean;
  tier: string;
  provider: string;
  secretRef: string;
  replicationFactor?: number;
  autoScaling?: boolean;
}

export interface GCPMemorystore {
  enabled: boolean;
  tier: string;
  memorySizeGb: number;
  secretRef: string;
  replicaCount?: number;
}

export interface GCPPubSub {
  enabled: boolean;
  topics: string[];
}

export interface GCPArtifactRegistry {
  repository: string;
  format: string;
}

export interface GCPGKENodePool {
  name: string;
  machineType: string;
  nodeCount: number;
  minNodeCount?: number;
  maxNodeCount?: number;
}

export interface GCPGKE {
  version: string;
  nodeCount: number;
  machineType: string;
  enableAutoscaling: boolean;
  minNodeCount?: number;
  maxNodeCount?: number;
  nodePools?: GCPGKENodePool[];
}

export interface GCPServices {
  mongodb: GCPMongoDB;
  memorystore: GCPMemorystore;
  pubsub: GCPPubSub;
  artifactRegistry: GCPArtifactRegistry;
  gke: GCPGKE;
}

export interface GCPSecondaryRanges {
  pods: string;
  services: string;
}

export interface GCPNetworking {
  vpcName: string;
  subnetCidr: string;
  secondaryRanges: GCPSecondaryRanges;
}

export interface GCPCloudLogging {
  retentionDays: number;
}

export interface GCPCloudTrace {
  enabled: boolean;
}

export interface GCPMonitoring {
  cloudLogging: GCPCloudLogging;
  cloudTrace: GCPCloudTrace;
}

export interface GCPNaming {
  prefix: string;
  environment: string;
}

export interface GCPConfiguration {
  naming: GCPNaming;
  services: GCPServices;
  networking: GCPNetworking;
  monitoring: GCPMonitoring;
}

export interface CloudConfiguration {
  azure: AzureConfiguration;
  aws: AWSConfiguration;
  gcp: GCPConfiguration;
}

// ============================================================================
// Root Configuration Type
// ============================================================================

export interface ConfigRegistry {
  metadata: Metadata;
  services: Services;
  databases: Databases;
  build: BuildConfiguration;
  networks: Networks;
  connectionStrings: ConnectionStrings;
  security: SecurityConfiguration;
  cloud: CloudConfiguration;
}

// ============================================================================
// Environment Override Types
// ============================================================================

export interface EnvironmentCloudInfo {
  provider: 'azure' | 'aws' | 'gcp';
  region: string;
}

export interface EnvironmentInfo {
  name: string;
  description: string;
  cloud: EnvironmentCloudInfo;
}

export interface ImageConfiguration {
  registry: string;
  tag: string;
  pullPolicy: 'Always' | 'IfNotPresent' | 'Never';
}

export interface ServiceOverride {
  replicas?: number;
  resources?: ResourceRequirements;
  environment?: ServiceEnvironment;
  podDisruptionBudget?: PodDisruptionBudget;
}

export interface ServicesOverride {
  [serviceName: string]: ServiceOverride;
}

export interface PrometheusConfig {
  enabled: boolean;
  retention: string;
  highAvailability?: boolean;
}

export interface GrafanaConfig {
  enabled: boolean;
  highAvailability?: boolean;
}

export interface LoggingConfig {
  retention: string;
  archival?: string;
}

export interface TracingConfig {
  enabled: boolean;
  samplingRate?: number;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
}

export interface MonitoringOverride {
  enabled: boolean;
  prometheus: PrometheusConfig;
  grafana: GrafanaConfig;
  logging: LoggingConfig;
  tracing: TracingConfig;
  alerting?: AlertingConfig;
}

export interface AutoscalingOverride {
  enabled: boolean;
  minReplicas?: number;
  maxReplicas?: number;
  targetCPUUtilization?: number;
  targetMemoryUtilization?: number;
  scaleDownStabilizationWindowSeconds?: number;
  scaleUpStabilizationWindowSeconds?: number;
}

export interface BackupOverride {
  enabled: boolean;
  schedule: string;
  retention: string;
  archival?: string;
  pointInTimeRecovery?: boolean;
  crossRegionReplication?: boolean;
}

export interface SecurityOverride {
  networkPolicies?: boolean;
  podSecurityPolicies?: boolean;
  serviceAccounts?: {
    createPerService: boolean;
  };
  tls?: {
    enabled: boolean;
    provider: string;
  };
  secretsEncryption?: {
    enabled: boolean;
  };
}

export interface EnvironmentOverride {
  environment: EnvironmentInfo;
  images: ImageConfiguration;
  services: ServicesOverride;
  cloud: Partial<CloudConfiguration>;
  monitoring: MonitoringOverride;
  autoscaling: AutoscalingOverride;
  backup: BackupOverride;
  security?: SecurityOverride;
}
