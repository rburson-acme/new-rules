import { action, makeObservable, observable, runInAction } from 'mobx';
import {
  getGrantedPermissions,
  initialize,
  Permission,
  readRecords,
  ReadRecordsOptions,
  ReadRecordsResult,
  RecordType,
  requestPermission,
} from 'react-native-health-connect';

export const ALL_HEALTH_PERMISSIONS: Permission[] = [{ accessType: 'read', recordType: 'BodyTemperature' }];

export class HealthModuleStore {
  isModuleActive: boolean = false;
  grantedPermissions: Permission[] = [];
  hasInitialized: boolean = false;
  permissionData: Record<RecordType, ReadRecordsResult<RecordType>> | {} = {};
  constructor() {
    makeObservable(this, {
      isModuleActive: observable,
      permissionData: observable,
      grantedPermissions: observable,
      initialize: action,
      requestPermission: action,
      getRecords: action,
      hasInitialized: observable,
    });
  }

  async requestPermission(permissions: Permission[]) {
    // NEEDED PERMISSIONS MUST ALSO BE DECLARED IN APP.JSON, ALL_HEALTH_PERMISSIONS VARIABLE, AND ANDROIDMANIFEST.XML
    // AFTER ADDING PERMISSIONS TO APP.JSON, YOU MUST RUN npx expo prebuild --platform android

    await requestPermission(permissions);
    const grantedPermissions = await getGrantedPermissions();

    this.fetchRecordsForGrantedPermissions(grantedPermissions);
    runInAction(() => {
      this.grantedPermissions = grantedPermissions;
    });
  }

  isPermissionGranted(recordType: RecordType) {
    return this.grantedPermissions.some(permission => permission.recordType === recordType);
  }

  async getRecords(record: RecordType, options: ReadRecordsOptions) {
    await readRecords(record, options);
    const permissionData = await readRecords(record, options);
    runInAction(() => {
      this.permissionData = { ...this.permissionData, [record]: permissionData };
    });
    return permissionData;
  }

  private async fetchRecordsForGrantedPermissions(grantedPermissions: Permission[]) {
    grantedPermissions.forEach(async permission => {
      await this.getRecords(permission.recordType, {
        timeRangeFilter: {
          operator: 'between',
          startTime: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
          endTime: new Date().toISOString(),
        },
      });
    });
  }

  //TODO: Figure this one out...
  async initialize() {
    const isModuleActive = await initialize();
    runInAction(() => {
      this.isModuleActive = isModuleActive;
    });
    const grantedPermissions = await getGrantedPermissions();
    runInAction(() => {
      this.grantedPermissions = grantedPermissions;
    });

    await this.fetchRecordsForGrantedPermissions(grantedPermissions);
    runInAction(() => {
      this.hasInitialized = true;
    });
  }
}
