import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  error: { message: string; code?: number; cause?: any };
}

export function ErrorEvent({ error }: Props) {
  const message = error.code
    ? `Errored with code ${error.code}: ${error.message}`
    : error.message;

  return (
    <View className="flex-row gap-3 mb-4 mx-4">
      <Ionicons name="alert-circle-outline" size={36} color="#E53E3E" />
      <View className="bg-background-secondary rounded-lg p-3 flex-1">
        <Text className="text-sm text-red-600">{message}</Text>
      </View>
    </View>
  );
}
