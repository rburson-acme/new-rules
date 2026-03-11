import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { ThredFeed } from '@/features/threds/components/ThredFeed';
import { BroadcastInput } from '@/features/threds/components/BroadcastInput';

export default function ThredDetailScreen() {
  const { thredId } = useLocalSearchParams<{ thredId: string }>();
  if (!thredId) return null;

  return (
    <View className="flex-1 bg-background">
      <ThredFeed thredId={thredId} />
      <BroadcastInput thredId={thredId} />
    </View>
  );
}
