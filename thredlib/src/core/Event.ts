import { TemplateModel } from "../model/TemplateModel.js";

export interface EventData {
    readonly title?: string;
    readonly description?: string;
    // mimetype/mediatype
    readonly contentType?: string;
    readonly content?: DataContent | any,
    readonly display?: {
        uri: string,
    }

}
export interface DataContent {
    // defines what is expected in return
    advice?: {
        eventType: string,
        title: string,
        template?: TemplateModel,
    },
    // application level content type - noot to be confused with 'contentType'
    type?: string,
    // the data related to this type
    values?: {}
}
export interface Event {
    readonly id: string;
    readonly thredId?: string;
    readonly type: string;
    time?: number;
    readonly source: {
        readonly id: string;
        readonly name?: string,
        readonly uri?: string;
    }
    readonly data?: EventData;
}

