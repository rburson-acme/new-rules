import { AdminThredsView } from '@/src/components/admin-tools/thred-manager/AdminThredsView';
import { OpenAdminThred } from '@/src/components/admin-tools/thred-manager/OpenAdminThred';
import { Button } from '@/src/components/common/Button';
import { useRunOnInterval } from '@/src/hooks/useRunOnInterval';
import { RootStore } from '@/src/stores/rootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { View } from 'react-native';

function ThredManager() {
  const navigation = useNavigation();

  const { adminThredsStore } = RootStore.get();

  const { currentThredStore } = adminThredsStore;

  useEffect(() => {
    navigation.setOptions({ title: 'Thred Manager' });
  }, [navigation]);

  const { startInterval } = useRunOnInterval(() => {
    adminThredsStore.getAllThreds();
  }, 30000);

  startInterval();

  if (!currentThredStore) {
    return (
      <View>
        <View style={{ flex: 1 }}>
          <AdminThredsView adminThredsStore={adminThredsStore} />
        </View>
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
    );
  } else {
    return <OpenAdminThred thredStore={currentThredStore} thredsStore={adminThredsStore} />;
  }
}

export default observer(ThredManager);
