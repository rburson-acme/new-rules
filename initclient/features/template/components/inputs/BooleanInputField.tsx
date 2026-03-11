import { View, Pressable, Text } from 'react-native';

interface SetItem {
  display: string;
  value: boolean;
}

interface Props {
  name: string;
  set: SetItem[];
  onSubmit: (name: string, value: boolean) => void;
}

export function BooleanInputField({ name, set, onSubmit }: Props) {
  return (
    <View className="flex-row justify-end gap-2">
      {set.map((item) => (
        <Pressable
          key={item.display}
          onPress={() => onSubmit(name, item.value)}
          className="bg-btn-primary rounded-lg px-4 py-2">
          <Text className="text-white text-sm font-semibold">
            {item.display}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
