import { PatternStore } from '@/src/stores/PatternStore';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Reaction } from './Reaction';
import { PatternInput } from './PatternInput';
import { observer } from 'mobx-react-lite';
import { MediumText } from '../../common/MediumText';
import { Button } from '../../common/Button';
import { useTheme } from '@/src/contexts/ThemeContext';

type PatternProps = { patternStore: PatternStore };
export const Pattern = observer(({ patternStore }: PatternProps) => {
  const { pattern } = patternStore;

  const { colors } = useTheme();
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
        return (
          <View
            key={index}
            style={{ backgroundColor: index % 2 === 0 ? colors.background : colors.secondaryBackground }}>
            <Text>Reaction {index + 1}</Text>
            <Reaction patternStore={patternStore} key={index} index={index} reaction={reaction} />
            <Button content={'Remove Reaction'} onPress={() => patternStore.removeReaction(index)} />
          </View>
        );
      })}
      <Button content={'Add Reaction'} onPress={() => patternStore.addReaction()} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 8,
  },
});
