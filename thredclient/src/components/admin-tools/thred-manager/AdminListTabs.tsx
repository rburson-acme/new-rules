import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, View } from 'react-native';
import { MediumText } from '../../common/MediumText';
import { useTheme } from '@/src/contexts/ThemeContext';

type AdminListTabsProps = {
  adminThredsStore: AdminThredsStore;
};

export const AdminListTabs = observer(({ adminThredsStore }: AdminListTabsProps) => {
  const { colors } = useTheme();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', gap: 16 }}>
      <Pressable
        style={[
          { backgroundColor: adminThredsStore.tab === 'active' ? colors.buttonPrimary : colors.secondaryBackground },
          styles.tab,
        ]}
        onPress={() => {
          adminThredsStore.setTab('active');
        }}>
        <MediumText>Active</MediumText>
      </Pressable>
      <Pressable
        style={[
          { backgroundColor: adminThredsStore.tab === 'inactive' ? colors.buttonPrimary : colors.secondaryBackground },
          styles.tab,
        ]}
        onPress={() => {
          adminThredsStore.setTab('inactive');
        }}>
        <MediumText>Inactive</MediumText>
      </Pressable>
      <Pressable
        style={[
          { backgroundColor: adminThredsStore.tab === 'all' ? colors.buttonPrimary : colors.secondaryBackground },
          styles.tab,
        ]}
        onPress={() => {
          adminThredsStore.setTab('all');
        }}>
        <MediumText>All</MediumText>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  tab: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
});
