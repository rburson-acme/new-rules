import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChatWait } from '@/src/components/common/ChatWait';
import { EventHeaderView } from './EventHeaderView';
import { Content } from './Content';
import { EventStore } from '@/src/stores/EventStore';

type EventDataCompactViewProps = {
  onPress: () => void;
  eventStore: EventStore;
};
export const EventDataCompactView = ({ onPress, eventStore }: EventDataCompactViewProps) => {
  if (!eventStore.event) return null;
  const { source, data, type, time } = eventStore.event;

  return (
    <Pressable style={styles.containerStyle} onPress={onPress}>
      {time ? <Text style={styles.textTimeStyle}>{new Date(time).toLocaleTimeString()}</Text> : null}
      {data && source ? <EventHeaderView data={data} source={source} type={type} /> : null}
      <Content eventStore={eventStore} />
      <ChatWait isVisible={() => eventStore.isPublishing} containerStyle={styles.chatWaitContainerStyle} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    backgroundColor: 'white',
  },
  textTimeStyle: {
    fontSize: 10,
    padding: 5,
    flexShrink: 0,
    color: '#99999f',
    alignSelf: 'center',
  },
  chatWaitContainerStyle: {
    alignSelf: 'flex-start',
  },
});
