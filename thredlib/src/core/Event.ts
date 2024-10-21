import { TemplateModel } from "../model/TemplateModel.js";

export interface Event {
    // unique identifier for the event
    readonly id: string;
    // the thred to which the event belongs if already assigned
    readonly thredId?: string;
    // the fully qualified event type (this should be a 'class' of event)
    readonly type: string;
    // time of event inception
    time?: number;
    // the source of the event
    readonly source: {
        // the unique identifier of the source
        readonly id: string;
        // A human readable name for the source
        readonly name?: string,
        // an optional representation of the source
        readonly uri?: string;
    }
    // the data envelope for the event
    readonly data?: EventData;
}

export interface EventData {
    // human readable title of the event
    readonly title?: string;
    // human readable description of the event
    readonly description?: string;
    // mimetype/mediatype
    readonly contentType?: string;
    // the actual content of the data envelope
    readonly content?: DataContent | any,
    // an optional representation of the event for display
    readonly display?: {
        uri: string,
    }

}
export interface DataContent {
    // defines what is expected in return
    advice?: {
        // the type of event that is expected
        eventType: string,
        // the title of the event
        title: string,
        // an interaction template that describes what data to collect
        template?: TemplateModel,
    },
    // application level content type - not to be confused with 'contentType'
    type?: string,
    // the data related to this type
    values?: {}
}
