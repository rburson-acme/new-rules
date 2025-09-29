import { RootStore } from '@/src/stores/RootStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import SearchBar from '../common/SearchBar';
import { ThredList } from './ThredList';
import { useTheme } from '@/src/contexts/ThemeContext';
import { TabItem, Tabs } from '../common/Tabs';

type ThredsLayoutProps = {
  rootStore: RootStore;
};

const tabs: TabItem[] = [
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Inactive' },
  { key: 'archived', label: 'Archived' },
];

export const ThredsView = observer(({ rootStore }: ThredsLayoutProps) => {
  const { thredsStore } = rootStore;
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Tabs
        tabs={tabs}
        activeTab={rootStore.thredsStore.tab}
        onTabChange={tabKey => rootStore.thredsStore.setTab(tabKey as any)}
        style={{ justifyContent: 'space-around' }}
      />
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
