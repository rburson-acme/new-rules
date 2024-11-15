import { Button } from '@/src/components/Button';
import { ALL_HEALTH_PERMISSIONS, HealthModuleStore } from '@/src/stores/HealthModuleStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { ReadRecordsResult, RecordType } from 'react-native-health-connect';

type HealthModuleProps = {
  healthModuleStore: HealthModuleStore;
};
export const HealthModule = observer(({ healthModuleStore }: HealthModuleProps) => {
  useEffect(() => {
    healthModuleStore.initialize();
  }, []);

  const areTherePermissions = healthModuleStore.grantedPermissions.length > 0;

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

type BodyTemperatureProps = {
  bodyTemperatureData: ReadRecordsResult<'BodyTemperature'> | undefined;
  permissionGranted: boolean;
  healthModuleStore: HealthModuleStore;
};
const BodyTemperature = ({ bodyTemperatureData, permissionGranted, healthModuleStore }: BodyTemperatureProps) => {
  if (permissionGranted) {
    return (
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <Text>Body Temperature: </Text>
        <View style={{ alignItems: 'flex-end' }}>
          {bodyTemperatureData?.records.map((data, index) => {
            return <Text key={index}>{data.temperature.inFahrenheit}°F</Text>;
          })}
        </View>
      </View>
    );
  } else {
    return (
      <View>
        <Text>Body Temp Permission not granted. Press below to give permission.</Text>;
        <Button
          content={'Request Body Temp Permission'}
          onPress={async () => {
            await healthModuleStore.requestPermission([{ accessType: 'read', recordType: 'BodyTemperature' }]);
          }}
        />
      </View>
    );
  }
};
