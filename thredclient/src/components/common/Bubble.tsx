import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type BubbleProps = {
  style?: StyleProp<ViewStyle>;
  leftOrRight?: 'left' | 'right';
  children: ReactNode;
};

export const Bubble = ({ style, leftOrRight = 'left', children }: BubbleProps) => {
  return (
    <View
      style={[
        styles.defaultBubbleStyle,
        style,
        leftOrRight === 'left' ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' },
      ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultBubbleStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
  },
});
