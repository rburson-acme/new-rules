import { OpenPattern } from '@/src/components/admin-tools/pattern-manager/OpenPattern';
import { RootStore } from '@/src/stores/RootStore';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { OpenAdminThred } from '@/src/components/admin-tools/thred-manager/OpenAdminThred';

function ThredManager() {
  const navigation = useNavigation();
  const local = useLocalSearchParams();

  const { adminThredsStore } = RootStore.get();

  const thredStore = adminThredsStore.threds.find(thred => thred.thred.id === local.thredId);
  useEffect(() => {
    navigation.setOptions({ title: 'Pattern' });
  }, [navigation]);

  if (!thredStore) return null;
  return <OpenAdminThred thredStore={thredStore} thredsStore={adminThredsStore} />;
}

export default observer(ThredManager);
