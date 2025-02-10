import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Bubble } from './Bubble';

type TextBubbleProps = {
  text: string | boolean;
  bubbleStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftOrRight?: 'left' | 'right';
};

export const TextBubble = ({ text, bubbleStyle, textStyle, leftOrRight = 'left' }: TextBubbleProps) => {
  return (
    <Bubble style={bubbleStyle} leftOrRight={leftOrRight}>
      {text && <Text style={[styles.defaultTextStyle, textStyle]}>{text}</Text>}
    </Bubble>
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
