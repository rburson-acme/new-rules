import { GroupModel } from './GroupModel.js';
import { ImageModel } from './ImageModel.js';
import { InputModel } from './InputModel.js';
import { MapModel } from './MapModel.js';
import { TextModel } from './TextModel.js';
import { VideoModel } from './VideoModel.js';

/**
 *  An element defines a type of UI Component
 */
export interface ElementModel {
  /**
   * Represents an input value to be supplied by the (UI) user
   */
  input?: InputModel;
  /**
   * Represents an image
   */
  image?: ImageModel;
  /**
   * Represents text content
   */
  text?: TextModel;
  /**
   * Represents a map
   */
  map?: MapModel;
  /**
   * Represents a video
   */
  video?: VideoModel;
  /**
   * Represents a group of (sub) elements
   */
  group?: GroupModel;
}
