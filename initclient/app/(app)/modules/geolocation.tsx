import { View } from 'react-native';
import { GeoView } from '@/features/modules/geo/components/GeoView';

export default function GeolocationScreen() {
  return (
    <View className="flex-1 bg-background">
      <GeoView />
    </View>
  );
}
