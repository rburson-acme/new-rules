import { PatternsStore } from '@/src/stores/PatternsStore';
import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type PatternListCardProps = { patternStore: PatternStore; patternsStore: PatternsStore };
export const PatternListCard = observer(({ patternStore, patternsStore }: PatternListCardProps) => {
  const patternId = patternStore.pattern.id;
  if (!patternId) return null;

  return (
    <Pressable style={styles.container} onPress={() => patternsStore.selectPattern(patternId)}>
      <Text>{patternStore.pattern.name}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: 'black',
    borderWidth: 1,
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 8,
  },
});
