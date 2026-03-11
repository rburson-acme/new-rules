import { View, Text, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useThredEventsQuery } from '../queries';
import { EventItem } from '@/features/events/components/EventItem';

interface ThredFeedProps {
  thredId: string;
}

export function ThredFeed({ thredId }: ThredFeedProps) {
  const { data, isLoading, error } = useThredEventsQuery(thredId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#63ADF2" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-red-500">Failed to load events</Text>
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <EventItem event={item.event} />}
      estimatedItemSize={80}
      keyExtractor={(item) => item.event.id}
      inverted
      contentContainerStyle={{ paddingVertical: 8 }}
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-12">
          <Text className="text-sm text-icon">No events yet</Text>
        </View>
      }
    />
  );
}
