import { Connection, SocketIOConnection, Event  } from 'thredlib';


/*

    @TODO - replace this with the EventManager from 'thredlib'


*/
export class Engine {
    
    consumers:Set<(event: Event)=>void> = new Set();
    private connection?:Connection;

    connect(url:string, options:{}):Promise<void> {
        this.connection = new SocketIOConnection(url, options);
        const connect = () => (this.connection as Connection).setListener(this.connectionListener);
        return this.connection.connect().then(connect);
    }

    dispatch(event:Event): void {
        if(!this.connection) throw new Error(`Engine not connected`);
        this.connection.send(event);
    }

    connectionListener = (event: Event):void => {
        this.consumers.forEach(consumer => consumer(event));
    }
}