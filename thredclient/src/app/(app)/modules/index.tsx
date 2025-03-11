import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { ModuleNames, RouteListItemType } from '@/src/core/RouteList';
import { RootStore } from '@/src/stores/RootStore';
import { RouteListItem } from '@/src/components/common/RouteListItem';
import { router, useNavigation } from 'expo-router';
import { useEffect } from 'react';

const modules: RouteListItemType<ModuleNames>[] = [
  {
    description:
      'Allows for NewRules to read health information (body temperature, heartrate, sleep data, etc.) and send data to connected services. ',
    name: 'Health Information',
    iconName: 'heartbeat',
    navigateFn: () => router.push({ pathname: '/modules/health-info' }),
  },
  {
    description: 'Allows for NewRules to determine your geolocation and send data to connected services. ',
    name: 'Geolocation',
    iconName: 'globe',
    navigateFn: () => router.push({ pathname: '/modules/geolocation' }),
  },
  {
    description: 'Allows for NewRules to detect falls and injuries and send data to connected services. ',
    name: 'Fall/Injury Detection',
    iconName: 'exclamation-triangle',
    navigateFn: () => router.push({ pathname: '/modules/injury' }),
  },
];

export default function ModuleList() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={modules}
        renderItem={item => <RouteListItem<ModuleNames> listItem={item} rootStore={RootStore.get()} />}
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
