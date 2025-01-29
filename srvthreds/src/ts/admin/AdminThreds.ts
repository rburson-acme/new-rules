import { PersistenceAdapter } from '../agent/persistence/PersistenceAdapter.js';
import { Dispatcher } from '../engine/Dispatcher.js';
import { Events } from '../engine/Events.js';
import { Id } from '../engine/Id.js';
import { ThredsStore } from '../engine/store/ThredsStore.js';
import { Threds } from '../engine/Threds.js';
import { PersistenceFactory } from '../persistence/PersistenceFactory.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { errorCodes, errorKeys, Event, eventTypes, EventValues, Logger, Message, ThredId } from '../thredlib/index.js';
import { AdminService } from './AdminService.js';

export class AdminThreds extends Threds {
  private adminService: AdminService;
  private persistenceAdapter: PersistenceAdapter;

  constructor(thredsStore: ThredsStore, dispatcher: Dispatcher) {
    super(thredsStore, dispatcher);
    this.adminService = new AdminService(this);
    this.persistenceAdapter = new PersistenceAdapter();
  }

    async initialize(): Promise<void> {
      await super.initialize();
      return this.persistenceAdapter.initialize();
    }

  async consider(event: Event): Promise<void> {
    if (AdminService.isAdminEvent(event)) {
      if(event.thredId !== ThredId.SYSTEM) {
        throw EventThrowable.get(
          `System event must have a system thredId: ${ThredId.SYSTEM}`,
          errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
        );
      }
      let values: EventValues['values'] | undefined;
        if (event.type === eventTypes.control.dataControl.type) {
          // persistence operation has a top level result key
          values = { result : await this.persistenceAdapter.execute(event) };
        } else if (event.type === eventTypes.control.sysControl.type) {
          values = await this.adminService.handleSystemEvent({ event: event });
        }
        const outboundEvent = Events.newEventFromEvent({
          prevEvent: event,
          title: `System Event -> Thred: ${event.thredId} -> Re: Event: ${event.id}`,
          content: { values },
        });
        const message: Message = { event: outboundEvent, id: outboundEvent.id, to: [event.source.id] };
        // don't wait for dispatch
        this.dispatch(message);
    } else {
      return super.consider(event);
    }
  }
}
