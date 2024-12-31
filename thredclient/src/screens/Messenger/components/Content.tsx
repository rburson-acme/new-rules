import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { EventStore } from '@/src/stores/EventStore';
import { Template } from '@/src/components/template/Template';

type ContentProps = {
  eventStore: EventStore;
  containerStyle?: StyleProp<ViewStyle>;
};
export const Content = ({ eventStore, containerStyle }: ContentProps) => {
  return (
    <View style={[styles.defaultContainerStyle, containerStyle]}>
      {/* <Template stores={{}} /> */}
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
