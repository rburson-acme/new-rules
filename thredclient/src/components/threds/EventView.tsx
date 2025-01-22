import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EventStore } from '@/src/stores/EventStore';
import { EventsStore } from '@/src/stores/EventsStore';
import { EventDataCompactView } from './EventDataCompactView';
import { EventSourceView } from './EventSourceView';

type EventViewProps = {
  eventStore: EventStore;
  eventsStore: EventsStore;
};

export const EventView = ({ eventStore, eventsStore }: EventViewProps) => {
  if (!eventStore.event) return null;
  const { source, data, type, time } = eventStore.event;

  return (
    <View style={styles.containerStyle}>
      <EventSourceView source={source} display={data?.display} eventType={type} />
      <EventDataCompactView
        data={data}
        time={time}
        onPress={() => {
          eventsStore.setOpenEventStore(eventStore);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingRight: 5,
    paddingBottom: 20,
    paddingLeft: 5,
  },
});
