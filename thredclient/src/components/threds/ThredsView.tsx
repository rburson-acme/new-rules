import { ThredsStore } from '@/src/stores/ThredsStore';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import { ThredView } from './ThredView';
import { MediumText } from '../common/MediumText';

type ThredsViewProps = {
  thredsStore: ThredsStore;
};

export const ThredsView = observer(({ thredsStore }: ThredsViewProps) => {
  return (
    <FlatList
      onEndReachedThreshold={0.1}
      data={thredsStore.filteredThreds}
      contentContainerStyle={{ flex: 1 }}
      style={{ flex: 1 }}
      renderItem={({ item: thredStore }) => {
        return <ThredView thredsStore={thredsStore} thredStore={thredStore} />;
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
