import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { AdminToolNames, RouteListItemType } from '@/src/core/RouteList';
import { RouteListItem } from '@/src/components/common/RouteListItem';
import { RootStore } from '@/src/stores/RootStore';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';

const adminTools: RouteListItemType<AdminToolNames>[] = [
  {
    name: 'Event Editor',
    description: 'edit events',
    iconName: 'edit',
    navigateFn: () => router.push({ pathname: '/admin-tools/event-editor' }),
  },
  {
    name: 'Thred Manager',
    description: 'manage threds',
    iconName: 'gear',
    navigateFn: () => router.push({ pathname: '/admin-tools/thred-manager' }),
  },
  {
    name: 'Pattern Manager',
    description: 'manage patterns',
    iconName: 'edit',
    navigateFn: () => router.push({ pathname: '/admin-tools/pattern-manager' }),
  },
];

export default function AdminToolsList() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={adminTools}
        renderItem={item => <RouteListItem<AdminToolNames> listItem={item} rootStore={RootStore.get()} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingTop: 16,
    justifyContent: 'center',
  },
  list: {
    display: 'flex',
  },
});
