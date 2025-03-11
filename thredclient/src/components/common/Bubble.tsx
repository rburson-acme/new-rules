import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type BubbleProps = {
  style?: StyleProp<ViewStyle>;
  leftOrRight?: 'left' | 'right';
  children: ReactNode;
};

export const Bubble = ({ style, children }: BubbleProps) => {
  return <View style={[styles.defaultBubbleStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  defaultBubbleStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
  },
});
