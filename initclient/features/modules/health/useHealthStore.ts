import { create } from 'zustand';
import { Platform } from 'react-native';

interface Permission {
  accessType: 'read' | 'write';
  recordType: string;
}

interface HealthState {
  isModuleActive: boolean;
  hasInitialized: boolean;
  grantedPermissions: Permission[];
  permissionData: Record<string, any>;
  initialize: () => Promise<void>;
  requestPermissions: (permissions: Permission[]) => Promise<void>;
  isPermissionGranted: (recordType: string) => boolean;
}

export const ALL_HEALTH_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'BodyTemperature' },
];

export const useHealthStore = create<HealthState>((set, get) => ({
  isModuleActive: false,
  hasInitialized: false,
  grantedPermissions: [],
  permissionData: {},

  initialize: async () => {
    if (Platform.OS === 'web') {
      set({ hasInitialized: true });
      return;
    }
    try {
      const HC = require('react-native-health-connect');
      const isModuleActive = await HC.initialize();
      const grantedPermissions = await HC.getGrantedPermissions();
      set({ isModuleActive, grantedPermissions });

      // Fetch records for granted permissions
      for (const perm of grantedPermissions) {
        const records = await HC.readRecords(perm.recordType, {
          timeRangeFilter: {
            operator: 'between',
            startTime: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ).toISOString(),
            endTime: new Date().toISOString(),
          },
        });
        set((s) => ({
          permissionData: { ...s.permissionData, [perm.recordType]: records },
        }));
      }
    } catch {
      // Health Connect not available
    }
    set({ hasInitialized: true });
  },

  requestPermissions: async (permissions) => {
    if (Platform.OS === 'web') return;
    try {
      const HC = require('react-native-health-connect');
      await HC.requestPermission(permissions);
      const grantedPermissions = await HC.getGrantedPermissions();
      set({ grantedPermissions });

      for (const perm of grantedPermissions) {
        const records = await HC.readRecords(perm.recordType, {
          timeRangeFilter: {
            operator: 'between',
            startTime: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ).toISOString(),
            endTime: new Date().toISOString(),
          },
        });
        set((s) => ({
          permissionData: { ...s.permissionData, [perm.recordType]: records },
        }));
      }
    } catch {
      // Health Connect not available
    }
  },

  isPermissionGranted: (recordType) =>
    get().grantedPermissions.some((p) => p.recordType === recordType),
}));
