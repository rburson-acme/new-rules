import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { AdminThredStore } from '@/src/stores/AdminThredStore';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { FlatList, Text, View } from 'react-native';
import { AdminThredCard } from './AdminThredCard';

type ThredsViewProps = {
  adminThredsStore: AdminThredsStore;
};

export const AdminThredsView = observer(({ adminThredsStore }: ThredsViewProps) => {
  const flatList = useRef<FlatList<AdminThredStore>>(null);
  
  return (
    <FlatList
      ref={flatList}
      onEndReachedThreshold={0.1}
      data={adminThredsStore.threds}
      renderItem={({ item, index }) => {
        return <AdminThredCard thredStore={item} />;
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
