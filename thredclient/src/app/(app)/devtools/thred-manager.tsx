import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

function ThredManager() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Thred Manager' });
  }, [navigation]);

  return <Text>Not Yet Defined</Text>;
}

export default ThredManager;
