import { TemplateModel } from "../model/TemplateModel.js";
export interface Event {
    readonly id: string;
    readonly thredId?: string;
    readonly type: string;
    time?: number;
    readonly source: {
        readonly id: string;
        readonly name?: string;
        readonly uri?: string;
    };
    readonly re?: string;
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
export type EventContent = EventValues & EventTasks & Resources & InlineContent & EventError;
export interface EventError {
    error?: {
        message: string;
        code?: number;
        cause?: any;
    };
}
export interface EventValues {
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
    readonly options?: Record<string, any>;
}
export interface EventTaskParams {
    readonly type: string;
    readonly values?: Record<string, any> | any[];
    readonly matcher?: Record<string, any>;
    readonly selector?: Record<string, any>;
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
