import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

function SystemEventGUI() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'System Events' });
  }, [navigation]);

  return <Text>Not Yet Defined</Text>;
}

export default SystemEventGUI;
