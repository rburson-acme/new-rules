import { errorCodes, errorKeys, EventThrowable, eventTypes, Event, EventBuilder, Events } from '../../thredlib';
import { Events as LocalEvents } from '../Events';
import { MessageTemplate } from '../MessageTemplate';
import { ThredStore } from '../store/ThredStore';
import { System } from '../System';
import { Threds } from '../Threds';

export class BuiltInOps {
  static isBuiltInOp(event: Event): boolean {
    return this.isBroadcastType(event);
  }

  static isBroadcastType(event: Event): boolean {
    return event.type === eventTypes.client.broadcast.type;
  }

  static async consider(event: Event, thredStore: ThredStore, threds: Threds): Promise<void> {
    // handle a broadcast message
    if (this.isBroadcastType(event)) {
      if (thredStore.pattern.broadcastAllowed) {
        const addressResolver = System.getSessions().getAddressResolver();
        const sourceId = event.source.id;
        // send the event to all (non-agent) participants in the thred
        const thredParticpantIds = await addressResolver.getParticipantIdsFor(['$thred']);
        // check participant membership in thred
        if (thredParticpantIds.includes(sourceId)) {
          if (!Events.valueNamed(event, 'message')) {
            throw EventThrowable.get(
              `Broadcast event ${event.id} must have a 'message' value`,
              errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
            );
          }
          // make the new event
          const _values = { ...Events.getValues(event), messageSource: event.source };
          const newEvent = LocalEvents.baseSystemEventBuilder({
            thredId: thredStore.id,
            type: eventTypes.system.broadcast.type,
          })
            .mergeValues(_values)
            .mergeData({ title: `Message from ${sourceId}` })
            .build();

          // don't broadcast to the source of the message
          const to = thredParticpantIds.filter((id) => id !== sourceId);
          const messageTemplate: MessageTemplate = { event: newEvent, to };

          //send message
          await threds.dispatch(messageTemplate, thredStore.thredContext);

        } else {
          throw EventThrowable.get(
            `Participant ${sourceId} is not a member of the thred ${thredStore.id} and cannot broadcast`,
            errorCodes[errorKeys.UNAUTHORIZED].code,
          );
        }
      } else {
        throw EventThrowable.get(
          `Pattern ${thredStore.pattern.name} does not allow broadcast events`,
          errorCodes[errorKeys.UNAUTHORIZED].code,
        );
      }
    }
  }
}
