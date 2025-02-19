import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { Button } from '@/src/components/common/Button';
import SearchBar from '@/src/components/common/SearchBar';
import { MediumText } from '../../common/MediumText';
import { AdminThredList } from './AdminThredList';

type AdminThredsView = {
  adminThredsStore: AdminThredsStore;
};

export const AdminThredsView = observer(({ adminThredsStore }: AdminThredsView) => {
  return (
    <>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        <SearchBar
          value={adminThredsStore.searchText}
          onChange={value => {
            adminThredsStore.setSearchText(value);
          }}
        />
        <AdminThredList adminThredsStore={adminThredsStore} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 16, width: '100%', gap: 8 }}>
        <Button
          content={'Terminate All Threds'}
          onPress={() => {
            adminThredsStore.terminateAllThreds();
          }}
        />
        <Button
          content={'Reload Threds'}
          onPress={() => {
            adminThredsStore.getAllThreds();
          }}
        />
      </View>
    </>
  );
});

const emptyList = () => (
  <View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
    <MediumText style={{ fontSize: 20 }}>No Messages Yet</MediumText>
  </View>
);
