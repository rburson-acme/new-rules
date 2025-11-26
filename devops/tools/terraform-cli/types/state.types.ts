/**
 * Terraform state-related type definitions
 */

// import type { TerraformOutput } from './index.js';

/**
 * Terraform state structure
 */
export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, TerraformOutput>;
  resources: Array<TerraformResource>;
}

/**
 * Resource representation in Terraform state
 */
export interface TerraformResource {
  type: string;
  name: string;
  provider?: string;
  module?: string;
}

/**
 * Output value from Terraform with metadata
 */
export interface TerraformOutput {
  value: any;
  type?: string;
  sensitive?: boolean;
}
