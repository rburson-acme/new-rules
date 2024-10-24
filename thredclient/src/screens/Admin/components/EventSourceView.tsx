import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventSource } from 'thredlib';
import { EventSourceAvatar } from '@/src/components/EventSourceAvatar';

type EventSourceViewProps = {
  source: EventSource;
  eventType: string;
  display?: { uri: string };
};
export const EventSourceView = ({ source, display, eventType }: EventSourceViewProps) => {
  return (
    <View style={styles.containerStyle}>
      <EventSourceAvatar uri={display?.uri || source?.uri} eventType={eventType} />
      <Text style={styles.textStyle} numberOfLines={1}>
        {source.name}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 70,
  },
  textStyle: {
    fontSize: 9,
  },
});
