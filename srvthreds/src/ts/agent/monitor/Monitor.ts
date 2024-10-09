import { Logger } from '../../thredlib/index.js';

export class Monitor {

    async consume(event:Event):Promise<void> {
        Logger.debug('<< Inbound Event >>', '\n', JSON.stringify(event, null, 2));

        // start scheduling events
        return;
    }

}