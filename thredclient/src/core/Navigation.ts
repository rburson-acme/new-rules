import rootStore from '../stores/rootStore';
import { DevtoolNames, ModuleNames } from './RouteList';

export type AdminDrawerParamList = {
  Home: { rootStore: typeof rootStore };
  Modules: { rootStore: typeof rootStore };
  Devtools: { rootStore: typeof rootStore };
};

export type MessengerDrawerParamList = {
  Home: { rootStore: typeof rootStore };
  Modules: { rootStore: typeof rootStore };
  Devtools: { rootStore: typeof rootStore };
};
export type ModuleStackParamList = {
  ModuleListLayout: { rootStore: typeof rootStore };
  Module: { rootStore: typeof rootStore; name: ModuleNames };
};

export type DevtoolStackParamList = {
  DevtoolListLayout: { rootStore: typeof rootStore };
  Devtool: { rootStore: typeof rootStore; name: DevtoolNames };
};
