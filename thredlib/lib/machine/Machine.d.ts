import { StringMap } from '../lib/StringMap.js';
import { MachineContext } from './MachineContext.js';
import { State } from './State.js';
export interface MachineDefinition<S, T> {
    initialStateName: string;
    states: State<S, T>[];
}
export declare class Machine<S, T> {
    readonly machineContext: MachineContext<T>;
    static createMachine<S, T>(definition: MachineDefinition<S, T>, machineContext: MachineContext<T>): Machine<S, T>;
    readonly initialState: State<S, T>;
    currentState: State<S, T>;
    readonly states: StringMap<State<S, T>>;
    constructor(initialStateName: string, states: State<S, T>[], machineContext: MachineContext<T>);
    apply(event: S): void;
}
