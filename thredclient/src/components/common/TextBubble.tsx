import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Bubble } from './Bubble';
import { RegularText } from './RegularText';

type TextBubbleProps = {
  text: string | boolean;
  bubbleStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const TextBubble = ({ text, bubbleStyle, textStyle }: TextBubbleProps) => {
  return <Bubble style={bubbleStyle}>{text && <RegularText style={[textStyle]}>{text}</RegularText>}</Bubble>;
};
