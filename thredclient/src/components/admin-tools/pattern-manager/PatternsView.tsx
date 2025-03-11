import { StyleSheet, View } from 'react-native';
import SearchBar from '../../common/SearchBar';
import { observer } from 'mobx-react-lite';
import { PatternsStore } from '@/src/stores/PatternsStore';
import { PatternsList } from './PatternsList';

type PatternsViewProps = {
  patternsStore: PatternsStore;
};
export const PatternsView = observer(({ patternsStore }: PatternsViewProps) => {
  return (
    <View style={[styles.container]}>
      <SearchBar
        value={patternsStore.searchText}
        onChange={value => {
          patternsStore.setSearchText(value);
        }}
      />
      <PatternsList patternsStore={patternsStore} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
});
