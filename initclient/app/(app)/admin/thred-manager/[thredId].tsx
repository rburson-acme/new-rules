import { useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useAllThredsQuery } from '@/features/admin/queries';
import { formatDateAndTime } from '@/lib/utils';

export default function AdminThredDetailScreen() {
  const { thredId } = useLocalSearchParams<{ thredId: string }>();
  const { data, isLoading } = useAllThredsQuery();
  const thred = data?.find((t) => t.id === thredId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#63ADF2" />
      </View>
    );
  }

  if (!thred) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-icon">Thred not found</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Text className="text-lg font-semibold text-primary">
        {thred.patternName}
      </Text>
      <Text className="text-xs text-icon">ID: {thred.id}</Text>
      <Text className="text-xs text-icon">
        Status: {thred.status} | Started:{' '}
        {formatDateAndTime(thred.startTime)}
      </Text>
      {thred.endTime ? (
        <Text className="text-xs text-icon">
          Ended: {formatDateAndTime(thred.endTime)}
        </Text>
      ) : null}
      {thred.meta?.label ? (
        <Text className="text-sm text-text mt-2">{thred.meta.label}</Text>
      ) : null}
      {thred.meta?.description ? (
        <Text className="text-sm text-icon">{thred.meta.description}</Text>
      ) : null}
    </ScrollView>
  );
}
