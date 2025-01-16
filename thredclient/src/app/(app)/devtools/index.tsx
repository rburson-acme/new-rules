import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { DevtoolNames, RouteListItemType } from '@/src/core/RouteList';
import { RouteListItem } from '@/src/components/common/RouteListItem';
import { RootStore } from '@/src/stores/rootStore';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';

const devtools: RouteListItemType<DevtoolNames>[] = [
  {
    name: 'Event Editor',
    description: 'edit events',
    iconName: 'golf-course',
    navigateFn: () => router.push({ pathname: '/devtools/event-editor' }),
  },
  {
    name: 'Thred Manager',
    description: 'manage threds',
    iconName: 'golf-course',
    navigateFn: () => router.push({ pathname: '/devtools/thred-manager' }),
  },
  {
    name: 'System Event GUI',
    description: 'gui for system events',
    iconName: 'golf-course',
    navigateFn: () => router.push({ pathname: '/devtools/system-event' }),
  },
];

export default function DevtoolList() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={devtools}
        renderItem={item => <RouteListItem<DevtoolNames> listItem={item} rootStore={RootStore.get()} />}
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
