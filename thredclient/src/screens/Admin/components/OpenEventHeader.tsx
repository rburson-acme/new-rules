import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventSourceView } from './EventSourceView';
import { Event } from 'thredlib';

type OpenEventHeaderProps = {
  event: Event;
};
export const OpenEventHeader = ({ event }: OpenEventHeaderProps) => {
  const { source, data, type, time } = event;

  return (
    <View style={styles.containerStyle}>
      <EventSourceView source={source} display={event?.data?.display} eventType={type} />
      <View style={styles.titleContainerStyle}>
        <View style={styles.textContainerStyle}>
          <Text style={styles.textTitleStyle} numberOfLines={1}>
            {data?.title}
          </Text>
        </View>
        <Text style={styles.textTimeStyle}>{time ? new Date(time).toLocaleTimeString() : undefined}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
  titleContainerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    paddingLeft: 20,
    justifyContent: 'flex-start',
  },
  textTitleStyle: {
    fontSize: 15,
    padding: 1,
    fontWeight: 'bold',
  },
  textTimeStyle: {
    fontSize: 9,
    padding: 1,
    color: '#aaaaaf',
  },
});
