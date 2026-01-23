import { ElementModel } from './ElementModel.js';

/**
 * Allows for grouping multiple elements
 */
export interface GroupModel {
  /**
   * The elements in the group
   */
  items: ElementModel[];
}
