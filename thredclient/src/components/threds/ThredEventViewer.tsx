import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventDataView } from '../events/EventDataView';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { useTheme } from '@/src/contexts/ThemeContext';
import React from 'react';
import { DateStamp } from './DateStamp';

type OpenThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};

export const ThredEventViewer = observer(({ thredStore, thredsStore }: OpenThredViewProps) => {
  const { eventsStore } = thredStore;
  const firstEventStore = eventsStore?.eventStores[0];
  const { colors, fonts } = useTheme();
  const firstEvent = firstEventStore?.event;
  const time = firstEvent?.time;
  if (!firstEvent || !eventsStore) return null;
  return (
    <FlatList
      data={eventsStore.eventStores}
      keyExtractor={eventStore => eventStore.event?.id || Math.random().toString()}
      contentContainerStyle={[styles.containerStyle, { backgroundColor: colors.background }]}
      style={{ backgroundColor: colors.background }}
      ListHeaderComponent={<DateStamp time={firstEvent.time} />}
      renderItem={({ item: eventStore }) => <EventDataView data={eventStore.event?.data} eventStore={eventStore} />}
    />
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  buttonStyle: {
    marginTop: 40,
  },
});
