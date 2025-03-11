import { useTheme } from '@/src/contexts/ThemeContext';
import { ReactNode } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

type RegularTextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  textProps?: TextProps;
};
export const RegularText = ({ children, style, textProps }: RegularTextProps) => {
  const { fonts, colors } = useTheme();

  const baseStyle = {
    ...fonts.regular,
    color: colors.text,
  };

  return (
    <Text style={[baseStyle, style]} {...textProps}>
      {children}
    </Text>
  );
};
