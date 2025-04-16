import { Event } from "./Event.js";
export declare class BuiltInEvents {
    static getBroadcastMessageEvent(thredId: string, source: Event['source'], message: string): Event;
}
