import { useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

interface Props {
  name: string;
  numeric?: boolean;
  onSubmit: (name: string, value: string) => void;
}

export function TextInputField({ name, numeric, onSubmit }: Props) {
  const [text, setText] = useState('');

  const handleChange = (value: string) => {
    setText(numeric ? value.replace(/[^0-9]/g, '') : value);
  };

  return (
    <View className="gap-2">
      <TextInput
        className="border border-border rounded-lg px-3 py-2 text-sm text-text bg-white"
        multiline
        inputMode={numeric ? 'numeric' : undefined}
        onChangeText={handleChange}
        value={text}
        placeholder={numeric ? 'Enter a number...' : 'Type here...'}
        placeholderTextColor="#A0A0A0"
      />
      <Pressable
        onPress={() => text && onSubmit(name, text)}
        className="bg-btn-primary rounded-lg px-4 py-2 self-end">
        <Text className="text-white text-sm font-semibold">Send</Text>
      </Pressable>
    </View>
  );
}
