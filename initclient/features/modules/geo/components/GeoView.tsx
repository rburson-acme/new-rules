import { useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useGeoStore } from '../useGeoStore';

export function GeoView() {
  const hasInitialized = useGeoStore((s) => s.hasInitialized);
  const location = useGeoStore((s) => s.location);
  const errorMessage = useGeoStore((s) => s.errorMessage);
  const canAskAgain = useGeoStore((s) => s.canAskAgain);
  const initialize = useGeoStore((s) => s.initialize);
  const turnOnLocation = useGeoStore((s) => s.turnOnLocation);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!hasInitialized) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#63ADF2" />
      </View>
    );
  }

  if (location) {
    return (
      <View className="px-4 pt-4 gap-2">
        <Text className="text-sm font-semibold text-primary">
          Current Location
        </Text>
        <Text className="text-sm text-text">
          Latitude: {location.coords.latitude}
        </Text>
        <Text className="text-sm text-text">
          Longitude: {location.coords.longitude}
        </Text>
        {location.coords.altitude != null && (
          <Text className="text-sm text-text">
            Altitude: {location.coords.altitude}m
          </Text>
        )}
      </View>
    );
  }

  return (
    <View className="px-4 pt-4 gap-3">
      {errorMessage && (
        <Text className="text-sm text-icon text-center">{errorMessage}</Text>
      )}
      {canAskAgain && (
        <Pressable
          onPress={turnOnLocation}
          className="bg-btn-primary rounded-lg px-4 py-2 self-center">
          <Text className="text-white text-sm font-semibold">
            Request Location Permission
          </Text>
        </Pressable>
      )}
    </View>
  );
}
