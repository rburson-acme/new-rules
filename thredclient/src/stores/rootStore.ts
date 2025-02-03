import { AuthStore } from './AuthStore';
import { ThredsStore } from './ThredsStore';
import { ApplicationStore } from './ApplicationStore';
import { HealthModuleStore } from './HealthModuleStore';
import { GeoModuleStore } from './GeoModuleStore';
import { ConnectionStore } from './ConnectionStore';
import { AdminThredsStore } from './AdminThredsStore';

export class RootStore {
  private static instance: RootStore;

  readonly authStore: AuthStore = new AuthStore();
  readonly applicationStore: ApplicationStore = new ApplicationStore();
  readonly connectionStore: ConnectionStore = new ConnectionStore(this);
  readonly thredsStore: ThredsStore = new ThredsStore(this);
  readonly adminThredsStore: AdminThredsStore = new AdminThredsStore(this);
  readonly healthModuleStore: HealthModuleStore = new HealthModuleStore();
  readonly geoModuleStore: GeoModuleStore = new GeoModuleStore();

  static get() {
    if (!this.instance) this.instance = new RootStore();
    return this.instance;
  }
}

// TODO
// make static get method for rootStore
