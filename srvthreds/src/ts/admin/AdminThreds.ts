import { AdminAdapter } from '../agent/admin/AdminAdapter.js';
import { PersistenceAdapter } from '../agent/persistence/PersistenceAdapter.js';
import { Dispatcher } from '../engine/Dispatcher.js';
import { Events } from '../engine/Events.js';
import { Id } from '../engine/Id.js';
import { ThredsStore } from '../engine/store/ThredsStore.js';
import { Threds } from '../engine/Threds.js';
import { PersistenceFactory } from '../persistence/PersistenceFactory.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { errorCodes, errorKeys, Event, eventTypes, EventValues, Logger, ThredId } from '../thredlib/index.js';
import { AdminService } from './AdminService.js';

export class AdminThreds extends Threds {
  private adminService: AdminService;
  private persistenceAdapter: PersistenceAdapter;

  constructor(thredsStore: ThredsStore, dispatcher: Dispatcher) {
    super(thredsStore, dispatcher);
    this.adminService = new AdminService(this);
    this.persistenceAdapter = new PersistenceAdapter(PersistenceFactory.getPersistence());
  }

  async consider(event: Event): Promise<void> {
    if (AdminService.isSystemEvent(event)) {
      const _event = { ...event, thredId: Id.getNextThredId(ThredId.SYSTEM) };
      let result: EventValues['values'] | undefined;
      try {
        if (_event.type === eventTypes.control.dataControl.type) {
          result = await this.persistenceAdapter.execute(_event);
        } else if (_event.type === eventTypes.control.sysControl.type) {
          result = await this.adminService.handleSystemEvent({ event: _event });
        }
        const outboundEvent = Events.newEventFromEvent({
          prevEvent: _event,
          title: `System Event -> Thred: ${_event.thredId} -> Re: Event: ${_event.id}`,
          result: { values: result },
        });
        //const message: Message = { event: outboundEvent, id: outboundEvent.id, to: [_event.source.id] };
        //await this.dispatchMessage(message);
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
      super.consider(event);
    }
  }
}
