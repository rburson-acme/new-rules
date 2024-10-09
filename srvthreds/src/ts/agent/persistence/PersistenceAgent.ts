import { Message, Event } from '../../thredlib/index.js';
import { MessageHandler, MessageHandlerParams } from "../Agent.js";


export class PersistenceAgent implements MessageHandler{

    private params: MessageHandlerParams;

    constructor(params: MessageHandlerParams) {
        this.params = params;
    }

    processMessage(message: Message): Promise<void> {

        // Note arrays within the task array, donote a transaction
        // results should be structured accordingly
        // @TODO implement transactions for Mongo

        return Promise.resolve();
    }
    
    shutdown(): Promise<void> {
        return Promise.resolve();
    }

}