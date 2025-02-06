import { PatternsStore } from '@/src/stores/PatternsStore';
import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import { PatternListCard } from './PatternListCard';

type PatternsListProps = { patternsStore: PatternsStore };
export const PatternsList = observer(({ patternsStore }: PatternsListProps) => {
  const flatList = useRef<FlatList<PatternStore>>(null);
  return (
    <FlatList
      ref={flatList}
      onEndReachedThreshold={0.1}
      data={patternsStore.patterns}
      renderItem={({ item, index }) => {
        return <PatternListCard patternStore={item} patternsStore={patternsStore} />;
      }}
      ListEmptyComponent={emptyList()}
    />
  );
});

const emptyList = () => (
  <View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20 }}>No Messages Yet</Text>
  </View>
);
