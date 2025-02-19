import { AdminThredsView } from '@/src/components/admin-tools/thred-manager/AdminThredsView';
import { Button } from '@/src/components/common/Button';
import SearchBar from '@/src/components/common/SearchBar';
import { Spinner } from '@/src/components/common/Spinner';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useRunOnInterval } from '@/src/hooks/useRunOnInterval';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { View } from 'react-native';

function ThredManager() {
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

  // Figure out when to stop this properly so it doesn't always run

  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16, gap: 16 }}>
        <SearchBar
          value={adminThredsStore.searchText}
          onChange={value => {
            adminThredsStore.setSearchText(value);
          }}
        />
        {adminThredsStore.isComplete ? <AdminThredsView adminThredsStore={adminThredsStore} /> : <Spinner />}
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
