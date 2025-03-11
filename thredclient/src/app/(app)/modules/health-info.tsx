import { ALL_HEALTH_PERMISSIONS } from '@/src/stores/HealthModuleStore';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { ReadRecordsResult } from 'react-native-health-connect';
import { Button } from '@/src/components/common/Button';
import { BodyTemperature } from '@/src/components/modules/BodyTemperature';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { Spinner } from '@/src/components/common/Spinner';
import { RegularText } from '@/src/components/common/RegularText';

function HealthModule() {
  const { healthModuleStore } = RootStore.get();
  useEffect(() => {
    if (Platform.OS !== 'web') {
      healthModuleStore.initialize();
    }
  }, []);

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Health Information' });
  }, [navigation]);

  const areTherePermissions = healthModuleStore.grantedPermissions.length > 0;

  if (Platform.OS === 'web') {
    return <RegularText>Health data is not supported on the web.</RegularText>;
  }
  if (!healthModuleStore.hasInitialized) {
    return <Spinner />;
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
}

export default observer(HealthModule);
