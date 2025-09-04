import { observable, action, computed, makeObservable } from 'mobx';
import { StringMap, InteractionModel } from 'thredlib';

export class InteractionStore {
  values: StringMap<any> = {};
  interaction: InteractionModel;
  completedExternally = false;
  hydratedFromHistory = false;

  constructor(interaction: InteractionModel) {
    makeObservable(this, {
      values: observable,
      completedExternally: observable,
      setValue: action,
      setValueFromHistory: action,
      markCompletedExternally: action,
      isComplete: computed,
      hydratedFromHistory: observable,
    });

    this.interaction = interaction;
  }

  setValue(inputName: string, value: any) {
    this.values[inputName] = value;
    this.completedExternally = false;
    this.hydratedFromHistory = false;
  }

  setValueFromHistory(inputName: string, value: any) {
    this.values[inputName] = value;
    this.hydratedFromHistory = true;
  }

  getValue(inputName: string) {
    return this.values[inputName];
  }

  get isComplete() {
    return Object.keys(this.values).length > 0;
  }

  markCompletedExternally() {
    this.completedExternally = true;
  }
}
