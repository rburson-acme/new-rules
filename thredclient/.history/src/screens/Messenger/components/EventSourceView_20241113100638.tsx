import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Event } from 'thredlib';
import { EventSourceAvatar } from './EventSourceAvatar';

type EventSourceViewProps = {
  source: Event['source'];
  display?: {
    uri: string;
  };
  eventType: string;
};
export const EventSourceView = ({ source, display, eventType }: EventSourceViewProps) => {
  return (
    <View style={styles.container}>
      <EventSourceAvatar uri={display?.uri || source?.uri} eventType={eventType} />
    </View>
  );
};
// <Text style={ textStyle } numberOfLines={1}>{ source.name }</Text>

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 50,
    paddingTop: 40,
  },
  text: {
    fontSize: 9,
  },
});
