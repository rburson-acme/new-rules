import { DevtoolStackParamList, ModuleStackParamList } from '@/src/core/Navigation';
import { StackScreenProps } from '@react-navigation/stack';
import { Text } from 'react-native';
import { EventEditor } from './components/event-editor/EventEditor';
import { SystemEventGUI } from './components/system-event-gui/SystemEventGUI';
import { ThredManager } from './components/thred-manager/ThredManager';

type DevtoolLayoutProps = StackScreenProps<DevtoolStackParamList, 'Devtool'>;
export const DevtoolLayout = ({ route, navigation }: DevtoolLayoutProps) => {
  switch (route.params.name) {
    case 'Event Editor':
      return <EventEditor rootStore={route.params.rootStore} />;
    case 'System Event GUI':
      return <SystemEventGUI />;
    case 'Thred Manager':
      return <ThredManager />;
    default:
      return <Text>Module not found</Text>;
  }
};
