import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';
import { Icon } from './Icon';

type MenuProps = {
  containerStyle?: StyleProp<ViewStyle>;
  iconStyle?: StyleProp<ViewStyle>;
};
export const Menu = ({ containerStyle, iconStyle }: MenuProps) => {
  return (
    <View style={[styles.containerStyle, containerStyle]}>
      <Icon name={'menu'} style={[styles.iconStyle, iconStyle]} />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {},
  iconStyle: {},
});
