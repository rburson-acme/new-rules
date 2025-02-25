import { PatternStore } from '@/src/stores/PatternStore';
import { EditableInput } from '../../common/EditableInput';
import { StyleSheet, View } from 'react-native';
import { RegularText } from '../../common/RegularText';

type PatternMultiInputProps = {
  name: string;
  updatePath: string;
  patternStore: PatternStore;
  values: string[] | string;
};

export const PatternMultiInput = ({ name, values, patternStore, updatePath }: PatternMultiInputProps) => {
  return (
    <View style={styles.container}>
      <RegularText>{name}: </RegularText>
      <EditableInput
        type="multipleText"
        inputValues={values}
        addInputValue={() => {
          patternStore.updatePatternValue(updatePath, [...values, '']);
        }}
        removeInputValue={() => {
          patternStore.updatePatternValue(updatePath, values.slice(0, values.length - 1));
        }}
        onSubmit={text => {
          patternStore.updatePattern({ [updatePath]: text });
        }}
        onChangeText={(text, index) => {
          if (typeof values !== 'string' && index) {
            const newValues = [...values];
            newValues[index] = text;
            patternStore.updatePatternValue(updatePath, newValues);
          } else {
            patternStore.updatePatternValue(updatePath, text);
          }
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
