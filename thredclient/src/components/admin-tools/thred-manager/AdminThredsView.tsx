import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import { AdminThredCard } from './AdminThredCard';
import { MediumText } from '../../common/MediumText';

type ThredsViewProps = {
  adminThredsStore: AdminThredsStore;
};

export const AdminThredsView = observer(({ adminThredsStore }: ThredsViewProps) => {
  return (
    <FlatList
      data={adminThredsStore.threds}
      contentContainerStyle={{ flexGrow: 1, gap: 16 }}
      renderItem={({ item, index }) => {
        return <AdminThredCard thredsStore={adminThredsStore} thredStore={item} />;
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
