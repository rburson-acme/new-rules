import React, { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { EventSourceView } from './EventSourceView';
import { EventDataCompactView } from './EventDataCompactView';
import { EventStore } from '@/src/stores/EventStore';

type EventViewProps = {
  eventStore: EventStore;
};
export const EventView = ({ eventStore }: EventViewProps) => {
  if (!eventStore.event) return null;
  const { source, data, type, time } = eventStore.event;
  return (
    <Fragment>
      <View style={styles.container}>
        <EventSourceView source={source} display={data?.display} eventType={type} />
        <EventDataCompactView eventStore={eventStore} onPress={() => {}} />
      </View>
    </Fragment>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingRight: 10,
    paddingBottom: 20,
    paddingLeft: 5,
  },
});
