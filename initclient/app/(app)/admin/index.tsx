import { View, Text, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

const adminTools = [
  {
    id: 'event-editor',
    name: 'Event Editor',
    description: 'Compose and publish raw events to the server.',
    icon: 'code-slash-outline' as const,
    route: '/admin/event-editor' as const,
  },
  {
    id: 'thred-manager',
    name: 'Thred Manager',
    description: 'View, monitor, and terminate threds.',
    icon: 'git-branch-outline' as const,
    route: '/admin/thred-manager' as const,
  },
  {
    id: 'pattern-manager',
    name: 'Pattern Manager',
    description: 'Create, edit, and delete patterns.',
    icon: 'layers-outline' as const,
    route: '/admin/pattern-manager' as const,
  },
];

export default function AdminScreen() {
  return (
    <View className="flex-1 bg-background pt-4">
      <FlatList
        data={adminTools}
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
