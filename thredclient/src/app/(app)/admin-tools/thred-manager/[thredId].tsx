import { RootStore } from '@/src/stores/RootStore';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { OpenAdminThred } from '@/src/components/admin-tools/thred-manager/OpenAdminThred';
import { ActivityIndicator } from 'react-native';

function ThredManager() {
  const navigation = useNavigation();
  const local = useLocalSearchParams();

  const { adminThredsStore } = RootStore.get();

  const thredStore = adminThredsStore.threds.find(thred => thred.thred.id === local.thredId);

  useEffect(() => {
    async function completeThred() {
      await thredStore?.completeThred();
    }
    navigation.setOptions({ title: 'Admin Thred' });
    completeThred();
  }, [navigation, thredStore]);

  if (!thredStore) return null;
  if (!thredStore.isFullThred) return <ActivityIndicator />;
  return <OpenAdminThred thredStore={thredStore} thredsStore={adminThredsStore} />;
}

export default observer(ThredManager);
