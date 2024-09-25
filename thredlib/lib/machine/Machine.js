export class Machine {
    machineContext;
    static createMachine(definition, machineContext) {
        const { initialStateName, states } = definition;
        return new Machine(initialStateName, states, machineContext);
    }
    initialState;
    currentState;
    states;
    constructor(initialStateName, states, machineContext) {
        this.machineContext = machineContext;
        //states array to mapped by name
        this.states = states.reduce((accum, state) => { accum[state.name] = state; return accum; }, {});
        this.initialState = this.states[initialStateName];
        this.currentState = this.initialState;
    }
    apply(event) {
        const { transition } = this.currentState;
        const targetStateName = transition({ event, machineContext: this.machineContext });
        if (targetStateName) {
            this.currentState = this.states[targetStateName];
        }
    }
}
