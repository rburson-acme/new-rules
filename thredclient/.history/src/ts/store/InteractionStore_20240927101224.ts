
import { observable, action, computed, makeObservable } from 'mobx';
import { StringMap } from 'thredlib';

export class InteractionStore {

    values: StringMap<any> = {};
    interaction: any;

    constructor(interaction: any) {
        makeObservable(this, {
            values: observable,
            setValue: action,
            isComplete: computed
        });

        this.interaction = interaction;
    }

    setValue(inputName: string, value: any) {
        this.values[inputName] = value;
    }

    getValue(inputName: string) {
        return this.values[inputName];
    }

    get isComplete() {
        return Object.keys(this.values).length > 0;
    }

}