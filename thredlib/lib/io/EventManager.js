import { SocketIOConnection } from './SocketIOConnection.js';
export class EventManager {
    consumers = new Set();
    connection;
    connect(url, options) {
        this.connection = new SocketIOConnection(url, options);
        const connect = () => this.connection.setListener(this.connectionListener);
        return this.connection.connect().then(connect);
    }
    disconnect() {
        this.connection?.disconnect();
    }
    dispatch(event) {
        if (!this.connection)
            throw new Error(`Engine not connected`);
        this.connection.send(event);
    }
    connectionListener = (event) => {
        this.consumers.forEach(consumer => consumer(event));
    };
}
