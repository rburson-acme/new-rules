import { useTheme } from '@/src/contexts/ThemeContext';
import { ThredStore } from '@/src/stores/ThredStore';
import { Image } from 'expo-image';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

type BroadcastInputProps = {
  thredStore: ThredStore;
};
export const BroadcastInput = observer(({ thredStore }: BroadcastInputProps) => {
  const localStore = useLocalObservable(() => ({
    text: '',
    setText(value: string) {
      this.text = value;
    },
  }));
  const sendButton = require('../../../assets/send-button.png');
  const { colors } = useTheme();

  return (
    <View style={styles.containerStyle}>
      <TextInput
        style={[styles.broadcastInput, { borderColor: colors.border, backgroundColor: colors.background }]}
        placeholder="Send message to all participants"
        placeholderTextColor={colors.border}
        value={localStore.text}
        onChangeText={text => localStore.setText(text)}
      />
      <Pressable
        onPress={() => {
          thredStore.sendBroadcast(localStore.text);
          localStore.setText('');
        }}
        disabled={!localStore.text}
        style={styles.buttonStyle}>
        <Image
          source={sendButton}
          style={styles.buttonIconStyle}
          tintColor={localStore.text ? undefined : colors.border}
        />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  containerStyle: { paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  broadcastInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    flex: 1,
  },
  buttonStyle: { position: 'absolute', right: 24 },
  buttonIconStyle: {
    width: 24,
    height: 24,
  },
});
