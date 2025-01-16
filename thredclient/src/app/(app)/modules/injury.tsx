import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

export default function InjuryModule() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Injury' });
  }, [navigation]);

  return <Text>Not Yet Defined</Text>;
}
