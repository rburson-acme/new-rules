import { Image } from 'expo-image';

type ThredIconProps = {
  uri?: string;
  tintColor?: string;
};

const systemIcon = require('../../../../assets/system.png');
export const ThredIcon = ({ uri, tintColor }: ThredIconProps) => {
  return <Image source={systemIcon} style={{ width: 40, height: 40 }} contentFit="contain" />;
};
