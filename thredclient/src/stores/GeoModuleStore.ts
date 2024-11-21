import {
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  LocationObject,
  requestForegroundPermissionsAsync,
} from 'expo-location';
import { action, makeObservable, observable, runInAction } from 'mobx';

const LOCATION_ERROR =
  'Permission to access location was denied. Please enable location services within your device settings.';
export class GeoModuleStore {
  location: null | LocationObject = null;
  errorMessage: string | null = null;
  hasInitialized: boolean = false;
  canAskAgain: boolean = false;

  constructor() {
    makeObservable(this, {
      location: observable,
      turnOnLocation: action,
      setLocation: action,
      errorMessage: observable,
      hasInitialized: observable,
      initialize: action,
      canAskAgain: observable,
    });
  }

  setLocation = async () => {
    const location = await getCurrentPositionAsync({});
    runInAction(() => {
      this.location = location;
    });
  };

  turnOnLocation = async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      runInAction(() => {
        this.errorMessage = LOCATION_ERROR;
        this.canAskAgain = false;
      });
      return;
    }
    await this.setLocation();
  };

  initialize = async () => {
    const enableData = await getForegroundPermissionsAsync();
    const isEnabled = enableData.granted;
    if (enableData.canAskAgain === true) {
      runInAction(() => {
        this.canAskAgain = true;
      });
    } else {
      runInAction(() => {
        this.errorMessage = LOCATION_ERROR;
      });
    }
    if (isEnabled) {
      await this.setLocation();
    }

    runInAction(() => {
      this.hasInitialized = true;
    });
  };
}
