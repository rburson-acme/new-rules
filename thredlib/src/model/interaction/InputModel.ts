export interface BooleanInput {
  name: string;
  type: "boolean";
  display: string;
  set: {
    display: string;
    value: boolean;
  }[];
}

export interface NumericInput {
  name: string;
  type: "numeric";
  display: string;
}

export interface TextInput {
  name: string;
  type: "text";
  display: string;
}

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
  
