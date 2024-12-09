import { observer } from 'mobx-react-lite';
import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { DevtoolStackParamList } from '@/src/core/Navigation';
import { DevtoolNames, RouteListItemType } from '@/src/core/RouteList';
import { RouteListItem } from '@/src/components/RouteListItem';

type DevtoolsLayoutProps = StackScreenProps<DevtoolStackParamList, 'DevtoolListLayout'>;

export const DevtoolListLayout = observer(({ route, navigation }: DevtoolsLayoutProps) => {
  const devtools: RouteListItemType<DevtoolNames>[] = [
    {
      name: 'Event Editor',
      description: 'edit events',
      iconName: 'golf-course',
      navigateFn: () => navigation.navigate('Devtool', { name: 'Event Editor', rootStore: route.params.rootStore }),
    },
    {
      name: 'Thred Manager',
      description: 'manage threds',
      iconName: 'golf-course',
      navigateFn: () => navigation.navigate('Devtool', { name: 'Thred Manager', rootStore: route.params.rootStore }),
    },
    {
      name: 'System Event GUI',
      description: 'gui for system events',
      iconName: 'golf-course',
      navigateFn: () => navigation.navigate('Devtool', { name: 'System Event GUI', rootStore: route.params.rootStore }),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={devtools}
        renderItem={item => <RouteListItem<DevtoolNames> listItem={item} rootStore={route.params.rootStore} />}
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
