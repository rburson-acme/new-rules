import { View, Text, Pressable } from 'react-native';
import {
  useHealthStore,
  ALL_HEALTH_PERMISSIONS,
} from '../useHealthStore';

export function BodyTemperature() {
  const isGranted = useHealthStore((s) =>
    s.isPermissionGranted('BodyTemperature'),
  );
  const permissionData = useHealthStore((s) => s.permissionData);
  const requestPermissions = useHealthStore((s) => s.requestPermissions);

  const data = permissionData['BodyTemperature'];

  if (isGranted) {
    return (
      <View className="flex-row gap-2 justify-center">
        <Text className="text-sm font-semibold text-primary">
          Body Temperature:
        </Text>
        <View className="items-end">
          {!data?.records?.length ? (
            <Text className="text-sm text-icon">No data to display</Text>
          ) : (
            data.records.map((record: any, i: number) => (
              <Text key={i} className="text-sm text-text">
                {record.temperature.inFahrenheit}°F
              </Text>
            ))
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="gap-2">
      <Text className="text-sm text-icon">
        Body Temp permission not granted. Press below to give permission.
      </Text>
      <Pressable
        onPress={() => requestPermissions(ALL_HEALTH_PERMISSIONS)}
        className="bg-btn-primary rounded-lg px-4 py-2 self-start">
        <Text className="text-white text-sm font-semibold">
          Request Body Temp Permission
        </Text>
      </Pressable>
    </View>
  );
}
