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
  //only make the text bubble take up as much space as it needs
  return (
    <TextBubble
      text={value}
      bubbleStyle={{
        backgroundColor: colors.lightGrey,
        alignSelf: 'flex-start',
        maxWidth: '80%',
      }}
    />
  );
};
