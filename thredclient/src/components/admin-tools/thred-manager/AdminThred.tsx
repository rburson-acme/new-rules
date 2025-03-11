import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../common/Button';
import { observer } from 'mobx-react-lite';
import { AdminThredStore } from '@/src/stores/AdminThredStore';
import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { ThredEvent } from './ThredEvent';
import { useTheme } from '@/src/contexts/ThemeContext';

type AdminThredProps = {
  thredStore: AdminThredStore;
  thredsStore: AdminThredsStore;
};

export const AdminThred = observer(({ thredStore, thredsStore }: AdminThredProps) => {
  const { pattern, events } = thredStore;
  const { colors } = useTheme();

  if (!pattern) return null;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={events}
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        renderItem={item => {
          return <ThredEvent event={item.item} pattern={pattern} />;
        }}
      />
      <View style={styles.buttonGroup}>
        <Button content="Terminate Thred" onPress={() => thredStore.terminateThred()} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
});
