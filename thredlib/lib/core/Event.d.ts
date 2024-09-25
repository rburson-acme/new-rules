import { TemplateModel } from "../model/TemplateModel.js";
export interface EventData {
    readonly title?: string;
    readonly description?: string;
    readonly contentType?: string;
    readonly content?: DataContent | any;
    readonly display?: {
        uri: string;
    };
}
export interface DataContent {
    advice?: {
        eventType: string;
        title: string;
        template?: TemplateModel;
    };
    type?: string;
    values?: {};
}
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
    readonly data?: EventData;
}
