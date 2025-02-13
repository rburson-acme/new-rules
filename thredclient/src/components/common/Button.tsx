import React, { Fragment } from 'react';
import { TouchableOpacity, Text, View, StyleProp, ViewStyle, StyleSheet, TextStyle, Pressable } from 'react-native';
import { Icon } from './Icon';

type ButtonProps = {
  content: string | JSX.Element;
  onPress: () => void;
  buttonStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  iconStyle?: StyleProp<ViewStyle>;
  iconName?: string;
  iconRight?: boolean;
};
export const Button = ({ content, onPress, buttonStyle, textStyle, iconName, iconStyle, iconRight }: ButtonProps) => {
  const contentElem = typeof content === 'string' ? <Text style={[styles.text, textStyle]}>{content}</Text> : content;
  const buttonContent = (
    <Fragment>
      {!iconRight && iconName && <Icon name={iconName} style={[styles.iconStyle, iconStyle, { paddingLeft: 3 }]} />}
      {contentElem}
      {iconRight && iconName && <Icon name={iconName} style={[styles.iconStyle, iconStyle, { paddingLeft: 3 }]} />}
    </Fragment>
  );

  return (
    <Pressable style={[styles.button, buttonStyle]} onPress={onPress}>
      {buttonContent}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    padding: 8,
  },
  text: {
    color: '#777',
    fontSize: 13,
  },
  iconStyle: {
    backgroundColor: '#fff',
    fontSize: 13,
  },
});
