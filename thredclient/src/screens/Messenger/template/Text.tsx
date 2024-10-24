import React from 'react';
import { StyleProp, StyleSheet, ViewProps } from 'react-native';
import { TextBubble } from '@/src/components/TextBubble';

type TextProps = {
  value: string;
  style?: StyleProp<ViewProps>;
};
export const Text = ({ value, style }: TextProps) => {
  return <TextBubble text={value} bubbleStyle={styles.bubbleStyle} />;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingTop: 10,
    paddingBottom: 10,
  },
  bubbleStyle: {
    marginTop: 10,
    marginBottom: 10,
  },
});
