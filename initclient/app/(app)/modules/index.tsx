import { View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const modules = [
  {
    id: 'health',
    name: 'Health Information',
    description:
      'Read health information (body temperature, heartrate, sleep data, etc.) and send data to connected services.',
    icon: 'heart-outline' as const,
    route: '/modules/health' as const,
  },
  {
    id: 'geo',
    name: 'Geolocation',
    description:
      'Determine your geolocation and send data to connected services.',
    icon: 'globe-outline' as const,
    route: '/modules/geolocation' as const,
  },
];

export default function ModulesScreen() {
  return (
    <View className="flex-1 bg-background pt-4">
      <FlatList
        data={modules}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(item.route as any)}
            className="flex-row items-center gap-3 px-4 py-4 border-b border-light-grey">
            <Ionicons name={item.icon} size={28} color="#545E75" />
            <View className="flex-1">
              <Text className="text-sm font-semibold text-primary">
                {item.name}
              </Text>
              <Text className="text-xs text-icon mt-0.5">
                {item.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A0A0A0" />
          </Pressable>
        )}
      />
    </View>
  );
}
