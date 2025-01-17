import io from 'socket.io-client';
import { Logger } from '../lib/Logger.js';
export class SocketIOConnection {
    url;
    options;
    socket;
    listener;
    constructor(url, options) {
        this.url = url;
        this.options = options;
        this.listener = () => { };
    }
    // @TODO
    // authenticate();
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.url, this.options);
            this.socket.on('connect', () => {
                Logger.debug('client connected!');
                resolve();
            });
            this.socket.on('message', this.onMessage);
            this.registerConnectErrors(['error', 'connect_error', 'connect_timeout'], reject);
        });
    }
    disconnect() {
        this.socket?.disconnect();
    }
    setListener(listener) {
        this.listener = listener;
    }
    send(event) {
        this.socket?.send(event);
    }
    registerConnectErrors(errorNames, reject) {
        errorNames.forEach(errorName => this.socket?.on(errorName, reject));
    }
    onMessage = (event) => {
        this.listener(event);
    };
}
