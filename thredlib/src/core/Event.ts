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
    // optional referer for the event
    readonly referer?: string;
    // the data envelope for the event
    readonly data?: EventData;
}

export interface EventData {
    // human readable title of the event
    readonly title?: string;
    // human readable description of the event
    readonly description?: string;
    // an optional representation of the event for display
    readonly display?: {
        uri: string,
    }
    // defines what is expected in return
    advice?: {
        // the type of event that is expected
        eventType: string,
        // the title of the event
        title?: string,
        // an interaction template that describes what data to collect
        template?: TemplateModel,
    },
    // the actual content of the data envelope
    // the data related to this type
    readonly content?: EventContent;
}

export type EventContent = EventValues & EventTasks & Resources & InlineContent & EventError;

export interface EventError {
    error?: { 
        code: number,
        message: string,
        cause?: any;
    }
}

// simple interface for transferring known, free-form json values
export interface EventValues {
    values?: Record<string, any> | Record<string, any>[];
}

// interface for describing data operations
// target could be a database, an api, or software system
export interface EventTasks {
    // tasks is an array containing tasks and/or arrays of tasks
    // A task array represents a transaction
    readonly tasks?: (EventTask | EventTask[])[];
}

// specifies the location of one or more resources
export interface Resources {
    readonly resources?: Resource[];
}

// allows for embedding content directly in the event
export interface InlineContent {
   items?: InlineItem[]; 
}

export interface EventTask {
    readonly op: string;
    readonly name?: string;
    readonly params?: EventTaskParams;
}

export interface EventTaskParams {
    // type of target entity
    readonly type: string;
    readonly values?: Record<string, any> | any[];
    readonly matcher?: Record<string, any>; // filter for the query
    readonly selector?: Record<string, any>;  // allows for specifying a subset of the return values
}
export interface Resource {
    // mimetype/mediatype of the content field
    readonly contentType: string;
    readonly uri: string;
}


export interface InlineItem {
    readonly contentType: string;
    readonly encoding: string;
    readonly content: string;
}