import { PatternStore } from '@/src/stores/PatternStore';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Reaction } from './Reaction';
import { PatternInput } from './PatternInput';
import { observer } from 'mobx-react-lite';
import { MediumText } from '../../common/MediumText';

type OpenPatternProps = { patternStore: PatternStore };
export const OpenPattern = observer(({ patternStore }: OpenPatternProps) => {
  const { pattern } = patternStore;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <MediumText>Pattern:</MediumText>
      <PatternInput value={pattern.name} name="Name" updatePath="name" patternStore={patternStore} />
      <PatternInput
        name="Description"
        updatePath="description"
        patternStore={patternStore}
        value={pattern.description || ''}
      />
      <MediumText>Reactions:</MediumText>
      {pattern.reactions.map((reaction, index) => {
        return <Reaction patternStore={patternStore} key={index} index={index} reaction={reaction} />;
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
