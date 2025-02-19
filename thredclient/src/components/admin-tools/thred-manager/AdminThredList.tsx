import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { observer } from 'mobx-react-lite';
import { FlatList, View } from 'react-native';
import { MediumText } from '../../common/MediumText';
import { AdminThredListCard } from './AdminThredListCard';

type AdminThredListProps = {
  adminThredsStore: AdminThredsStore;
};

export const AdminThredList = observer(({ adminThredsStore }: AdminThredListProps) => {
  const { filteredThreds } = adminThredsStore;
  return (
    <FlatList
      data={filteredThreds}
      contentContainerStyle={{ flexGrow: 1, gap: 16 }}
      renderItem={({ item, index }) => {
        return <AdminThredListCard thredsStore={adminThredsStore} thredStore={item} />;
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
