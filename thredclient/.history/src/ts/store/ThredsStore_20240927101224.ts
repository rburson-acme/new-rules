import { observable, action, computed, autorun, makeObservable } from 'mobx';
import { Engine } from '../engine/Engine';
import { StringMap, Event, Logger } from 'thredlib';
import { Thred } from '../engine/Thred';
import { RootStore } from './rootStore';
import { ThredStore } from './ThredStore';

export class ThredsStore {

    thredStores: StringMap<ThredStore> = {};
    currentThredId?: string;

    private engine: Engine;

    constructor(readonly rootStore: RootStore) {
        makeObservable(this, {
            thredStores: observable.shallow,
            currentThredId: observable,
            addThred: action,
            selectThred: action,
            numThreds: computed,
            currentThredStore: computed,
        });

        this.engine = new Engine();
        this.engine.consumers.add(this.consume);
    }

    addThred(thred: Thred) {
        this.thredStores[thred.id] = new ThredStore(thred, this.rootStore);
        // @TODO - this can should be removed once we have a thred panel
        // this will need to change later - this automatically selects a new thred
        this.selectThred(thred.id);
    }

    selectThred(thredId: string) {
        this.currentThredId = thredId;
    }

    get currentThredStore(): ThredStore | undefined {
        const { thredStores, currentThredId } = this;
        return currentThredId ? thredStores[currentThredId] : undefined;
    }

    get numThreds(): number {
        return Object.keys(this.thredStores).length;
    }

    consume = (event: Event) => {
        const { thredId } = event;
        if (!thredId) throw Error(`Event missing thredId ${event}`);
        if (!this.thredStores[thredId]) {
            this.addThred({ id: thredId, name: thredId })
        }
        this.thredStores[thredId].addEvent(event);
    }

    publish(event: Event) {
        this.engine?.dispatch(event);
    }

    // @todo build seperate authentication using threds/events
    connect(userId: string) {
        this.engine.connect('http://10.0.2.2:3000', { transports: ['websocket'], jsonp: false, auth: { token: userId } })
        //this.engine.connect('http://proximl.com:3000', { transports: ['websocket'], jsonp: false, auth: { token: userId } })
            .catch((e) => { Logger.error(e)} )
            .then(() => {
       });
    }
}