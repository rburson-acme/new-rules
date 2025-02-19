import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventSourceAvatar } from '@/src/components/common/EventSourceAvatar';
import { Event } from 'thredlib';
import { RegularText } from '../common/RegularText';

type EventSourceViewProps = {
  source: Event['source'];
  eventType: string;
  display?: { uri: string };
};
export const EventSourceView = ({ source, display, eventType }: EventSourceViewProps) => {
  return (
    <View style={styles.containerStyle}>
      <EventSourceAvatar uri={display?.uri || source?.uri} eventType={eventType} />
      <RegularText style={styles.textStyle} textProps={{ numberOfLines: 1 }}>
        {source.name}
      </RegularText>
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
