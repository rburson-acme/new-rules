import { AuthStore } from './AuthStore';
import { ThredsStore } from './ThredsStore';
import { ApplicationStore } from './ApplicationStore';
import { HealthModuleStore } from './HealthModuleStore';
import { GeoModuleStore } from './GeoModuleStore';

export class RootStore {
  readonly authStore: AuthStore = new AuthStore(this);
  readonly applicationStore: ApplicationStore = new ApplicationStore(this);
  readonly thredsStore: ThredsStore = new ThredsStore(this);
  readonly healthModuleStore: HealthModuleStore = new HealthModuleStore();
  readonly geoModuleStore: GeoModuleStore = new GeoModuleStore();
}

const rootStore = new RootStore();
export default rootStore;
