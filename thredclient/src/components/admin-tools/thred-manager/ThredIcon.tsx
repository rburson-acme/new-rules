import { useTheme } from '@/src/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';

type ThredIconProps = {
  uri?: string;
  tintColor?: string;
};

export const ThredIcon = ({ uri, tintColor }: ThredIconProps) => {
  const { colors } = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={{ width: 40, height: 40, tintColor: tintColor ? tintColor : colors.blue }} />;
  } else return <MaterialCommunityIcons name="bell" size={40} color={colors.blue} />;
};
