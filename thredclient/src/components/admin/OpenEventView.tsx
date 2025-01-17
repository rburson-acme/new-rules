import React from 'react';
import { StyleSheet, View } from 'react-native';
import { OpenEventHeader } from './OpenEventHeader';
import { Event } from 'thredlib';
import { EventDataView } from './EventDataView';
import { Bar } from '@/src/components/common/Bar';
import { RootStore } from '@/src/stores/rootStore';
import { EventStore } from '@/src/stores/EventStore';
import { Button } from '../common/Button';

type OpenEventViewProps = {
  rootStore: RootStore;
  eventStore: EventStore;
};
export const OpenEventView = ({ rootStore, eventStore }: OpenEventViewProps) => {
  if (!eventStore.event) return null;
  const { source, data, type, time } = eventStore.event;
  const { thredsStore } = rootStore;

  return (
    <View style={styles.containerStyle}>
      <Bar />
      <View style={styles.contentStyle}>
        <OpenEventHeader event={eventStore.event} />
        <EventDataView data={data} containerStyle={styles.eventDataStyle} stores={{ rootStore, thredsStore }} />
        <Button
          content="Back To Thred"
          buttonStyle={styles.buttonStyle}
          onPress={() => {
            // thredsStore.closeOpenEventStore();
          }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flexGrow: 1,
    backgroundColor: '#f3f3f3',
    marginTop: 25,
    marginBottom: 20,
    paddingRight: 15,
    paddingLeft: 16,
    paddingBottom: 20,
  },
  contentStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 1,
    paddingTop: 10,
    paddingRight: 5,
    paddingBottom: 20,
    paddingLeft: 5,
  },
  eventDataStyle: {
    marginTop: 15,
  },
  buttonStyle: {
    marginTop: 40,
  },
});
