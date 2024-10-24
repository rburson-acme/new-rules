import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Template } from '../template/Template';
import { EventStore } from '@/src/stores/EventStore';

type ContentProps = {
  eventStore: EventStore;
  containerStyle?: StyleProp<ViewStyle>;
};
export const Content = ({ eventStore, containerStyle }: ContentProps) => {
  return (
    <View style={[styles.defaultContainerStyle, containerStyle]}>
      <Template eventStore={eventStore} />
    </View>
  );
};

const styles = StyleSheet.create({
  defaultContainerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 10,
  },
});
