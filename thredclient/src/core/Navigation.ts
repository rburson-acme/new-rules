import rootStore from '../stores/rootStore';
import { ModuleNames } from './Modules';

export type AdminDrawerParamList = {
  Home: { rootStore: typeof rootStore };
  Modules: { rootStore: typeof rootStore };
};

export type MessengerDrawerParamList = {
  Home: { rootStore: typeof rootStore };
  Modules: { rootStore: typeof rootStore };
};
export type ModuleStackParamList = {
  ModuleListLayout: { rootStore: typeof rootStore };
  Module: { rootStore: typeof rootStore; name: ModuleNames };
};
