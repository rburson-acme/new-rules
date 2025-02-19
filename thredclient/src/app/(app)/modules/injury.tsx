import { RegularText } from '@/src/components/common/RegularText';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';

export default function InjuryModule() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Injury' });
  }, [navigation]);

  return <RegularText>Not Yet Defined</RegularText>;
}
