import { Persistent } from "./Persistent.js";
export interface User extends Persistent {
    id: string;
    password?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    prefix?: string;
    suffix?: string;
    profile?: {
        iconURI?: string;
    };
    threds?: {
        archived: string[];
    };
}
