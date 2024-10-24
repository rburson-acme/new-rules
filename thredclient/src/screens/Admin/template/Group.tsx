import React, { ReactNode } from 'react';
import { View,  StyleProp, ViewStyle, StyleSheet } from 'react-native';

type GroupProps = {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};
export const Group = ({ style, children }: GroupProps) => {
  return <View style={[styles.containerStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
