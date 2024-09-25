
export type TransitionInput = 'forward' | 'default' | 'local';
export interface TransitionModel {
    name: string;
    description?: string;
    input?: TransitionInput;
    localName?: string;
}