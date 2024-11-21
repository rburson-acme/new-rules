import { Button } from '@/src/components/Button';
import { ALL_HEALTH_PERMISSIONS, HealthModuleStore } from '@/src/stores/HealthModuleStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ReadRecordsResult } from 'react-native-health-connect';
import { BodyTemperature } from './BodyTemperature';

type HealthModuleProps = {
  healthModuleStore: HealthModuleStore;
};
export const HealthModule = observer(({ healthModuleStore }: HealthModuleProps) => {
  useEffect(() => {
    healthModuleStore.initialize();
  }, []);

  const areTherePermissions = healthModuleStore.grantedPermissions.length > 0;

  if (!healthModuleStore.hasInitialized) {
    return <ActivityIndicator />;
  }
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8 }}>
      {areTherePermissions ? (
        Object.entries(healthModuleStore.permissionData).map(([record, value]) => {
          return (
            <View>
              <BodyTemperature
                bodyTemperatureData={value as ReadRecordsResult<'BodyTemperature'>}
                permissionGranted={healthModuleStore.isPermissionGranted('BodyTemperature')}
                healthModuleStore={healthModuleStore}
              />
              {/* Add more of these components here when we need more permissions */}
            </View>
          );
        })
      ) : (
        <Button
          content={'Request All Permissions'}
          onPress={async () => {
            await healthModuleStore.requestPermission(ALL_HEALTH_PERMISSIONS);
          }}
        />
      )}
    </View>
  );
});
