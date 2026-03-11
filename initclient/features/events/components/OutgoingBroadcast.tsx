import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventContent } from 'thredlib';
import { turnValueToText } from '@/lib/utils';

interface Props {
  content: EventContent;
}

export function OutgoingBroadcast({ content }: Props) {
  if (Array.isArray(content.values)) return null;
  const values = content.values as Record<string, any>;

  return (
    <View className="flex-row gap-3 mb-4 mx-4 justify-end items-center">
      <View className="bg-btn-tertiary rounded-lg p-3 max-w-[75%]">
        <Text className="text-sm text-white">
          {turnValueToText(values?.message)}
        </Text>
      </View>
      <Ionicons name="person-circle" size={36} color="#63ADF2" />
    </View>
  );
}
