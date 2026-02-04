import { Engine } from './Engine.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { Logger, StringMap, Parallel, Message, PatternModel } from '../thredlib/index.js';
import { Session } from '../sessions/Session.js';
import { System } from './System.js';
import { MessageTemplate } from './MessageTemplate.js';
import { QDispatcher } from './QDispatcher.js';

const { debug, error, warn, crit, h1, h2 } = Logger;

/**
 * The Server is the main entry point for the engine.
   It starts the engine and binds the tell() method to the engine's dispatchers.
   The dispatcher.tell method sends outgoing Messages to the MessageQ from the Engine, addressed to Agents and Participants.
   Other internal services must subscribe to these messages and handle them.
   i.e. The 'Agent' framework pulls messages from the MessageQ and determines how to handle them.
 */

export class Server {
  // @TODO seperate service
  private engine: Engine;

  constructor(inboundQ: EventQ, outboundQ: MessageQ) {
    this.engine = new Engine(inboundQ);
    const dispatcher = new QDispatcher(outboundQ);
    this.engine.dispatchers.push(dispatcher.tell);
  }

  async start(configOverrides?: { patternModels: PatternModel[] }): Promise<void> {
    return this.engine.start(configOverrides);
  }

  async shutdown(delay: number = 0): Promise<void> {
    return this.engine.shutdown(delay);
  }
}
