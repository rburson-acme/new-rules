import { observable, action, autorun, makeObservable } from "mobx";
import { TemplateStore } from "./TemplateStore";
import { StringMap, Events, Event, eventTypes } from "thredlib";
import { ThredsStore } from "./ThredsStore";
import { RootStore } from "./rootStore";
import { Id } from "../engine/Id";

export class EventStore {

    event?: Event = undefined;
    isPublishing: boolean = false;
    openTemplateStore?: TemplateStore = undefined;
    private disposers: StringMap<() => void> = {};

    constructor(event: Event, private rootStore: RootStore) {
        makeObservable<EventStore, "setupTemplate">(this, {
            event: observable.shallow,
            isPublishing: observable,
            close: action,
            setupTemplate: action,
            setIsPublishing: action
        });

        this.event = event;
        this.setupTemplate(event);
    }

    close() {
        this.cleanup();
    }

    private setupTemplate(event: Event) {
        if (event?.data?.content?.advice?.eventType) {
            const template = event.data.content.advice.template;
            if(template) {
                this.openTemplateStore = new TemplateStore(template);
                this.watchTemplate();
            }
        }
    }

    setIsPublishing(isPublishing: boolean) {
        this.isPublishing = isPublishing;
    }

    private cleanup() {
        Object.values(this.disposers).forEach(disposer => disposer());
    }

    private watchTemplate() {

        const { authStore, thredsStore } = this.rootStore;

        if (this.disposers.template) this.disposers.template();
        this.disposers.template = autorun(reaction => {
            if (this.openTemplateStore?.interactionsComplete) {
                this.setIsPublishing(true);
                const advice = this.event?.data?.content?.advice;
                const content = this.openTemplateStore.getEventContent();
                const sourceId = authStore.userId || '$unauth';
                const sourceName = authStore.name || '$anon';
                const resolvedTitle = advice.title ? `${sourceId} responded to '${advice.title}` : undefined;
                Events.newEvent({
                    id: Id.nextEventId(sourceId),
                    sourceId,
                    type: advice.eventType,
                    title: resolvedTitle,
                    content,
                    thredId: this.event?.thredId,
                });

                thredsStore.publish(event);
                setTimeout(()=>this.setIsPublishing(false), 1000);
            }
        });
    }



}