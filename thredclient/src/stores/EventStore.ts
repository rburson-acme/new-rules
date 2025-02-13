import { observable, action, autorun, makeObservable } from 'mobx';
import { TemplateStore } from './TemplateStore';
import { StringMap, Events, Event, eventTypes } from 'thredlib';
import { RootStore } from './RootStore';
import { Id } from '../core/Id';

export class EventStore {
  event?: Event = undefined;
  seen: boolean = false;
  isPublishing: boolean = false;
  openTemplateStore?: TemplateStore = undefined;
  private disposers: StringMap<() => void> = {};

  constructor(event: Event, private rootStore: RootStore) {
    makeObservable<EventStore, 'setupTemplate'>(this, {
      event: observable.shallow,
      isPublishing: observable,
      close: action,
      setupTemplate: action,
      setIsPublishing: action,
      seen: observable,
    });

    this.event = event;
    this.setupTemplate(event);
  }

  close() {
    this.cleanup();
  }

  private setupTemplate(event: Event) {
    if (event?.data?.advice?.eventType) {
      const template = event.data.advice.template;
      if (template) {
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
        const advice = this.event?.data?.advice;
        const content = this.openTemplateStore.getEventContent();
        const sourceId = authStore.userId || '$unauth';
        const sourceName = authStore.name || '$anon';

        const resolvedTitle = advice!.title
          ? `${sourceId} responded to '${advice!.title}`
          : `${sourceId} response to an event`;
        const event = Events.newEvent({
          id: Id.nextEventId(sourceId),
          type: advice!.eventType,
          data: { title: resolvedTitle, content },
          thredId: this.event?.thredId,
          source: { id: sourceId, name: sourceName },
        });

        thredsStore.publish(event);
        setTimeout(() => this.setIsPublishing(false), 1000);
      }
    });
  }
}
