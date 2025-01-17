import React from 'react';
import { TextBubble } from '@/src/components/TextBubble';
import { StyleSheet } from 'react-native';

/**
 * Input types - these give the server a hint on how to handle the input
 * The following types are supported in addition an Array of any of these types
 * text type - free form text input (i.e. string)
 * nominal - a known set of text values (i.e. ['green', 'blue', 'purple'])
 * ordinal - a set of values with an order  (i.e. Enum)
 * numeric - a number
 * boolean - true or false
 */

type InputTypes = 'text' | 'nominal' | 'ordinal' | 'numeric' | 'boolean';

type InputProps = {
  name: string;
  type: InputTypes;
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
