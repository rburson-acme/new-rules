import React from 'react';
import { TextBubble } from '@/src/components/TextBubble';
import { StyleSheet } from 'react-native';

type InputProps = {
  name: string;
  type: 'text' | 'nominal' | 'ordinal' | 'continous' | 'boolean';
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
