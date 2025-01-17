import { InteractionModel } from "./InteractionModel.js";
export interface TemplateModel {
    name: string;
    description?: string;
    interactions: InteractionModel[];
}
