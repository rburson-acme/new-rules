import { Thred } from '@/src/components/threds/Thred';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useLocalSearchParams } from 'expo-router/build/hooks';
import { useEffect } from 'react';

export default function ThredView() {
  const local = useLocalSearchParams();

  const navigation = useNavigation();
  const { thredsStore } = RootStore.get();
  const thredStore = thredsStore.thredStores.find(thredStore => thredStore.thred.id === local.thredId);

  function getLatestEvent() {
    const eventStores = thredStore?.eventsStore?.eventStores;
    if (!eventStores) return undefined;
    const latestEvent = eventStores[eventStores?.length - 1].event;

    return latestEvent;
  }

  useEffect(() => {
    navigation.setOptions({ title: getLatestEvent()?.data?.title });
  }, [navigation]);

  if (!thredStore) return null;

  return <Thred thredStore={thredStore} thredsStore={thredsStore} />;
}
