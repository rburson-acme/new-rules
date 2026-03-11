import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EventContent } from 'thredlib';
import { turnValueToText } from '@/lib/utils';
import { formatDateAndTime } from '@/lib/utils';

interface Props {
  content: EventContent;
  time?: number;
}

export function IncomingBroadcast({ content, time }: Props) {
  if (Array.isArray(content.values)) return null;
  const values = content.values as Record<string, any>;

  return (
    <View className="flex-row gap-3 mb-4 mx-4">
      <View className="items-center">
        <Ionicons name="person-circle-outline" size={36} color="#545E75" />
        {time ? (
          <Text className="text-[10px] text-icon">
            {formatDateAndTime(time)}
          </Text>
        ) : null}
      </View>
      <View className="flex-1">
        <BroadcastContent values={values} valuesType={content.valuesType} />
      </View>
    </View>
  );
}

function BroadcastContent({
  values,
  valuesType,
}: {
  values: Record<string, any>;
  valuesType?: string;
}) {
  if (valuesType === 'broadcastMessage') {
    return (
      <>
        <Text className="text-[10px] text-border">
          {values.messageSource?.id}
        </Text>
        <View className="bg-background-secondary rounded-lg p-3 mt-1">
          <Text className="text-sm text-text">
            {turnValueToText(values.message)}
          </Text>
        </View>
      </>
    );
  }

  if (valuesType === 'broadcastValues') {
    const { messageSource, re, ...rest } = values;
    return (
      <>
        <Text className="text-[10px] text-border">{messageSource?.id}</Text>
        {Object.entries(rest).map(([key, value]) => (
          <View
            key={key}
            className="bg-background-secondary rounded-lg p-3 mt-1">
            <Text className="text-sm text-text">{turnValueToText(value)}</Text>
          </View>
        ))}
      </>
    );
  }

  return null;
}
