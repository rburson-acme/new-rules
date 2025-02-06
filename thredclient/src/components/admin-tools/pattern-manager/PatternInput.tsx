import { PatternStore } from '@/src/stores/PatternStore';
import { EditableText } from '../../common/EditableText';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';

type PatternInputProps = {
  name: string;
  updatePath: string;
  patternStore: PatternStore;
  value: string;
};

export const PatternInput = ({ name, value, patternStore, updatePath }: PatternInputProps) => {
  return (
    <View style={styles.container}>
      <Text>{name}: </Text>
      <EditableText
        text={value}
        onSubmit={text => {
          patternStore.updatePattern({ [updatePath]: text });
        }}
        onTextChange={text => {
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
