import { AdminThredsView } from '@/src/components/admin-tools/thred-manager/AdminThredsView';
import { Button } from '@/src/components/common/Button';
import SearchBar from '@/src/components/common/SearchBar';
import { useRunOnInterval } from '@/src/hooks/useRunOnInterval';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { View } from 'react-native';

function ThredManager() {
  const navigation = useNavigation();

  const { adminThredsStore } = RootStore.get();

  useEffect(() => {
    navigation.setOptions({ title: 'Thred Manager' });
  }, [navigation]);

  const { startInterval } = useRunOnInterval(() => {
    adminThredsStore.getAllThreds();
  }, 30000);

  startInterval();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        <SearchBar
          value={adminThredsStore.searchText}
          onChange={value => {
            adminThredsStore.setSearchText(value);
          }}
        />
        <AdminThredsView adminThredsStore={adminThredsStore} />
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
    </View>
  );
}

export default observer(ThredManager);
