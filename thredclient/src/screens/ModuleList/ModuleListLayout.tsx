import { observer } from 'mobx-react-lite';
import { FlatList, SafeAreaView, StyleSheet } from 'react-native';

import { StackScreenProps } from '@react-navigation/stack';
import { ModuleStackParamList } from '@/src/core/Navigation';
import { ModuleNames, RouteListItemType } from '@/src/core/RouteList';
import { RouteListItem } from '../../components/RouteListItem';

type ModulesLayoutProps = StackScreenProps<ModuleStackParamList, 'ModuleListLayout'>;

export const ModuleListLayout = observer(({ route, navigation }: ModulesLayoutProps) => {
  const modules: RouteListItemType<ModuleNames>[] = [
    {
      description:
        'Allows for NewRules to read health information (body temperature, heartrate, sleep data, etc.) and send data to connected services. ',
      name: 'Health Information',
      iconName: 'monitor-heart',
      navigateFn: () =>
        navigation.navigate('Module', { name: 'Health Information', rootStore: route.params.rootStore }),
    },
    {
      description: 'Allows for NewRules to determine your geolocation and send data to connected services. ',
      name: 'Geolocation',
      iconName: 'location-on',
      navigateFn: () => navigation.navigate('Module', { name: 'Geolocation', rootStore: route.params.rootStore }),
    },
    {
      description: 'Allows for NewRules to detect falls and injuries and send data to connected services. ',
      name: 'Fall/Injury Detection',
      iconName: 'medical-services',
      navigateFn: () =>
        navigation.navigate('Module', { name: 'Fall/Injury Detection', rootStore: route.params.rootStore }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={modules}
        renderItem={item => <RouteListItem<ModuleNames> listItem={item} rootStore={route.params.rootStore} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
});

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
