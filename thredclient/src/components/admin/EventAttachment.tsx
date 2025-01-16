import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from 'react-native';

type EventAttachmentProps = {};
export const EventAttachment = ({}: EventAttachmentProps) => {
  return <View style={styles.containerStyle}></View>;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
});
