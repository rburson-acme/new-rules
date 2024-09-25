import { StringMap } from '../lib/StringMap.js';
import { MachineContext } from './MachineContext.js';
import { State } from './State.js';

export interface MachineDefinition<S, T> {
    initialStateName: string;
    states: State<S, T>[];
}

export class Machine<S, T>{

    static createMachine<S, T>(definition: MachineDefinition<S, T>, machineContext: MachineContext<T>) {
        const { initialStateName, states } = definition;
        return new Machine<S, T>(initialStateName, states, machineContext);
    }

    readonly initialState: State<S, T>;
    currentState: State<S, T>;
    readonly states: StringMap<State<S, T>>;

    constructor(
        initialStateName: string,
        states: State<S, T>[],
        readonly machineContext: MachineContext<T>
    ) {
        //states array to mapped by name
        this.states = states.reduce((accum: StringMap<State<S, T>>, state) => { accum[state.name] = state; return accum }, {});
        this.initialState = this.states[initialStateName];
        this.currentState = this.initialState;
    }

    apply(event: S) {
        const { transition } = this.currentState;
        const targetStateName = transition({ event, machineContext: this.machineContext });
        if (targetStateName) {
            this.currentState = this.states[targetStateName];
        }
    }
}