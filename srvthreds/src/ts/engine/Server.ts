import { Engine } from './Engine.js';
import { EventQ } from '../queue/EventQ.js';
import { MessageQ } from '../queue/MessageQ.js';
import { Logger, StringMap, Parallel, Message } from '../thredlib/index.js';
import { Session } from '../sessions/Session.js';
import { RunConfig } from './Config.js';
import { System } from './System.js';
import { MessageTemplate } from './MessageTemplate.js';
import { QDispatcher } from './QDispatcher.js';

const { debug, error, warn, crit, h1, h2 } = Logger;

/**
 * The Server is the main entry point for the engine.
   It starts the engine and binds the tell() method to the engine's dispatchers.
   The tell method sends outgoing Messages to the MessageQ from the Engine, addressed to Agents and Participants.
   Other internal services must subscribe to these messages and handle them.
   i.e. The 'Agent' framework pull messages from the messageQ and determines how to handle them.
 */

   /*
     Note - the tell method current waits for message queing to be complete before resolving.
     In the future, we should experiment with finishing those ops asyncronously for performance tuning.
   */
export class Server {
  // @TODO seperate service
  private engine: Engine;

  constructor(
    inboundQ: EventQ,
    outboundQ: MessageQ,
  ) {
    this.engine = new Engine(inboundQ);
    const dispatcher = new QDispatcher(outboundQ);
    this.engine.dispatchers.push(dispatcher.tell);
  }

  async start(config?: RunConfig): Promise<void> {
    return this.engine.start(config);
  }

}
