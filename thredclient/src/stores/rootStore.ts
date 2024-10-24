import { AuthStore } from './AuthStore';
import { ThredsStore } from './ThredsStore';
import { ApplicationStore } from './ApplicationStore';
import { RouteStore } from './RouteStore';

export class RootStore {
  readonly authStore: AuthStore = new AuthStore(this);
  readonly applicationStore: ApplicationStore = new ApplicationStore(this);
  readonly routeStore: RouteStore = new RouteStore();
  readonly thredsStore: ThredsStore = new ThredsStore(this);
}

const rootStore = new RootStore();
export default rootStore;
