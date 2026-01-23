
/**
 * Defines the structure of various input models used in the application.
 */

/**
 * Represents a boolean input model
 * @property {string} name - The name of the input.
 * @property {"boolean"} type - The type of the input, fixed as "boolean".
 * @property {string} display - The display label for the input.
 * @property {Array<{display: string; value: boolean}>} set - The set of values for the boolean input. May be any nuymber of values representing true/false options.
 */ 
export interface BooleanInput {
  name: string;
  type: "boolean";
  display: string;
  set: {
    display: string;
    value: boolean;
  }[];
}

/**
 * Represents a numeric input model
 * @property {string} name - The name of the input.
 * @property {"numeric"} type - The type of the input, fixed as "numeric".
 * @property {string} display - The display label for the numericinput.
 */
export interface NumericInput {
  name: string;
  type: "numeric";
  display: string;
}

/**
 * Represents a text input model
 * @property {string} name - The name of the input.
 * @property {"text"} type - The type of the input, fixed as "text".
 * @property {string} display - The display label for the text input.  
 */
export interface TextInput {
  name: string;
  type: "text";
  display: string;
}

/**
 * Represents a nominal input model
 * @property {string} name - The name of the input.
 * @property {"nominal"} type - The type of the input, fixed as "nominal".
 * @property {string} display - The display label for the nominal input.
 * @property {Array<{display: string; value: string}>} set - The set of values for the nominal input.
 * @property {boolean} [multiple] - Optional flag indicating if multiple selections are allowed.
 */
export interface NominalInput {
  name: string;
  type: "nominal";
  display: string;
  set: {
    display: string;
    value: string;
  }[];
  multiple?: boolean;
}

export type InputModel = BooleanInput | NumericInput | TextInput | NominalInput;
  
