import { observer } from 'mobx-react-lite';
import { StyleSheet, TextInput, View } from 'react-native';
import { EventEditorLocals } from './EventEditor';

type EventInputProps = {
  localStore: EventEditorLocals;
};
export const EventInput = observer(({ localStore }: EventInputProps) => {
  return (
    <View style={{ flex: 2 }}>
      <TextInput style={styles.textInput} onChangeText={localStore.setText} value={localStore.text} multiline />
    </View>
  );
});

const styles = StyleSheet.create({
  textInput: {
    height: 700,
    width: '100%',
    padding: 4,
    borderWidth: 1,
  },
});
