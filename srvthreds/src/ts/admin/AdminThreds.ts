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
      const _event = { ...event, thredId: Id.getNextThredId(ThredId.SYSTEM) };
      let values: EventValues['values'] | undefined;
      try {
        if (_event.type === eventTypes.control.dataControl.type) {
          // persistence operation has a top level result key
          values = { result : await this.persistenceAdapter.execute(_event) };
        } else if (_event.type === eventTypes.control.sysControl.type) {
          values = await this.adminService.handleSystemEvent({ event: _event });
        }
        const outboundEvent = Events.newEventFromEvent({
          prevEvent: _event,
          title: `System Event -> Thred: ${_event.thredId} -> Re: Event: ${_event.id}`,
          content: { values },
        });
        const message: Message = { event: outboundEvent, id: outboundEvent.id, to: [_event.source.id] };
        // don't wait for dispatch
        this.dispatch(message);
      } catch (e) {
        const eventError =
          e instanceof EventThrowable ? e.eventError : { ...errorCodes[errorKeys.SERVER_ERROR], cause: e };
        Logger.error(`AdminAgent: failed to process event ${_event.id}::${_event.thredId}`, eventError, e);
        const outboundEvent = Events.newEventFromEvent({
          prevEvent: _event,
          title: `System Event Error -> Thred: ${_event.thredId} -> Re: Event: ${_event.id}`,
          error: eventError,
        });
      }
    } else {
      return super.consider(event);
    }
  }
}
