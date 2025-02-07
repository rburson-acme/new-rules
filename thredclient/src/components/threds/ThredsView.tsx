import { ThredsStore } from '@/src/stores/ThredsStore';
import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import { ThredView } from './ThredView';

type ThredsViewProps = {
  thredsStore: ThredsStore;
};

export const ThredsView = observer(({ thredsStore }: ThredsViewProps) => {
  const flatList = useRef<FlatList<ThredStore>>(null);

  return (
    <FlatList
      ref={flatList}
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
    <Text style={{ fontSize: 20 }}>No Messages Yet</Text>
  </View>
);
