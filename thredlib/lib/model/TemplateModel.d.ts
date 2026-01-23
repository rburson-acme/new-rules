import { InteractionModel } from "./InteractionModel.js";
/**
 * A TemplateModel describes a user interaction in a UI agnostic way.
 * It is made up of one or more InteractionModels that specify what data should be collected or displayed.
 */
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
