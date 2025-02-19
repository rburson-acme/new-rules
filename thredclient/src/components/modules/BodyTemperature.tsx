import { Button } from '@/src/components/common/Button';
import { HealthModuleStore } from '@/src/stores/HealthModuleStore';
import { Text, View } from 'react-native';
import { ReadRecordsResult } from 'react-native-health-connect';
import { MediumText } from '../common/MediumText';
import { RegularText } from '../common/RegularText';

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
        <MediumText>Body Temperature: </MediumText>
        <View style={{ alignItems: 'flex-end' }}>
          {bodyTemperatureData?.records.length === 0 && <RegularText>No data to display</RegularText>}
          {bodyTemperatureData?.records.map((data, index) => {
            return <RegularText key={index}>{data.temperature.inFahrenheit}°F</RegularText>;
          })}
        </View>
      </View>
    );
  } else {
    return (
      <View>
        <RegularText>Body Temp Permission not granted. Press below to give permission.</RegularText>;
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
