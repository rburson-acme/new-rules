import { AuthStore } from './AuthStore';
import { ThredsStore } from './ThredsStore';
import { ApplicationStore } from './ApplicationStore';
import { HealthModuleStore } from './HealthModuleStore';
import { GeoModuleStore } from './GeoModuleStore';
import { ConnectionStore } from './ConnectionStore';
import { AdminThredsStore } from './AdminThredsStore';
import { PatternsStore } from './PatternsStore';
import { ThemeStore } from './ThemeStore';

export class RootStore {
  private static instance: RootStore;

  readonly authStore: AuthStore = new AuthStore();
  readonly applicationStore: ApplicationStore = new ApplicationStore();
  readonly connectionStore: ConnectionStore = new ConnectionStore(this);
  readonly themeStore: ThemeStore = new ThemeStore(this);
  readonly thredsStore: ThredsStore = new ThredsStore(this);
  readonly adminThredsStore: AdminThredsStore = new AdminThredsStore(this);
  readonly healthModuleStore: HealthModuleStore = new HealthModuleStore();
  readonly geoModuleStore: GeoModuleStore = new GeoModuleStore();
  readonly patternsStore: PatternsStore = new PatternsStore(this);

  static get() {
    if (!this.instance) this.instance = new RootStore();
    return this.instance;
  }
}
