import { errorCodes, errorKeys, Event, Events, EventThrowable, eventTypes } from '../../thredlib';
import { Events as LocalEvents } from '../Events';
import { MessageTemplate } from '../MessageTemplate';
import { ReactionResult } from '../Reaction';
import { ThredStore } from '../store/ThredStore';
import { System } from '../System';
import { Transition } from '../Transition';

export class BuiltInReaction {
  static isBuiltInOp(event: Event): boolean {
    return this.isBroadcastType(event);
  }

  static isBroadcastType(event: Event): boolean {
    return event.type === eventTypes.client.broadcast.type;
  }

  static async apply(event: Event, thredStore: ThredStore): Promise<ReactionResult | undefined> {
    // handle a broadcast message
    if (BuiltInReaction.isBroadcastType(event)) {
      if (thredStore.pattern.broadcastAllowed) {
        const addressResolver = System.getSessions().getAddressResolver();
        const sourceId = event.source.id;
        // send the event to all (non-agent) participants in the thred
        const thredParticpantIds = await addressResolver.getParticipantIdsFor(['$thred'], thredStore.thredContext);
        // check participant membership in thred
        if (thredParticpantIds.includes(sourceId)) {
          if (!Events.valueNamed(event, 'message')) {
            throw EventThrowable.get({
              message: `Broadcast event ${event.id} must have a 'message' value`,
              code: errorCodes[errorKeys.MISSING_ARGUMENT_ERROR].code,
            });
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
          return { messageTemplate, transition: new Transition({ name: Transition.NO_TRANSITION }) };
        } else {
          throw EventThrowable.get({
            message: `Participant ${sourceId} is not a member of the thred ${thredStore.id} and cannot broadcast`,
            code: errorCodes[errorKeys.UNAUTHORIZED].code,
          });
        }
      } else {
        throw EventThrowable.get({
          message: `Pattern ${thredStore.pattern.name} does not allow broadcast events`,
          code: errorCodes[errorKeys.UNAUTHORIZED].code,
        });
      }
    }
  }
}
