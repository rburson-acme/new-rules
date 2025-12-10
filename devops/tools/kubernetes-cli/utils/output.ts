/**
 * Output Formatting Utilities
 *
 * Shared formatting for deployment results across all CLI commands.
 */

import { logger } from '../../shared/logger.js';
import type { DeploymentResult } from '../../kubernetes-deployer/src/types/index.js';
import type { ProjectConfig } from '../config/project-loader.js';

/**
 * Format and display deployment result
 */
export function formatDeploymentResult(
  result: DeploymentResult,
  config: ProjectConfig,
  target: string,
  durationMs: number,
): void {
  const duration = (durationMs / 1000).toFixed(2);

  logger.info('');
  logger.info('='.repeat(60));

  if (result.success) {
    logger.success('DEPLOYMENT SUCCESSFUL');
    logger.info('='.repeat(60));
    logger.info(`  Project:     ${config.name}`);
    logger.info(`  Target:      ${target}`);
    logger.info(`  Duration:    ${duration}s`);
    logger.info(`  Image Tag:   ${result.state.imageTag || 'latest'}`);
    logger.info(`  Status:      ${result.state.status}`);

    if (result.state.deployedResources && result.state.deployedResources.length > 0) {
      logger.info(`  Resources:   ${result.state.deployedResources.length} deployed`);
      logger.info('');
      logger.info('Deployed Resources:');
      for (const resource of result.state.deployedResources) {
        logger.info(`  - ${resource.kind}/${resource.name} (${resource.namespace})`);
      }
    }

    logger.info('');
    printNextSteps(target, config);
  } else {
    logger.failure('DEPLOYMENT FAILED');
    logger.info('='.repeat(60));
    logger.info(`  Project:     ${config.name}`);
    logger.info(`  Target:      ${target}`);
    logger.info(`  Duration:    ${duration}s`);
    logger.info(`  Status:      ${result.state.status}`);

    if (result.errors && result.errors.length > 0) {
      logger.info('');
      logger.info('Errors:');
      for (const error of result.errors) {
        logger.info(`  - ${error.message}`);
      }
    }

    logger.info('');
    printTroubleshootingTips(target, config.kubernetes.namespace);
  }
}

/**
 * Print next steps after successful deployment
 */
function printNextSteps(target: string, config: ProjectConfig): void {
  logger.info('Next Steps:');

  const namespace = config.kubernetes.namespace;
  const mainDeployment = config.kubernetes.deployments[0];

  if (!mainDeployment) {
    logger.warn('No deployments configured in project config');
    return;
  }

  if (target === 'minikube') {
    logger.info(`  1. Check pods:       kubectl get pods -n ${namespace}`);
    logger.info(`  2. View logs:        kubectl logs -f deployment/${mainDeployment} -n ${namespace}`);
    logger.info(`  3. Port forward:     kubectl port-forward svc/<service-name> 3000:3000 -n ${namespace}`);
    logger.info(`  4. Access at:        http://localhost:3000`);
    logger.info(`  5. Dashboard:        minikube dashboard`);
  } else {
    // AKS
    logger.info(`  1. Check pods:       kubectl get pods -n ${namespace}`);
    logger.info(`  2. View logs:        kubectl logs -f deployment/${mainDeployment} -n ${namespace}`);
    logger.info(`  3. Check services:   kubectl get svc -n ${namespace}`);
  }
}

/**
 * Print troubleshooting tips for failed deployments
 */
function printTroubleshootingTips(target: string, namespace: string): void {
  logger.info('Troubleshooting:');

  if (target === 'minikube') {
    logger.info('  - Check Minikube status:   minikube status');
    logger.info(`  - View pod events:         kubectl describe pods -n ${namespace}`);
    logger.info('  - Check Docker:            docker info');
    logger.info('  - Reset cluster:           k8s minikube cleanup && k8s minikube deploy -p <project>');
  } else {
    // AKS
    logger.info('  - Check Azure login:       az account show');
    logger.info(`  - View pod events:         kubectl describe pods -n ${namespace}`);
    logger.info('  - Check AKS cluster:       az aks show -g <rg> -n <cluster>');
    logger.info('  - View AKS logs:           az aks browse -g <rg> -n <cluster>');
  }
}

/**
 * Format a table of key-value pairs
 */
export function formatKeyValueTable(data: Record<string, string | number | boolean>): void {
  const maxKeyLen = Math.max(...Object.keys(data).map((k) => k.length));

  for (const [key, value] of Object.entries(data)) {
    logger.info(`  ${key.padEnd(maxKeyLen + 2)} ${value}`);
  }
}
