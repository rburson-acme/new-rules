import { useState } from 'react';
import { View, Pressable, Text, ScrollView } from 'react-native';

interface SetItem {
  display: string;
  value: string;
}

interface Props {
  name: string;
  set: SetItem[];
  multiple?: boolean;
  onSubmit: (name: string, value: string | string[]) => void;
}

export function NominalInputField({ name, set, multiple, onSubmit }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  if (!multiple) {
    return (
      <View className="gap-2">
        {set.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => onSubmit(name, item.value)}
            className="bg-background-secondary rounded-lg px-4 py-3 border border-border">
            <Text className="text-sm text-text">{item.display}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  const toggleItem = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };

  return (
    <View className="gap-2">
      <ScrollView>
        {set.map((item) => {
          const isSelected = selected.includes(item.value);
          return (
            <Pressable
              key={item.value}
              onPress={() => toggleItem(item.value)}
              className={`rounded-lg px-4 py-3 mb-1 border ${
                isSelected
                  ? 'bg-btn-primary border-btn-primary'
                  : 'bg-background-secondary border-border'
              }`}>
              <Text
                className={`text-sm ${isSelected ? 'text-white' : 'text-text'}`}>
                {item.display}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        onPress={() => selected.length > 0 && onSubmit(name, selected)}
        className="bg-btn-primary rounded-lg px-4 py-2 self-end">
        <Text className="text-white text-sm font-semibold">Send</Text>
      </Pressable>
    </View>
  );
}
