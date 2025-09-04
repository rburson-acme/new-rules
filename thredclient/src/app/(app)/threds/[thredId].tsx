import { Thred } from '@/src/components/threds/Thred';
import { Spinner } from '@/src/components/common/Spinner';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useLocalSearchParams } from 'expo-router/build/hooks';
import { useEffect } from 'react';
import { View } from 'react-native';
import { observer } from 'mobx-react-lite';

const ThredView = observer(() => {
  const local = useLocalSearchParams();

  const navigation = useNavigation();
  const { thredsStore } = RootStore.get();
  const thredStore = thredsStore.thredStores.find(thredStore => thredStore.thred.id === local.thredId);

  const thred = thredStore?.thred;
  const latestEvent = thredStore?.eventsStore?.eventStores[0]?.event;

  useEffect(() => {
    if (!thred) return;
    navigation.setOptions({
      title: latestEvent?.data?.title,
    });
  }, [navigation, thred]);

  useEffect(() => {
    if (
      thredStore &&
      !thredStore.eventsLoaded &&
      !thredStore.isLoadingEvents &&
      thredStore.eventsStore?.eventStores.length
    ) {
      thredStore.fetchEvents().catch(error => {
        console.error('Failed to fetch events for thred:', error);
      });
    }
  }, []);

  if (!thredStore) return null;

  if (thredStore.isLoadingEvents) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Spinner />
      </View>
    );
  }

  return <Thred thredStore={thredStore} thredsStore={thredsStore} />;
});

export default ThredView;
