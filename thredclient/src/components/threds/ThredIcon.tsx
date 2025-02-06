import { useTheme } from '@/src/contexts/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { EventData } from 'thredlib';

type ThredIconProps = {
  uri?: string;
};

export const ThredIcon = ({ uri }: ThredIconProps) => {
  const { colors } = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={{ width: 40, height: 40, tintColor: colors.icon }} />;
  } else return <MaterialCommunityIcons name="bell" size={40} color={colors.icon} />;
};
