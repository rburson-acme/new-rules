import React from 'react';
import { View, StyleSheet } from 'react-native';

type GroupProps = {
  style?: object;
  children: React.ReactNode;
};

export const Group = ({ style, children }: GroupProps) => {
  return <View style={[styles.containerStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
});
