import React from 'react';
import { TextBubble } from '@/src/components/TextBubble';
import { StyleSheet } from 'react-native';

/**
 * text type - free form text input (i.e. string)
 * nominal - a known set of text values (i.e. ['green', 'blue', 'purple'])
 * ordinal - a set of values with an order  (i.e. Enum)
 * numeric - a number
 * boolean - true or false
 */

type InputProps = {
  name: string;
  type: 'text' | 'nominal' | 'ordinal' | 'numeric' | 'boolean';
  display: string | React.ReactElement;
  style?: object;
};
export const Input = ({ name, type, display, style }: InputProps) => {
  return typeof display === 'string' ? <TextBubble  text={display} bubbleStyle={styles.bubbleStyle} /> : display;
};

const styles = StyleSheet.create({
  bubbleStyle: {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
});
