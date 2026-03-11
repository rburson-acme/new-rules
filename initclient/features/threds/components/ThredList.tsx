import { View, Text, TextInput, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useThredsStore, ThredTab } from '../useThredsStore';
import { useThredsQuery, ThredWithLastEvent } from '../queries';
import { ThredCard } from './ThredCard';

const TABS: { key: ThredTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
  { key: 'archived', label: 'Archived' },
];

export function ThredList() {
  const activeTab = useThredsStore((s) => s.activeTab);
  const searchQuery = useThredsStore((s) => s.searchQuery);
  const setActiveTab = useThredsStore((s) => s.setActiveTab);
  const setSearchQuery = useThredsStore((s) => s.setSearchQuery);

  const { data, isLoading, error, refetch } = useThredsQuery(activeTab);

  const filtered = data?.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = item.lastEvent?.event?.data?.title?.toLowerCase() ?? '';
    return title.includes(q);
  });

  return (
    <View className="flex-1 bg-background">
      {/* Tabs */}
      <View className="flex-row border-b border-light-grey">
        {TABS.map((tab) => (
          <Text
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 text-center py-3 text-sm font-semibold ${
              activeTab === tab.key
                ? 'text-btn-primary border-b-2 border-btn-primary'
                : 'text-icon'
            }`}>
            {tab.label}
          </Text>
        ))}
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <TextInput
          className="border border-border rounded-lg px-3 py-2 text-sm text-text"
          placeholder="Search threds..."
          placeholderTextColor="#A0A0A0"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#63ADF2" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-sm text-red-500 text-center">
            Failed to load threds
          </Text>
          <Text
            onPress={() => refetch()}
            className="text-sm text-btn-primary mt-2">
            Tap to retry
          </Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          renderItem={({ item }) => <ThredCard item={item} />}
          estimatedItemSize={72}
          keyExtractor={(item) => item.thred.id}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-12">
              <Text className="text-sm text-icon">No threds found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
