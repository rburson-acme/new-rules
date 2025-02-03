import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

function PatternManager() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Pattern Manager' });
  }, [navigation]);

  return <Text>Not Yet Defined</Text>;
}

export default PatternManager;
