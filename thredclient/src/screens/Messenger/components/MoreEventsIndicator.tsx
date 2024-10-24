import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/src/components/Icon';
import { EventsStore } from '@/src/stores/EventsStore';

type MoreEventsIndicatorProps = {
  eventsStore: EventsStore;
  onPress: () => void;
};
export const MoreEventsIndicator = observer(({ eventsStore, onPress }: MoreEventsIndicatorProps) => {
  const { unseenEvents } = eventsStore;
  return unseenEvents ? (
    <TouchableOpacity style={styles.containerStyle} onPress={onPress}>
      <Text style={styles.textStyle}>{unseenEvents}</Text>
      <Icon name="chevron-down" />
    </TouchableOpacity>
  ) : null;
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'center',
    position: 'absolute',
    width: 50,
    height: 50,
    left: '50%',
    marginLeft: -25,
    bottom: 15,
    borderRadius: 50,
    backgroundColor: 'rgba(50, 50, 50, .4)',
  },
  textStyle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconStyle: {
    color: '#fff',
    fontSize: 15,
  },
});
