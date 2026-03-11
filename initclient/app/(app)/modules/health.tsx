import { useEffect } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator } from 'react-native';
import {
  useHealthStore,
  ALL_HEALTH_PERMISSIONS,
} from '@/features/modules/health/useHealthStore';
import { BodyTemperature } from '@/features/modules/health/components/BodyTemperature';

export default function HealthScreen() {
  const hasInitialized = useHealthStore((s) => s.hasInitialized);
  const grantedPermissions = useHealthStore((s) => s.grantedPermissions);
  const initialize = useHealthStore((s) => s.initialize);
  const requestPermissions = useHealthStore((s) => s.requestPermissions);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (Platform.OS === 'web') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-icon">
          Health data is not supported on the web.
        </Text>
      </View>
    );
  }

  if (!hasInitialized) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#63ADF2" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background px-4 pt-4">
      {grantedPermissions.length > 0 ? (
        <BodyTemperature />
      ) : (
        <Pressable
          onPress={() => requestPermissions(ALL_HEALTH_PERMISSIONS)}
          className="bg-btn-primary rounded-lg px-4 py-3 self-center">
          <Text className="text-white text-sm font-semibold">
            Request All Permissions
          </Text>
        </Pressable>
      )}
    </View>
  );
}
