import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Bubble } from './Bubble';

type TextBubbleProps = {
  text: string | boolean;
  bubbleStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const TextBubble = ({ text, bubbleStyle, textStyle }: TextBubbleProps) => {
  return (
    <Bubble style={bubbleStyle}>{text && <Text style={[styles.defaultTextStyle, textStyle]}>{text}</Text>}</Bubble>
  );
};
const styles = StyleSheet.create({
  defaultTitleTextStyle: {
    fontSize: 13,
    color: 'black',
  },
  defaultTextStyle: {
    fontSize: 13,
    color: 'black',
  },
});
