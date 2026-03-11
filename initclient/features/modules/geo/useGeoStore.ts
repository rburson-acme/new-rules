import { create } from 'zustand';
import {
  getCurrentPositionAsync,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  LocationObject,
} from 'expo-location';

const LOCATION_ERROR =
  'Permission to access location was denied. Please enable location services within your device settings.';

interface GeoState {
  location: LocationObject | null;
  errorMessage: string | null;
  hasInitialized: boolean;
  canAskAgain: boolean;
  initialize: () => Promise<void>;
  turnOnLocation: () => Promise<void>;
}

export const useGeoStore = create<GeoState>((set) => ({
  location: null,
  errorMessage: null,
  hasInitialized: false,
  canAskAgain: false,

  initialize: async () => {
    const result = await getForegroundPermissionsAsync();
    if (result.canAskAgain) {
      set({ canAskAgain: true });
    } else if (!result.granted) {
      set({ errorMessage: LOCATION_ERROR });
    }
    if (result.granted) {
      const location = await getCurrentPositionAsync({});
      set({ location });
    }
    set({ hasInitialized: true });
  },

  turnOnLocation: async () => {
    const { status } = await requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      set({ errorMessage: LOCATION_ERROR, canAskAgain: false });
      return;
    }
    const location = await getCurrentPositionAsync({});
    set({ location, errorMessage: null });
  },
}));
