import { InteractionStore } from '@/src/stores/InteractionStore';
import { observer } from 'mobx-react-lite';

import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput as RNTextInput } from '../../common/TextInput';
import { Button } from '../../common/Button';

type TextInputProps = {
  name: string;
  interactionStore: InteractionStore;
  numeric?: boolean;
};

export const TextInput = observer(({ interactionStore, name, numeric = false }: TextInputProps) => {
  const value = interactionStore.getValue(name);
  const [text, setText] = useState(value);

  function onChangeText(text: string) {
    if (numeric) {
      numberOnly(text);
    } else {
      setText(text);
    }
  }
  function numberOnly(text: string) {
    setText(text.replace(/[^0-9]/g, '')); //regex for numbers only
  }

  return (
    <View style={{ gap: 4 }}>
      <RNTextInput
        multiline
        style={styles.textInput}
        inputMode={numeric ? 'numeric' : undefined}
        onChangeText={onChangeText}
        value={text}
      />
      <Button
        onPress={() => {
          interactionStore.setValue(name, text);
        }}
        content="Send"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  textInput: {
    backgroundColor: 'white',
  },
});
