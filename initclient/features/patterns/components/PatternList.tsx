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
import {
  usePatternsQuery,
  useSavePatternMutation,
  useDeletePatternMutation,
} from '../queries';
import type { PatternModel } from 'thredlib';

function PatternCard({
  pattern,
  onDelete,
}: {
  pattern: PatternModel;
  onDelete: () => void;
}) {
  return (
    <Pressable
      onPress={() =>
        router.push(`/admin/pattern-manager/${pattern.id}` as any)
      }
      className="flex-row items-center gap-3 px-4 py-3 border border-border rounded-lg bg-background-secondary">
      <Ionicons name="document-text-outline" size={24} color="#545E75" />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-primary">
          {pattern.name}
        </Text>
        <Text className="text-xs text-icon">
          {pattern.reactions?.length ?? 0} reaction(s)
        </Text>
      </View>
      <Pressable onPress={onDelete} className="p-2">
        <Ionicons name="trash-outline" size={20} color="#E53E3E" />
      </Pressable>
    </Pressable>
  );
}

export function PatternList() {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const { data, isLoading, error } = usePatternsQuery();
  const savePattern = useSavePatternMutation();
  const deletePattern = useDeletePatternMutation();

  const filtered = data?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const id = await savePattern.mutateAsync({
      name: newName.trim(),
      reactions: [],
    });
    setNewName('');
    setShowAdd(false);
    router.push(`/admin/pattern-manager/${id}` as any);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Search */}
      <View className="px-4 pt-4">
        <TextInput
          className="border border-border rounded-lg px-3 py-2 text-sm text-text"
          placeholder="Search patterns..."
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
          <Text className="text-sm text-red-500">
            Failed to load patterns
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id ?? item.name}
          renderItem={({ item }) => (
            <PatternCard
              pattern={item}
              onDelete={() => item.id && deletePattern.mutate(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          ListEmptyComponent={
            <Text className="text-sm text-icon text-center py-8">
              No patterns found
            </Text>
          }
        />
      )}

      {/* Add Pattern */}
      <View className="px-4 pb-4">
        {!showAdd ? (
          <Pressable
            onPress={() => setShowAdd(true)}
            className="flex-row items-center gap-2">
            <Ionicons name="add-circle-outline" size={24} color="#545E75" />
            <Text className="text-sm font-semibold text-primary">
              Add New Pattern
            </Text>
          </Pressable>
        ) : (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-primary">
              New Pattern Name
            </Text>
            <TextInput
              className="border border-border rounded-lg px-3 py-2 text-sm text-text"
              value={newName}
              onChangeText={setNewName}
              placeholder="Pattern name"
              placeholderTextColor="#A0A0A0"
            />
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleCreate}
                className="bg-btn-primary rounded-lg px-4 py-2">
                <Text className="text-white text-sm font-semibold">
                  Create
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAdd(false);
                  setNewName('');
                }}
                className="bg-background-secondary rounded-lg px-4 py-2 border border-border">
                <Text className="text-sm text-primary">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
