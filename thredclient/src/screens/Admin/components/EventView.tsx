import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EventSourceView } from './EventSourceView';
import { EventDataCompactView } from './EventDataCompactView';
import { EventAttachment } from './EventAttachment';
import { EventStore } from '@/src/stores/EventStore';

type EventViewProps = {
  eventStore: EventStore;
};

export const EventView = ({ eventStore }: EventViewProps) => {
  if (!eventStore.event) return null;
  const { source, data, type, time } = eventStore.event;

  return (
    <View style={styles.containerStyle}>
      <EventSourceView source={source} display={data?.display} eventType={type} />
      <EventDataCompactView
        data={data}
        time={time}
        onPress={() => {
          //   eventStore.setOpenEventStore(eventStore);
        }}
      />
      <EventAttachment />
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
