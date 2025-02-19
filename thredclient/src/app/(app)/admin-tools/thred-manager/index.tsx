import { AdminThredsView } from '@/src/components/admin-tools/thred-manager/AdminThredsView';
import { Spinner } from '@/src/components/common/Spinner';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useRunOnInterval } from '@/src/hooks/useRunOnInterval';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { View } from 'react-native';

function ThredManagerList() {
  const navigation = useNavigation();

  const { adminThredsStore } = RootStore.get();

  const { startInterval, stopInterval } = useRunOnInterval(() => {
    adminThredsStore.getAllThreds();
  }, 30000);

  useEffect(() => {
    navigation.setOptions({ title: 'Thred Manager' });
    adminThredsStore.getAllThreds();
    startInterval();
    return () => {
      stopInterval();
    };
  }, [navigation]);

  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {adminThredsStore.isComplete ? <AdminThredsView adminThredsStore={adminThredsStore} /> : <Spinner />}
    </View>
  );
}

export default observer(ThredManagerList);
