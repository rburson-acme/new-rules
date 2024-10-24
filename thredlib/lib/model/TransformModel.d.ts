import { EventData } from "../core/Event.js";
export interface TransformModel {
    readonly description?: string;
    readonly eventDataTemplate?: EventData;
    readonly templateXpr?: string;
}
