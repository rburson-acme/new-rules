import { RootStore } from '@/src/stores/RootStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import SearchBar from '../common/SearchBar';
import { ThredList } from './ThredList';
import { useTheme } from '@/src/contexts/ThemeContext';

type ThredsLayoutProps = {
  rootStore: RootStore;
};

export const ThredsView = observer(({ rootStore }: ThredsLayoutProps) => {
  const { thredsStore } = rootStore;
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SearchBar
        value={thredsStore.searchText}
        onChange={value => {
          thredsStore.setSearchText(value);
        }}
      />
      <ThredList thredsStore={thredsStore} />
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
