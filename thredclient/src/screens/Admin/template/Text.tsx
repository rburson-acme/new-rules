import React from 'react';
import { Text as RNText, StyleSheet, StyleProp, TextStyle } from 'react-native';

type TextProps = {
  value: string;
  style: StyleProp<TextStyle>;
};

export const Text = ({ value, style }: TextProps) => {
  return <RNText style={style}>{value}</RNText>;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
});
