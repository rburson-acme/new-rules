import { View, Text, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { formatDateAndTime } from '@/lib/utils';
import type { ThredWithLastEvent } from '../queries';

const DEFAULT_ICON = 'https://www.svgrepo.com/show/489126/sensor.svg';

interface ThredCardProps {
  item: ThredWithLastEvent;
}

export function ThredCard({ item }: ThredCardProps) {
  const { thred, lastEvent } = item;
  const event = lastEvent?.event;
  const icon = event?.data?.display?.uri ?? DEFAULT_ICON;
  const title = event?.data?.title ?? 'Untitled';
  const description = event?.data?.description;
  const displayText = title + (description ? ' -- ' + description : '');
  const time = event?.time;

  return (
    <Link href={`/(app)/(threds)/${thred.id}` as any} asChild>
      <Pressable className="flex-row items-center gap-3 px-4 py-3 border-b border-light-grey">
        <Image
          source={{ uri: icon }}
          style={{ width: 36, height: 36 }}
          contentFit="contain"
        />
        <View className="flex-1">
          <Text className="text-xs text-icon">
            {time ? formatDateAndTime(time) : ''}
          </Text>
          <Text className="text-sm text-text mt-0.5" numberOfLines={2}>
            {displayText}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
