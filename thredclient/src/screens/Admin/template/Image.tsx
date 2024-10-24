import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Image = () => {
  return <View style={styles.containerStyle}></View>;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
});
