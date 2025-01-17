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
  ModuleList: {};
  Modules: { name: ModuleNames };
};

export type DevtoolStackParamList = {
  DevtoolList: {};
  Devtools: { name: DevtoolNames };
};
