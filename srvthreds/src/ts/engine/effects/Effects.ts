import { BroadcastCastMessage, errorCodes, errorKeys, Event, Events, EventThrowable, eventTypes } from '../../thredlib';
import { Events as LocalEvents } from '../Events';
import { MessageTemplate } from '../MessageTemplate';
import { ReactionResult } from '../Reaction';
import { ThredStore } from '../store/ThredStore';
import { System } from '../System';
import { Threds } from '../Threds';
import { Transition } from '../Transition';

/**
 * Class to handle effects that may be triggered by thred transitions
 */
export class Effects {
  static hasEffect(event: Event): boolean {
    return this.isClientTellType(event);
  }

  /*
   * Client events may be broadcast to all participants in the thred
   * i.e. client interaction submissions may be shown to all participants
   */
  static isClientTellType(event: Event): boolean {
    return event.type === eventTypes.client.tell.type;
  }

  /*
    When submitting an interaction, the client must set the 're:' field to the id of the event containing the event data template
    This allows the client to help identify the event for which this is broadcast response
  */
  static async run(event: Event, thredStore: ThredStore, threds: Threds): Promise<void> {
    if (Effects.hasEffect(event)) {
      if (Effects.isClientTellType(event)) {
        if (thredStore.pattern.echoResponses) {
          const addressResolver = System.getSessions().getAddressResolver();
          const sourceId = event.source.id;
          // send the clients repsponse event to all (non-agent) participants in the thred
          const thredParticpantIds = await addressResolver.getParticipantIdsFor(['$thred'], thredStore.thredContext);
          // check participant membership in thred
          if (thredParticpantIds.includes(sourceId)) {
            // make the new event
            const content: BroadcastCastMessage = {
              valuesType: 'broadcastValues',
              values: { ...Events.getValues(event), messageSource: event.source, re: event.re },
            };
            const newEvent = LocalEvents.baseSystemEventBuilder({
              thredId: thredStore.id,
              type: eventTypes.system.broadcast.type,
            })
              .mergeData({ title: `Action by ${sourceId}` })
              .mergeContent(content)
              .build();

            // don't broadcast to the source of the message
            const to = thredParticpantIds.filter((id) => id !== sourceId);
            const messageTemplate: MessageTemplate = { event: newEvent, to };
            await threds.handleMessage(messageTemplate);
          } else {
            throw EventThrowable.get({
              message: `Participant ${sourceId} is not a member of the thred ${thredStore.id} and cannot broadcast`,
              code: errorCodes[errorKeys.UNAUTHORIZED].code,
            });
          }
        }
      }
    }
  }
}
