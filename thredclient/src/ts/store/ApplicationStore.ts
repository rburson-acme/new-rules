
import { Event, eventTypes } from 'thredlib';
import { observable, action, computed } from 'mobx';
import { RootStore } from './rootStore';

export class ApplicationStore {

    constructor(readonly rootStore: RootStore) {}

}