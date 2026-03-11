import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Thred, ThredStatus } from 'thredlib';
import { useAllThredsQuery, useTerminateAllThredsMutation } from '../queries';
import { formatDateAndTime } from '@/lib/utils';

type AdminTab = 'active' | 'inactive' | 'all';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'all', label: 'All' },
];

function AdminThredCard({ thred }: { thred: Thred }) {
  return (
    <Pressable
      onPress={() => router.push(`/admin/thred-manager/${thred.id}` as any)}
      className="flex-row items-center gap-3 px-4 py-3 border border-border rounded-lg bg-background-secondary">
      <Ionicons name="git-branch-outline" size={24} color="#545E75" />
      <View className="flex-1">
        <View className="flex-row justify-between">
          <Text className="text-xs text-icon">
            {formatDateAndTime(thred.startTime)}
          </Text>
          {thred.endTime ? (
            <Text className="text-xs text-icon">
              {formatDateAndTime(thred.endTime)}
            </Text>
          ) : null}
        </View>
        <Text className="text-sm font-semibold text-primary">
          {thred.patternName}
        </Text>
        {thred.meta?.label ? (
          <Text className="text-xs text-icon">{thred.meta.label}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function AdminThredList() {
  const [tab, setTab] = useState<AdminTab>('active');
  const [search, setSearch] = useState('');
  const { data, isLoading, error, refetch } = useAllThredsQuery();
  const terminateAll = useTerminateAllThredsMutation();

  const filtered = data
    ?.filter((thred) => {
      if (tab === 'active') return thred.status === ThredStatus.ACTIVE;
      if (tab === 'inactive') return thred.status === ThredStatus.TERMINATED;
      return true;
    })
    .filter((thred) => {
      if (!search) return true;
      return thred.meta?.label?.toLowerCase().includes(search.toLowerCase());
    });

  return (
    <View className="flex-1 bg-background">
      {/* Tabs */}
      <View className="flex-row border-b border-light-grey">
        {TABS.map((t) => (
          <Text
            key={t.key}
            onPress={() => setTab(t.key)}
            className={`flex-1 text-center py-3 text-sm font-semibold ${
              tab === t.key
                ? 'text-btn-primary border-b-2 border-btn-primary'
                : 'text-icon'
            }`}>
            {t.label}
          </Text>
        ))}
      </View>

      {/* Search */}
      <View className="px-4 py-2">
        <TextInput
          className="border border-border rounded-lg px-3 py-2 text-sm text-text"
          placeholder="Search threds..."
          placeholderTextColor="#A0A0A0"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#63ADF2" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-red-500">Failed to load threds</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AdminThredCard thred={item} />}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={
            <Text className="text-sm text-icon text-center py-8">
              No threds found
            </Text>
          }
        />
      )}

      {/* Actions */}
      <View className="flex-row justify-center gap-3 p-4 border-t border-light-grey">
        <Pressable
          onPress={() => terminateAll.mutate()}
          className="bg-red-500 rounded-lg px-4 py-2">
          <Text className="text-white text-sm font-semibold">
            Terminate All
          </Text>
        </Pressable>
        <Pressable
          onPress={() => refetch()}
          className="bg-btn-primary rounded-lg px-4 py-2">
          <Text className="text-white text-sm font-semibold">Reload</Text>
        </Pressable>
      </View>
    </View>
  );
}
