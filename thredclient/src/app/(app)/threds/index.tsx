import React, { useEffect } from 'react';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { ThredsView } from '@/src/components/threds/ThredsView';

export default function Messenger() {
  const rootStore = RootStore.get();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  return <ThredsView rootStore={rootStore} />;
}
