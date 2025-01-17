import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleProp, View, ViewStyle } from 'react-native';

type IconProps = {
  name: string;
  style?: StyleProp<ViewStyle>;
};
export const Icon = ({ name, style }: IconProps) => {
  // return <MaterialCommunityIcons name={name} style={style} />;
  return <View></View>;
};
