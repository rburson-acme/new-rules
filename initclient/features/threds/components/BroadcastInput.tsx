import { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBroadcastMutation } from '../queries';

interface BroadcastInputProps {
  thredId: string;
}

export function BroadcastInput({ thredId }: BroadcastInputProps) {
  const [text, setText] = useState('');
  const { mutate: broadcast } = useBroadcastMutation(thredId);

  const handleSend = () => {
    if (!text.trim()) return;
    broadcast(text.trim());
    setText('');
  };

  return (
    <View className="flex-row items-center px-4 py-3 border-t border-light-grey bg-background">
      <TextInput
        className="flex-1 border border-border rounded-lg px-3 py-2 text-sm text-text"
        placeholder="Send message to all participants"
        placeholderTextColor="#A0A0A0"
        value={text}
        onChangeText={setText}
        onSubmitEditing={handleSend}
        returnKeyType="send"
      />
      <Pressable
        onPress={handleSend}
        disabled={!text.trim()}
        className="ml-2">
        <Ionicons
          name="send"
          size={24}
          color={text.trim() ? '#63ADF2' : '#A0A0A0'}
        />
      </Pressable>
    </View>
  );
}
