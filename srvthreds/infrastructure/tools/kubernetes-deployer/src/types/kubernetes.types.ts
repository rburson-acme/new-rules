/**
 * Kubernetes-specific types
 */

/**
 * Kubernetes context information
 */
export interface KubernetesContext {
  name: string;
  cluster: string;
  user: string;
  namespace?: string;
}

/**
 * Pod information
 */
export interface Pod {
  name: string;
  namespace: string;
  status: PodStatus;
  ready: boolean;
  restarts: number;
  age: string;
  containers?: Container[];
}

/**
 * Pod status
 */
export type PodStatus = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'Unknown';

/**
 * Container information
 */
export interface Container {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state?: ContainerState;
}

/**
 * Container state
 */
export interface ContainerState {
  waiting?: { reason: string };
  running?: { startedAt: string };
  terminated?: { reason: string; exitCode: number };
}

/**
 * Deployment information
 */
export interface Deployment {
  name: string;
  namespace: string;
  replicas: {
    desired: number;
    current: number;
    ready: number;
    available: number;
  };
  conditions?: DeploymentCondition[];
}

/**
 * Deployment condition
 */
export interface DeploymentCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

/**
 * Service information
 */
export interface Service {
  name: string;
  namespace: string;
  type: ServiceType;
  clusterIP: string;
  externalIP?: string;
  ports: ServicePort[];
  selector?: Record<string, string>;
}

/**
 * Service type
 */
export type ServiceType = 'ClusterIP' | 'NodePort' | 'LoadBalancer' | 'ExternalName';

/**
 * Service port information
 */
export interface ServicePort {
  name?: string;
  port: number;
  targetPort: number | string;
  protocol: string;
  nodePort?: number;
}

/**
 * Secret information
 */
export interface Secret {
  name: string;
  namespace: string;
  type: string;
  data: Record<string, string>;
}

/**
 * ConfigMap information
 */
export interface ConfigMap {
  name: string;
  namespace: string;
  data: Record<string, string>;
}

/**
 * Namespace information
 */
export interface Namespace {
  name: string;
  status: string;
  labels?: Record<string, string>;
}

/**
 * Resource limits and requests
 */
export interface ResourceRequirements {
  limits?: {
    cpu?: string;
    memory?: string;
  };
  requests?: {
    cpu?: string;
    memory?: string;
  };
}

/**
 * Label selector
 */
export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

/**
 * Label selector requirement
 */
export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}
