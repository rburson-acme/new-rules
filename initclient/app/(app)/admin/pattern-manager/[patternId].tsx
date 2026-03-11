import { useLocalSearchParams } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { usePatternsQuery } from '@/features/patterns/queries';
import { PatternDetail } from '@/features/patterns/components/PatternDetail';

export default function PatternDetailScreen() {
  const { patternId } = useLocalSearchParams<{ patternId: string }>();
  const { data, isLoading } = usePatternsQuery();
  const pattern = data?.find((p) => p.id === patternId);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#63ADF2" />
      </View>
    );
  }

  if (!pattern) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-sm text-icon">Pattern not found</Text>
      </View>
    );
  }

  return <PatternDetail pattern={pattern} />;
}
