import { Event } from '../../thredlib/index.js';

export class EventStore {

    eventsByThredId: { [thredId: string]: Event[] } = {};

    addEvent(event: Event) {
        const thredId = event.thredId;
        if(!thredId) throw Error(`Event missing thredId: Event.id ${event.id}`);
        const thredEvents = this.eventsByThredId[thredId] || [];
        thredEvents.push(event);
        this.eventsByThredId[thredId] = thredEvents;
    }

    getEventsForThred(thredId: string): Event[] {
        return this.eventsByThredId[thredId];
    }

    get events(): Event[] {
        return Object.values(this.eventsByThredId).reduce((accum, events)=>[...accum,...events], []);
    }

}