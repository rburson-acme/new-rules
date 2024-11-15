import { ModuleStackParamList } from '@/src/core/Navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { InjuryModule } from './components/InjuryModule';
import { GeoModule } from './components/GeoModule';
import { HealthModule } from './components/HealthModule';

type ModuleLayoutProps = StackScreenProps<ModuleStackParamList, 'Module'>;
export const ModuleLayout = observer(({ route, navigation }: ModuleLayoutProps) => {
  const { healthModuleStore } = route.params.rootStore;

  switch (route.params.name) {
    case 'Health Information':
      return <HealthModule healthModuleStore={healthModuleStore} />;
    case 'Geolocation':
      return <GeoModule />;
    case 'Fall/Injury Detection':
      return <InjuryModule />;
    default:
      return <Text>Module not found</Text>;
  }
});
