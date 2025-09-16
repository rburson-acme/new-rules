import { ThredStore } from '@/src/stores/ThredStore';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import { Event } from '../events/Event';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { useTheme } from '@/src/contexts/ThemeContext';
import React from 'react';
import { DateStamp } from './DateStamp';
import { BroadcastInput } from './BroadcastInput';

type ThredProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};

export const Thred = observer(({ thredStore, thredsStore }: ThredProps) => {
  const { eventsStore } = thredStore;
  const firstEventStore = eventsStore?.eventStores[0];
  const { colors } = useTheme();
  const firstEvent = firstEventStore?.event;

  if (!firstEvent || !eventsStore) return null;

  return (
    <>
      <FlatList
        data={eventsStore.eventStores}
        keyExtractor={eventStore => eventStore.event?.id || Math.random().toString()}
        contentContainerStyle={[styles.containerStyle, { backgroundColor: colors.background }]}
        style={{ backgroundColor: colors.background }}
        ListHeaderComponent={<DateStamp time={firstEvent.time} />}
        renderItem={({ item: eventStore }) => <Event data={eventStore.event?.data} eventStore={eventStore} />}
      />
      <BroadcastInput thredStore={thredStore} />
    </>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  buttonStyle: {
    marginTop: 40,
  },
});
