import { useTheme } from '@/src/contexts/ThemeContext';
import { ReactNode } from 'react';
import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

type MediumTextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  textProps?: TextProps;
};
export const MediumText = ({ children, style, textProps }: MediumTextProps) => {
  const { fonts, colors } = useTheme();

  const baseStyle = {
    ...fonts.medium,
    color: colors.text,
  };

  return (
    <Text style={[baseStyle, style]} {...textProps}>
      {children}
    </Text>
  );
};
