import { ThredsStore } from '@/src/stores/ThredsStore';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import { ThredListCard } from './ThredListCard';
import { MediumText } from '../common/MediumText';

type ThredListProps = {
  thredsStore: ThredsStore;
};

export const ThredList = observer(({ thredsStore }: ThredListProps) => {
  return (
    <FlatList
      onEndReachedThreshold={0.1}
      data={thredsStore.filteredThreds}
      style={{ flex: 1 }}
      renderItem={({ item: thredStore }) => {
        return <ThredListCard thredsStore={thredsStore} thredStore={thredStore} />;
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
