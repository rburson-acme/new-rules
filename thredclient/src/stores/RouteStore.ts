import React from 'react';
import { observable, action, makeObservable } from 'mobx';

export class RouteStore {
  currentRoute: any = undefined;

  constructor() {
    makeObservable(this, {
      currentRoute: observable,
      setCurrentRoute: action,
    });
  }

  setCurrentRoute(route: { component: any; props: any }) {
    this.currentRoute = React.createElement(route.component, route.props);
  }
}
