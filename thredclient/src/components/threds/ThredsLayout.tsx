import { RootStore } from '@/src/stores/RootStore';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { ThredsView } from './ThredsView';
import SearchBar from '../common/SearchBar';

type ThredsLayoutProps = {
  rootStore: RootStore;
};

export const ThredsLayout = observer(({ rootStore }: ThredsLayoutProps) => {
  const { thredsStore } = rootStore;

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
      <SearchBar
        value={thredsStore.searchText}
        onChange={value => {
          thredsStore.setSearchText(value);
        }}
      />
      <ThredsView thredsStore={thredsStore} />
    </View>
  );
});
