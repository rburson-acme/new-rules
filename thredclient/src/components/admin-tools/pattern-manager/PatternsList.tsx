import { PatternsStore } from '@/src/stores/PatternsStore';
import { observer } from 'mobx-react-lite';
import { FlatList, View } from 'react-native';
import { PatternListCard } from './PatternListCard';
import { MediumText } from '../../common/MediumText';

type PatternsListProps = { patternsStore: PatternsStore };
export const PatternsList = observer(({ patternsStore }: PatternsListProps) => {
  return (
    <FlatList
      onEndReachedThreshold={0.1}
      data={patternsStore.filteredPatterns}
      extraData={patternsStore.filteredPatterns}
      contentContainerStyle={{ gap: 16 }}
      renderItem={({ item }) => {
        return <PatternListCard patternStore={item} patternsStore={patternsStore} />;
      }}
      ListEmptyComponent={emptyList()}
    />
  );
});

const emptyList = () => (
  <View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
    <MediumText style={{ fontSize: 20 }}>No Messages Yet</MediumText>
  </View>
);
