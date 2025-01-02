import { DevtoolNames, ModuleNames } from './RouteList';

export type AdminDrawerParamList = {
  Home: {};
  Modules: {};
  Devtools: {};
};

export type MessengerDrawerParamList = {
  Home: {};
  Modules: {};
  Devtools: {};
};
export type ModuleStackParamList = {
  ModuleListLayout: {};
  Module: { name: ModuleNames };
};

export type DevtoolStackParamList = {
  DevtoolListLayout: {};
  Devtool: { name: DevtoolNames };
};
