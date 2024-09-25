import { DataContent, Event } from "./Event.js";
export interface EventParams {
    id: string;
    type: string;
    title?: string;
    description?: string;
    contentType?: string;
    sourceId: string;
    sourceName?: string;
    thredId?: string;
    content?: any;
}
export declare class Events {
    static newEventFromAdvice(advice: DataContent["advice"], params: EventParams): Event;
    static newEvent(params: EventParams): Event;
    static getDataContent(event: Event): DataContent;
}
