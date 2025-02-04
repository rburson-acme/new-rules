import { InteractionModel } from "./InteractionModel.js";
export interface TemplateModel {
    /**
     * The name of the template
     */
    name: string;
    /**
     * A description of the template
     */
    description?: string;
    /**
     * The interactions that make up the template
     */
    interactions: InteractionModel[];
}
