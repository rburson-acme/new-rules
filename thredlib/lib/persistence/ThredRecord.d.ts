import { Persistent, Thred } from '../index.js';
export interface ThredRecord extends Persistent {
    id: string;
    thred: Thred;
}
