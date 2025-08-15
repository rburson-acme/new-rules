import {
  BroadcastCastMessage,
  errorCodes,
  errorKeys,
  Event,
  Events,
  EventThrowable,
  eventTypes,
} from '../../thredlib/index.js';
import { Events as LocalEvents } from '../Events.js';
import { MessageTemplate } from '../MessageTemplate.js';
import { ReactionResult } from '../Reaction.js';
import { ThredStore } from '../store/ThredStore.js';
import { System } from '../System.js';
import { Transition } from '../Transition.js';

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
          const content: BroadcastCastMessage = {
            valuesType: 'broadcastMessage',
            values: { ...Events.getValues(event), messageSource: event.source },
          };
          const newEvent = LocalEvents.baseSystemEventBuilder({
            thredId: thredStore.id,
            type: eventTypes.system.broadcast.type,
          })
            .mergeData({ title: `Message from ${sourceId}` })
            .mergeContent(content)
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
