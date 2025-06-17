import { PersistenceAdapter } from '../agent/persistence/PersistenceAdapter.js';
import { Events } from '../engine/Events.js';
import { MessageHandler } from '../engine/MessageHandler.js';
import { ThredsStore } from '../engine/store/ThredsStore.js';
import { Threds } from '../engine/Threds.js';
import { EventThrowable } from '../thredlib/core/Errors.js';
import { errorCodes, errorKeys, Event, eventTypes, EventValues, Message, ThredId } from '../thredlib/index.js';
import { AdminService } from './AdminService.js';
import { SystemService } from './SystemService.js';
import { UserService } from './UserService.js';
import { SystemController as Sc } from '../persistence/controllers/SystemController.js';

export class SystemThreds extends Threds {
  private adminService: AdminService;
  private userService: UserService;
  private persistenceAdapter: PersistenceAdapter;

  constructor(thredsStore: ThredsStore, messageHandler: MessageHandler) {
    super(thredsStore, messageHandler);
    this.adminService = new AdminService(this);
    this.userService = new UserService(this);
    this.persistenceAdapter = new PersistenceAdapter();
  }

  async initialize(): Promise<void> {
    await super.initialize();
    return this.persistenceAdapter.initialize();
  }

  /**
   *  This implementation of consider intercepts and routes system events
   *  These events do not create Threds, but rather handle system-level operations
   *  If the event is not a system event, it calls the base implementation
   */
  async consider(event: Event): Promise<void> {
    if (SystemService.isSystemEvent(event)) {
      // record the event before consideration
      await Sc.get().replaceEvent({ event: { ...event }, timestamp: Date.now() });
      if (event.thredId !== ThredId.SYSTEM) {
        throw EventThrowable.get({
          message: `System event must have a system thredId: ${ThredId.SYSTEM}`,
          code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
        });
      }
      let values: EventValues['values'] | undefined;
      if (SystemService.isAdminEvent(event)) {
        //@TODO verify admin permissions of the source
        if (event.type === eventTypes.control.dataControl.type) {
          // persistence operation has a top level result key
          values = { result: await this.persistenceAdapter.execute(event) };
        } else if (event.type === eventTypes.control.sysControl.type) {
          values = await this.adminService.handleSystemEvent({ event: event });
        }
      } else if (event.type === eventTypes.control.userControl.type) {
        values = await this.userService.handleSystemEvent({ event: event });
      }
      const outboundEvent = Events.newEventFromEvent({
        prevEvent: event,
        title: `System Event -> Thred: ${event.thredId} -> Re: Event: ${event.id}`,
        content: { values },
      });
      const message: Message = { event: outboundEvent, id: outboundEvent.id, to: [event.source.id] };
      await this.handleMessage(message);
    } else {
      return super.consider(event);
    }
  }
}
