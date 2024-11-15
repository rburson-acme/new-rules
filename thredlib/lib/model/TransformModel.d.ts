import { EventData } from "../core/Event.js";
export interface TransformModel {
    readonly meta?: {
        reXpr?: string;
    };
    readonly description?: string;
    readonly eventDataTemplate?: EventData;
    readonly templateXpr?: string;
}
