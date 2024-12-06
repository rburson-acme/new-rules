import { observer } from 'mobx-react-lite';
import { FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { ModuleListItem } from './components/ModuleListItem';

import { StackScreenProps } from '@react-navigation/stack';
import { ModuleStackParamList } from '@/src/core/Navigation';
import { Module } from '@/src/core/Modules';

type ModulesLayoutProps = StackScreenProps<ModuleStackParamList, 'ModuleListLayout'>;

export const ModuleListLayout = observer(({ route, navigation }: ModulesLayoutProps) => {
  const modules: Module[] = [
    {
      description:
        'Allows for NewRules to read health information (body temperature, heartrate, sleep data, etc.) and send data to connected services. ',
      name: 'Health Information',
      iconName: 'monitor-heart',
    },
    {
      description: 'Allows for NewRules to determine your geolocation and send data to connected services. ',
      name: 'Geolocation',
      iconName: 'location-on',
    },
    {
      description: 'Allows for NewRules to detect falls and injuries and send data to connected services. ',
      name: 'Fall/Injury Detection',
      iconName: 'medical-services',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={modules}
        renderItem={item => <ModuleListItem listItem={item} rootStore={route.params.rootStore} />}
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
