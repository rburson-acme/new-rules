
import { observable, action, computed, makeObservable } from 'mobx';
import { TemplateModel } from 'thredlib';
import { InteractionStore } from './InteractionStore';

export class TemplateStore {

    template: TemplateModel;
    interactionStores: InteractionStore[];

    constructor(template: TemplateModel) {
        makeObservable(this, {
            completedInteractionStores: computed,
            nextInteractionStore: computed,
            interactionsComplete: computed
        });

        this.template = template;
        this.interactionStores = template?.interactions?.map(item => new InteractionStore(item.interaction)) || [];
    }

    get completedInteractionStores() {
        return this.interactionStores.filter((interactionStore) => interactionStore.isComplete);
    }

    get nextInteractionStore() {
        return this.interactionStores.find((interactionStore) => !interactionStore.isComplete);
    }

    get interactionsComplete() {
        return this.interactionStores.length > 0 && this.interactionStores.every((interactionStore) => interactionStore.isComplete);
    }

    // content for the new Event
    getEventContent() {
        const values = this.interactionStores.reduce((accum, interactionStore) => {
            return { ...accum, ...interactionStore.values };
        }, {});

        return {
            type: this.template.name,
            values
        }
    }

}