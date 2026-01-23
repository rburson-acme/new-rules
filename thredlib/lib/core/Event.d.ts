import { TemplateModel } from '../model/TemplateModel.js';
import { Operation } from '../task/Operations.js';
/**
 * @interface Event
 * @description Defines the structure of an event
 */
export interface Event {
    /** unique identifier for the event */
    readonly id: string;
    /** the thred to which the event belongs if already assigned */
    readonly thredId?: string;
    /** the fully qualified event type (this should be a 'class' of event)
     * e.g. 'org.wt.tell' this should not be used for application level designations
     * use content specific types like 'valuesType' for application level context
     */
    readonly type: string;
    /** time of event inception */
    time?: number;
    /** the source of the event */
    readonly source: {
        /** the unique identifier of the source */
        readonly id: string;
        /** A human readable name for the source */
        readonly name?: string;
        /** an optional uri representation of the source */
        readonly uri?: string;
    };
    /** optional reference to another event */
    readonly re?: string;
    /** the data envelope for the event */
    readonly data?: EventData;
}
export interface EventData {
    /** human readable title of the event */
    readonly title?: string;
    /** human readable description of the event */
    readonly description?: string;
    /** an optional representation of the event for display */
    readonly display?: {
        uri: string;
    };
    /** optionally define what is expected in return */
    advice?: {
        /** the type of event that is expected */
        eventType: string;
        /** the suggested title of the expected event */
        title?: string;
        /** an interaction template that describes what data to collect */
        template?: TemplateModel;
    };
    /**
     *  the actual content of the data envelope
     */
    readonly content?: EventContent;
}
export type EventContent = EventValues & EventTasks & Resources & InlineContent & EventError;
/**
 *  Simple interface for transferring free-form json values
 *  Responses or notifications are often in this format
 */
export interface EventValues {
    /** optional application level type of the values. This may be useful to the recipient */
    valuesType?: string;
    /** the actual values being transferred */
    values?: Record<string, any> | Record<string, any>[];
}
/** interface for describing data operations or an RPC
 * target could be a database, an api, or software system
 */
export interface EventTasks {
    /** tasks is an array containing tasks and/or arrays of tasks
     * A nested task array represents tasks to be executed in a single transaction
     */
    readonly tasks?: (EventTask | EventTask[])[];
}
/** specifies the location of one or more resources */
export interface Resources {
    readonly resources?: Resource[];
}
/** allows for embedding content directly in the event */
export interface InlineContent {
    items?: InlineItem[];
}
/** interface for describing an error in an event */
export interface EventError {
    error?: {
        message: string;
        code?: number;
        cause?: any;
    };
}
/** interface for describing an inline item */
export interface InlineItem {
    /** The type of the content */
    readonly contentType: string;
    /** The encoding of the content */
    readonly encoding: string;
    /** The actual content */
    readonly content: string;
}
/**
 * Defines an operation to be performed on an entity (object) or a function call
 */
export interface EventTask {
    /** The type of operation to be performed */
    readonly op: Operation;
    /** The optional name of the task */
    readonly name?: string;
    /** The parameters for the task */
    readonly params?: EventTaskParams;
    /** additional options for the task */
    readonly options?: Record<string, any>;
}
export interface EventTaskParams {
    /** type of target entity or name of the function */
    readonly type: string;
    /** The values to be used in the operation or the function arguments */
    readonly values?: Record<string, any> | any[];
    /** filter for a query */
    readonly matcher?: Record<string, any>;
    /** allows for specifying a subset of the return values */
    readonly selector?: {
        include?: string[];
        exclude?: string[];
    };
    /** allows for sorting, limiting, skipping */
    readonly collector?: EventTaskCollectorParams;
}
/** Allows for sorting, limiting, and skipping results */
export interface EventTaskCollectorParams {
    /** sorting criteria as field name and direction */
    readonly sort?: {
        readonly field: string;
        readonly desc?: boolean;
    }[];
    /** number of results to skip */
    readonly skip?: number;
    /** maximum number of results to return */
    readonly limit?: number;
}
export interface Resource {
    /** mimetype/mediatype of the content field */
    readonly contentType: string;
    /** Where to find the resource */
    readonly uri: string;
}
