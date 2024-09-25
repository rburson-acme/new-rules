import { MachineContext } from './MachineContext.js';
export interface Transition<S, T> {
    /**
     * Evaluate an event and return a state name to transition to or falsey to remain in the current state
     */
    (params: {
        event: S;
        machineContext: MachineContext<T>;
    }): string | null | undefined;
}
