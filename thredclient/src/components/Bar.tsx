import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type BarProps = {
  content?: string | JSX.Element;
  style?: StyleProp<ViewStyle>;
};
export const Bar = ({ content, style }: BarProps) => {
  return <View style={[styles.container, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#4DB9CC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 7,
    paddingRight: 7,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    height: 30,
  },
});
