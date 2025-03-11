import { useTheme } from '@/src/contexts/ThemeContext';
import { ActivityIndicator } from 'react-native';

type SpinnerProps = { color?: string };

export const Spinner = ({ color }: SpinnerProps) => {
  const { colors } = useTheme();

  const spinnerColor = color || colors.WTBlue;
  return <ActivityIndicator size="large" color={spinnerColor} />;
};
