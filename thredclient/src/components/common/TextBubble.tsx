import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';

type TextBubbleProps = {
  text: string | boolean;
  titleText?: string;
  bubbleStyle?: StyleProp<ViewStyle>;
  titleTextStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftOrRight?: 'left' | 'right';
};

export const TextBubble = ({
  titleText,
  text,
  bubbleStyle,
  titleTextStyle,
  textStyle,
  leftOrRight = 'left',
}: TextBubbleProps) => {
  return (
    <View
      style={[
        styles.defaultBubbleStyle,
        leftOrRight === 'left' ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' },
        bubbleStyle,
      ]}>
      {titleText && (
        <Text style={[styles.defaultTitleTextStyle, titleTextStyle]} numberOfLines={1}>
          {titleText}
        </Text>
      )}
      {text && <Text style={[styles.defaultTextStyle, textStyle]}>{text}</Text>}
    </View>
  );
};
const styles = StyleSheet.create({
  defaultBubbleStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#f3f3f3',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    width: 'auto',
  },
  defaultTitleTextStyle: {
    fontSize: 13,
    color: 'black',
  },
  defaultTextStyle: {
    fontSize: 13,
    color: 'black',
  },
});
