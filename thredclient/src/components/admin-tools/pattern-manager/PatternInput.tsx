import { PatternStore } from '@/src/stores/PatternStore';
import { EditableInput } from '../../common/EditableInput';
import { StyleSheet, Text, View } from 'react-native';
import { RegularText } from '../../common/RegularText';

type PatternInputProps = {
  name: string;
  value: string;
  patternStore: PatternStore;
  updatePath: string;
  numeric?: boolean;
};

export const PatternInput = ({ name, value, patternStore, updatePath, numeric = false }: PatternInputProps) => {
  return (
    <View style={styles.container}>
      <RegularText>{name}: </RegularText>
      <EditableInput
        type="text"
        text={value}
        onSubmit={text => {
          if (numeric) {
            patternStore.updatePattern({ [updatePath]: Number(text) });
          }
          patternStore.updatePattern({ [updatePath]: text });
        }}
        onChangeText={text => {
          patternStore.updatePatternValue(updatePath, text);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
