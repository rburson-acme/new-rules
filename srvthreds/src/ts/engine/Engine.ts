import { Logger, StringMap } from '../thredlib/index.js';
import { PatternModel } from '../thredlib/index.js';
import { Event } from '../thredlib/index.js';
import { Message } from '../thredlib/index.js';
import { Pattern } from './Pattern.js';
import { Threds } from './Threds.js';
import { ThredsStore } from './store/ThredsStore.js';
import { EventStore } from './store/EventStore.js';
import { PatternsStore } from './store/PatternsStore.js';
import { EventQ } from '../queue/EventQ.js';
import { StorageFactory } from '../storage/StorageFactory.js';
import { RunConfig, Config } from './Config.js';
import { QMessage } from '../queue/QService.js';

export class Engine {

    dispatchers: ((message: Message) => void)[] = [];
    readonly threds: Threds;
    readonly thredsStore: ThredsStore;

    constructor(readonly inboundQ: EventQ) {
        const storage = StorageFactory.getStorage();
        this.thredsStore = new ThredsStore(new EventStore(), new PatternsStore(storage), storage);
        this.threds = new Threds(this.thredsStore, this);
    }

    public start(config: RunConfig){
        const { patternModels } = config;
        const patterns = patternModels.map((patternModel: PatternModel) => new Pattern(patternModel));
        this.thredsStore.patternsStore.addPatterns(patterns);
        this.run();
    }

    public async shutdown(delay: number = 0): Promise<void> {
        setTimeout(async ()=>{
            await StorageFactory.disconnectAll();
            process.exit();
        }, delay);
    }

    // messages should also be routed to archival service here for failover and latent delivery
    /**
     * These are outbound 'messages', addressed to specific participants
     * 'React Systems' metaphor - message with address. (ie. tell)
     * @param event
     * @param to 
     */
    public dispatch(message: Message): void {
        //Logger.debug('<< Outbound Message >>', '\n', message);
        Logger.debug('<< Outbound Message >>', '\n', JSON.stringify(message, null, 2));
        this.dispatchers.forEach(dispatcher => dispatcher(message));
    }

    /*
        Begin pulling events from the Q
        Currently, logic depends on this being on 1 event at a time
        This could, in the future, be changed to 1 event per Thred at a time
    */
    private async run() {
        while(true) {
            const message: QMessage<Event> = await this.inboundQ.pop();
            try {
                await this.consider(message.payload);
                await this.inboundQ.delete(message);
            } catch(e) {
                Logger.error(`Failed to consider event ${message.payload?.id}`, e as Error, (e as Error).stack);
                await this.inboundQ.reject(message, e as Error).catch(Logger.error);
                // @TODO figure out on what types of Errors it makes sense to requeue
                // await this.inboundQ.requeue(message, e).catch(Logger.error);
            }
        }
    }

    /**
     * These are incoming 'events' to 'consumed' by any interested parties
     * 'Reactive Programming' metaphor - no 'addressee'. (ie. publish)
     * @param event
     */ 
    consider(event:Event):Promise<void> {
        //Logger.debug('<< Inbound Event >>', '\n', event);
        Logger.debug('<< Inbound Event >>', '\n', JSON.stringify(event, null, 2));
        return this.threds.consider(event);
    }

    get numThreds(): number {
        return this.thredsStore.numThreds;
    }
}