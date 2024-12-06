import { Button } from '@/src/components/Button';
import { HealthModuleStore } from '@/src/stores/HealthModuleStore';
import { Text, View } from 'react-native';
import { ReadRecordsResult } from 'react-native-health-connect';

type BodyTemperatureProps = {
  bodyTemperatureData: ReadRecordsResult<'BodyTemperature'> | undefined;
  permissionGranted: boolean;
  healthModuleStore: HealthModuleStore;
};
export const BodyTemperature = ({
  bodyTemperatureData,
  permissionGranted,
  healthModuleStore,
}: BodyTemperatureProps) => {
  if (permissionGranted) {
    return (
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
        <Text>Body Temperature: </Text>
        <View style={{ alignItems: 'flex-end' }}>
          {bodyTemperatureData?.records.length === 0 && <Text>No data to display</Text>}
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
