import { TemplateModel } from "../model/TemplateModel.js";
export interface Event {
    readonly id: string;
    readonly thredId?: string;
    readonly type: string;
    time?: number;
    readonly source: EventSource;
    readonly data?: EventData;
}
export interface EventData {
    readonly title?: string;
    readonly description?: string;
    readonly display?: {
        uri: string;
    };
    advice?: {
        eventType: string;
        title?: string;
        template?: TemplateModel;
    };
    readonly content?: EventContent;
}
export type EventContent = EventValues & EventTasks & Resources & InlineContent;

interface EventValues {
    values?: Record<string, any> | Record<string, any>[];
}
export interface EventTasks {
    readonly tasks?: (EventTask | EventTask[])[];
}
export interface Resources {
    readonly resources?: Resource[];
}
export interface InlineContent {
    items?: InlineItem[];
}
export interface EventTask {
    readonly op: string;
    readonly name?: string;
    readonly params?: EventTaskParams;
}
export interface EventTaskParams {
    readonly type: string;
    readonly values?: {} | any[];
    readonly matcher?: {};
    readonly selector?: {};
}
export interface Resource {
    readonly contentType: string;
    readonly uri: string;
}
export interface InlineItem {
    readonly contentType: string;
    readonly encoding: string;
    readonly content: string;
}
export {};

export interface EventSource {
    readonly id: string;
    readonly name?: string;
    readonly uri?: string;
}
