import { ElementModel } from "./interaction/ElementModel.js";
/**
 * A model for facilitating user or machine interaction
 */
export interface InteractionModel {
    interaction: {
        content: ElementModel[];
    };
}
