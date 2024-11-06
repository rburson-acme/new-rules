import { observable, action, makeObservable } from 'mobx';
import { RootStore } from './rootStore';

export class AuthStore {
  userId?: string = undefined;
  name?: string = undefined;
  role?: 'admin' | 'user' = undefined; //  This is temporary to determine which flow to use

  constructor(readonly rootStore: RootStore) {
    makeObservable(this, {
      userId: observable,
      role: observable,
      name: observable,
      setUserId: action,
      setName: action,
      setRole: action,
      logOut: action,
    });
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  setName(name: string) {
    this.name = name;
  }
  setRole(role: 'admin' | 'user') {
    this.role = role;
  }

  logOut() {
    this.userId = undefined;
    this.name = undefined;
    this.role = undefined;
  }
}
