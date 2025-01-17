import { observable, action, makeObservable } from "mobx";
import { RootStore } from './rootStore';

export class AuthStore {
    userId?: string;
    name?: string;

    constructor(readonly rootStore: RootStore) {
        makeObservable(this, {
            userId: observable,
            name: observable,
            setUserId: action,
            setName: action
        });
    }

    setUserId(userId: string) {
        this.userId = userId;
    }

    setName(name: string) {
        this.name = name;
    }
}