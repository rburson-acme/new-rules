import React from 'react';
import { StyleProp, StyleSheet, TextStyle, ViewProps } from 'react-native';
import { TextBubble } from '@/src/components/common/TextBubble';
import { useTheme } from '@/src/contexts/ThemeContext';

type TextProps = {
  value: string;
  style?: StyleProp<TextStyle>;
};
export const Text = ({ value, style }: TextProps) => {
  const { colors } = useTheme();
  return <TextBubble text={value} bubbleStyle={{ backgroundColor: colors.lightGrey, maxWidth: '80%' }} />;
};
