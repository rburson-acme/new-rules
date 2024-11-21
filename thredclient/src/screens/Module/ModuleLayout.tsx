import { ModuleStackParamList } from '@/src/core/Navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { Text } from 'react-native';
import { InjuryModule } from './components/InjuryModule';
import { GeoModule } from './components/geolocation/GeoModule';
import { HealthModule } from './components/health/HealthModule';

type ModuleLayoutProps = StackScreenProps<ModuleStackParamList, 'Module'>;
export const ModuleLayout = ({ route, navigation }: ModuleLayoutProps) => {
  const { healthModuleStore, geoModuleStore } = route.params.rootStore;

  switch (route.params.name) {
    case 'Health Information':
      return <HealthModule healthModuleStore={healthModuleStore} />;
    case 'Geolocation':
      return <GeoModule geoModuleStore={geoModuleStore} />;
    case 'Fall/Injury Detection':
      return <InjuryModule />;
    default:
      return <Text>Module not found</Text>;
  }
};
