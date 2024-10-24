import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

type TextBubbleProps = {
  text: string;
  titleText?: string;
  bubbleStyle?: StyleProp<ViewStyle>;
  titleTextStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<ViewStyle>;
};

export const TextBubble = ({ titleText, text, bubbleStyle, titleTextStyle, textStyle }: TextBubbleProps) => {
  return (
    <View style={[styles.defaultBubbleStyle, bubbleStyle]}>
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
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    marginRight: '30%',
    backgroundColor: '#f3f3f3',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  defaultTitleTextStyle: {
    fontSize: 13,
    flexShrink: 1,
    color: 'black',
  },
  defaultTextStyle: {
    fontSize: 13,
    flexShrink: 1,
    color: 'black',
  },
});
