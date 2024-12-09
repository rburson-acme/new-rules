import { Text } from '@/src/components/template/Text';
import React from 'react';
import { StyleProp, StyleSheet, TextStyle } from 'react-native';

type InputProps = {
  name: string;
  type: 'constant' | 'nominal' | 'ordinal' | 'boolean';
  display: string | React.ReactElement;
  style: StyleProp<TextStyle>;
};
export const Input = ({ name, type, display, style }: InputProps) => {
  return typeof display === 'string' ? <Text value={display} style={[styles.style, style]} /> : display;
};

const styles = StyleSheet.create({
  style: {
    padding: 4,
  },
});
