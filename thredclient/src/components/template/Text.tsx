import React from 'react';
import { StyleProp, StyleSheet, TextStyle, ViewProps } from 'react-native';
import { TextBubble } from '@/src/components/common/TextBubble';

type TextProps = {
  value: string;
  style?: StyleProp<TextStyle>;
};
export const Text = ({ value, style }: TextProps) => {
  return <TextBubble text={value} />;
};
