import { DataContent, Event } from "./Event.js";
export interface EventParams {
    id: string;
    type: string;
    title?: string;
    description?: string;
    contentType?: string;
    source: Event['source'];
    thredId?: string;
    content?: any;
}
export declare class Events {
    static newEvent(params: EventParams): Event;
    static getDataContent(event: Event): DataContent;
}
