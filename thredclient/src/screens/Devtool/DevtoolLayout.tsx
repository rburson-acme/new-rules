import { DevtoolStackParamList, ModuleStackParamList } from '@/src/core/Navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { Text } from 'react-native';
import { EventEditor } from './components/event-editor/EventEditor';
import { SystemEventGUI } from './components/system-event-gui/SystemEventGUI';
import { ThredManager } from './components/thred-manager/ThredManager';
import { RootStore } from '@/src/stores/rootStore';

type DevtoolLayoutProps = StackScreenProps<DevtoolStackParamList, 'Devtool'>;
export const DevtoolLayout = ({ route, navigation }: DevtoolLayoutProps) => {
  const rootStore = RootStore.get();

  console.log({ userId: rootStore.authStore.userId });

  switch (route.params.name) {
    case 'Event Editor':
      return <EventEditor rootStore={rootStore} />;
    case 'System Event GUI':
      return <SystemEventGUI />;
    case 'Thred Manager':
      return <ThredManager />;
    default:
      return <Text>Module not found</Text>;
  }
};
