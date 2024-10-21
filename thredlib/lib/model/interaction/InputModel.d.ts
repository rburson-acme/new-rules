import { ElementModel } from './ElementModel.js';
export declare enum InputType {
    CONSTANT = "constant",
    NOMINAL = "nominal",
    ORDINAL = "ordinal",
    BOOLEAN = "boolean"
}
export interface InputModel extends ElementModel {
    name: string;
    type: InputType;
    display: string;
}
