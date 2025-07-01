import React, { useEffect } from 'react';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { ThredsView } from '@/src/components/threds/ThredsView';

export default function Messenger() {
  const rootStore = RootStore.get();
  const navigation = useNavigation();
  const { authStore, thredsStore } = rootStore;
  const userId = authStore.userId;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    thredsStore.fetchAllThreds(userId || '');
  }, [navigation]);

  return <ThredsView rootStore={rootStore} />;
}
